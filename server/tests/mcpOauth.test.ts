import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";

vi.mock("../src/services/parser", () => {
  class MockParserFetchError extends Error {}

  return {
    ParserFetchError: MockParserFetchError,
    parseProductPage: vi.fn()
  };
});

vi.mock("../src/utils/ssrf", () => ({
  validateSsrfSafeUrl: vi.fn(async (rawUrl: string) => new URL(rawUrl))
}));

const BASE_URL = "http://localhost:3000";

vi.mock("../src/services/email", () => ({
  sendEmail: vi.fn(),
  getAppBaseUrl: () => BASE_URL,
  EmailSendError: class EmailSendError extends Error {}
}));

const RESOURCE = `${BASE_URL}/mcp`;
const REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";

const describeDb = hasTestDatabase ? describe : describe.skip;

function pkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

describeDb("MCP OAuth authorization server", () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
    process.env.MCP_JWT_SECRET = "test-mcp-secret";
    process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id";
    await prepareTestDatabase();
    const { createApp } = await import("../src/index");
    request = supertest(createApp());
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  async function registerUser(email: string) {
    const response = await request
      .post("/api/auth/register")
      .send({ email, name: email.split("@")[0], password: "password123" });

    expect(response.status).toBe(201);
    return { token: response.body.token as string, user: response.body.user as { id: string } };
  }

  async function registerClient(overrides: Record<string, unknown> = {}) {
    const response = await request
      .post("/oauth/register")
      .send({
        client_name: "Test MCP Client",
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: "none",
        ...overrides
      });

    expect(response.status).toBe(201);
    return response.body.client_id as string;
  }

  /** Drives authorize -> consent -> token and returns the token response body. */
  async function completeAuthorization(options: {
    sessionToken: string;
    clientId: string;
    scope?: string;
  }) {
    const { verifier, challenge } = pkce();

    const authorize = await request
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: options.clientId,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge,
        code_challenge_method: "S256",
        resource: RESOURCE,
        state: "xyz",
        scope: options.scope ?? "profile closets:read closets:write offline_access"
      })
      .set("Cookie", [`auth_token=${options.sessionToken}`]);

    expect(authorize.status).toBe(200);

    const signedRequest = /name="request" value="([^"]+)"/.exec(authorize.text)?.[1];
    expect(signedRequest).toBeTruthy();

    const consent = await request
      .post("/oauth/authorize")
      .type("form")
      .send({ request: signedRequest!, decision: "allow" })
      .set("Cookie", [`auth_token=${options.sessionToken}`]);

    expect(consent.status).toBe(302);

    const callback = new URL(consent.headers.location);
    expect(callback.searchParams.get("state")).toBe("xyz");
    expect(callback.searchParams.get("iss")).toBe(BASE_URL);

    const code = callback.searchParams.get("code")!;
    expect(code).toBeTruthy();

    const token = await request.post("/oauth/token").type("form").send({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: options.clientId,
      redirect_uri: REDIRECT_URI
    });

    return { token, code, verifier };
  }

  async function connect(scope?: string) {
    const { token: sessionToken, user } = await registerUser(`u${Date.now()}${Math.random()}@example.com`);
    const clientId = await registerClient();
    const { token } = await completeAuthorization({ sessionToken, clientId, scope });

    expect(token.status).toBe(200);
    return {
      accessToken: token.body.access_token as string,
      refreshToken: token.body.refresh_token as string | undefined,
      sessionToken,
      clientId,
      userId: user.id
    };
  }

  function callTool(accessToken: string, name: string, args: Record<string, unknown> = {}) {
    return request
      .post("/mcp")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
  }

  function toolResult(body: any) {
    return JSON.parse(body.result.content[0].text);
  }

  // -------------------------------------------------------------------------
  // Discovery
  // -------------------------------------------------------------------------

  it("serves protected resource metadata at both well-known paths", async () => {
    const suffixed = await request.get("/.well-known/oauth-protected-resource/mcp");
    const bare = await request.get("/.well-known/oauth-protected-resource");

    expect(suffixed.status).toBe(200);
    expect(bare.status).toBe(200);
    expect(suffixed.body).toEqual(bare.body);

    // Claude requires an exact match against the connector URL the user types.
    expect(suffixed.body.resource).toBe(RESOURCE);
    expect(suffixed.body.authorization_servers).toEqual([BASE_URL]);
    expect(suffixed.body.scopes_supported).toContain("closets:write");
    // offline_access is an AS concern, not a resource requirement.
    expect(suffixed.body.scopes_supported).not.toContain("offline_access");
  });

  it("advertises the authorization server capabilities Claude checks for", async () => {
    const response = await request.get("/.well-known/oauth-authorization-server");

    expect(response.status).toBe(200);
    expect(response.body.issuer).toBe(BASE_URL);
    expect(response.body.code_challenge_methods_supported).toEqual(["S256"]);
    // Both are required before Claude will choose CIMD over DCR.
    expect(response.body.client_id_metadata_document_supported).toBe(true);
    expect(response.body.token_endpoint_auth_methods_supported).toContain("none");
    expect(response.body.registration_endpoint).toBe(`${BASE_URL}/oauth/register`);
    expect(response.body.scopes_supported).toContain("offline_access");
    expect(response.body.authorization_response_iss_parameter_supported).toBe(true);
  });

  // -------------------------------------------------------------------------
  // The 401 handshake
  // -------------------------------------------------------------------------

  it("answers an unauthenticated MCP request with a 401 carrying resource_metadata", async () => {
    const response = await request
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });

    expect(response.status).toBe(401);

    const challenge = response.headers["www-authenticate"];
    expect(challenge).toContain("Bearer ");
    expect(challenge).toContain('error="invalid_token"');
    expect(challenge).toContain(`resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource/mcp"`);
    expect(challenge).toContain('scope="');
  });

  it("rejects a garbage bearer token with a 401 rather than a 500", async () => {
    const response = await callTool("not-a-real-token", "list_closets");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain('error="invalid_token"');
  });

  // -------------------------------------------------------------------------
  // Authorization code + PKCE
  // -------------------------------------------------------------------------

  it("completes the authorization code flow with PKCE", async () => {
    const { accessToken, refreshToken } = await connect();

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const listed = await callTool(accessToken, "list_closets");
    expect(listed.status).toBe(200);
    expect(toolResult(listed.body)).toEqual([]);
  });

  it("redirects an unauthenticated authorize request to the login page with a next param", async () => {
    const clientId = await registerClient();
    const { challenge } = pkce();

    const response = await request.get("/oauth/authorize").query({
      response_type: "code",
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: "S256",
      resource: RESOURCE
    });

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^\/login\?next=/);
    expect(decodeURIComponent(response.headers.location)).toContain("/oauth/authorize");
  });

  it("refuses a redirect_uri that is not registered for the client", async () => {
    const { token: sessionToken } = await registerUser("evil-redirect@example.com");
    const clientId = await registerClient();
    const { challenge } = pkce();

    const response = await request
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: "https://evil.example.com/callback",
        code_challenge: challenge,
        code_challenge_method: "S256"
      })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    // Rendered, never redirected — otherwise this is an open redirector.
    expect(response.status).toBe(400);
    expect(response.headers.location).toBeUndefined();
  });

  it("rejects an authorization request without PKCE", async () => {
    const { token: sessionToken } = await registerUser("nopkce@example.com");
    const clientId = await registerClient();

    const response = await request
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT_URI
      })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    expect(response.status).toBe(302);
    expect(new URL(response.headers.location).searchParams.get("error")).toBe("invalid_request");
  });

  it("rejects a token exchange with the wrong code_verifier", async () => {
    const { token: sessionToken } = await registerUser("badverifier@example.com");
    const clientId = await registerClient();
    const { challenge } = pkce();

    const authorize = await request
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: "closets:read"
      })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    const signedRequest = /name="request" value="([^"]+)"/.exec(authorize.text)![1];

    const consent = await request
      .post("/oauth/authorize")
      .type("form")
      .send({ request: signedRequest, decision: "allow" })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    const code = new URL(consent.headers.location).searchParams.get("code")!;

    const response = await request.post("/oauth/token").type("form").send({
      grant_type: "authorization_code",
      code,
      code_verifier: pkce().verifier,
      client_id: clientId
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_grant");
  });

  it("rejects a replayed authorization code", async () => {
    const { token: sessionToken } = await registerUser("replay@example.com");
    const clientId = await registerClient();
    const { token, code, verifier } = await completeAuthorization({ sessionToken, clientId });

    expect(token.status).toBe(200);

    const replay = await request.post("/oauth/token").type("form").send({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: clientId
    });

    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_grant");
  });

  it("honours a denial without issuing a code", async () => {
    const { token: sessionToken } = await registerUser("denier@example.com");
    const clientId = await registerClient();
    const { challenge } = pkce();

    const authorize = await request
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        code_challenge: challenge,
        code_challenge_method: "S256"
      })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    const signedRequest = /name="request" value="([^"]+)"/.exec(authorize.text)![1];

    const consent = await request
      .post("/oauth/authorize")
      .type("form")
      .send({ request: signedRequest, decision: "deny" })
      .set("Cookie", [`auth_token=${sessionToken}`]);

    const callback = new URL(consent.headers.location);
    expect(callback.searchParams.get("error")).toBe("access_denied");
    expect(callback.searchParams.get("code")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Refresh token rotation
  // -------------------------------------------------------------------------

  it("rotates the refresh token and revokes the chain when one is replayed", async () => {
    const { refreshToken, clientId } = await connect();

    const first = await request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });

    expect(first.status).toBe(200);
    expect(first.body.refresh_token).toBeTruthy();
    expect(first.body.refresh_token).not.toBe(refreshToken);

    // Replaying the consumed token is a leak signal.
    const replay = await request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });

    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_grant");

    // ...and it takes the successor down with it.
    const successor = await request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: first.body.refresh_token, client_id: clientId });

    expect(successor.status).toBe(400);
    expect(successor.body.error).toBe("invalid_grant");
  });

  it("does not issue a refresh token when offline_access was not granted", async () => {
    const { token: sessionToken } = await registerUser("norefresh@example.com");
    const clientId = await registerClient();
    const { token } = await completeAuthorization({ sessionToken, clientId, scope: "closets:read" });

    expect(token.status).toBe(200);
    expect(token.body.refresh_token).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Audience separation
  // -------------------------------------------------------------------------

  it("does not accept an MCP access token as a web session", async () => {
    const { accessToken } = await connect();

    const response = await request.get("/api/closets").set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
  });

  it("does not accept a web session token at the MCP endpoint", async () => {
    const { token: sessionToken } = await registerUser("sessiontoken@example.com");

    const response = await callTool(sessionToken, "list_closets");

    expect(response.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Scopes
  // -------------------------------------------------------------------------

  it("challenges for insufficient scope when a read-only token calls a write tool", async () => {
    const { accessToken } = await connect("closets:read");

    const response = await callTool(accessToken, "create_closet", { name: "Fall" });

    expect(response.status).toBe(403);
    expect(response.headers["www-authenticate"]).toContain('error="insufficient_scope"');
    expect(response.headers["www-authenticate"]).toContain("scope=");
  });

  it("hides write tools from a read-only token", async () => {
    const { accessToken } = await connect("closets:read");

    const response = await request
      .post("/mcp")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });

    expect(response.status).toBe(200);

    const names = response.body.result.tools.map((tool: { name: string }) => tool.name);
    expect(names).toContain("list_closets");
    expect(names).not.toContain("create_closet");
    expect(names).not.toContain("delete_closet");
    // profile scope was not granted either.
    expect(names).not.toContain("get_profile");
  });

  // -------------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------------

  it("creates, lists, moves, and deletes through the tool surface", async () => {
    const { accessToken } = await connect();

    const closet = toolResult((await callTool(accessToken, "create_closet", { name: "Fall" })).body);
    expect(closet.name).toBe("Fall");

    const other = toolResult((await callTool(accessToken, "create_closet", { name: "Winter" })).body);

    const item = toolResult(
      (
        await callTool(accessToken, "create_item", {
          closetId: closet.id,
          brand: "Carhartt",
          name: "Detroit Jacket",
          season: "Fall",
          price: "$228"
        })
      ).body
    );

    expect(item.brand).toBe("Carhartt");

    const listed = toolResult((await callTool(accessToken, "list_items", { closetId: closet.id })).body);
    expect(listed).toHaveLength(1);

    const moved = toolResult((await callTool(accessToken, "move_item", { itemId: item.id, closetId: other.id })).body);
    expect(moved.closet.id).toBe(other.id);

    const favorited = toolResult((await callTool(accessToken, "toggle_favorite", { itemId: item.id })).body);
    expect(favorited.favorited).toBe(true);

    const deleted = toolResult((await callTool(accessToken, "delete_item", { itemId: item.id })).body);
    expect(deleted.deleted).toBe(true);

    const empty = toolResult((await callTool(accessToken, "list_items", {})).body);
    expect(empty).toHaveLength(0);
  });

  it("refuses to delete a section that still holds items unless asked", async () => {
    const { accessToken } = await connect();

    const closet = toolResult((await callTool(accessToken, "create_closet", { name: "Fall" })).body);
    const section = toolResult(
      (await callTool(accessToken, "create_section", { closetId: closet.id, name: "Outerwear" })).body
    );

    await callTool(accessToken, "create_item", {
      closetId: closet.id,
      sectionId: section.id,
      brand: "Arc'teryx",
      name: "Beta LT",
      season: "Winter"
    });

    const blocked = await callTool(accessToken, "delete_section", {
      closetId: closet.id,
      sectionId: section.id
    });

    expect(blocked.body.result.isError).toBe(true);
    expect(blocked.body.result.content[0].text).toContain("deleteItems");

    const forced = await callTool(accessToken, "delete_section", {
      closetId: closet.id,
      sectionId: section.id,
      deleteItems: true
    });

    expect(toolResult(forced.body).itemsDeleted).toBe(1);
  });

  it("isolates one user's closets from another user's token", async () => {
    const alice = await connect();
    const bob = await connect();

    const closet = toolResult((await callTool(alice.accessToken, "create_closet", { name: "Alice only" })).body);

    const read = await callTool(bob.accessToken, "get_closet", { closetId: closet.id });
    expect(read.body.result.isError).toBe(true);
    expect(read.body.result.content[0].text).toContain("not found");

    const write = await callTool(bob.accessToken, "update_closet", { closetId: closet.id, name: "Bob was here" });
    expect(write.body.result.isError).toBe(true);

    const destroy = await callTool(bob.accessToken, "delete_closet", { closetId: closet.id });
    expect(destroy.body.result.isError).toBe(true);

    const stillThere = toolResult((await callTool(alice.accessToken, "get_closet", { closetId: closet.id })).body);
    expect(stillThere.name).toBe("Alice only");
  });

  it("derives onSale on create and re-derives it on edit, like the HTTP routes", async () => {
    const { accessToken } = await connect();
    const closet = toolResult((await callTool(accessToken, "create_closet", { name: "Fall" })).body);

    const marked = toolResult(
      (
        await callTool(accessToken, "create_item", {
          closetId: closet.id,
          brand: "Acme",
          name: "Marked down",
          season: "Fall",
          price: "$80",
          originalPrice: "$120"
        })
      ).body
    );
    expect(marked.onSale).toBe(true);

    const full = toolResult(
      (
        await callTool(accessToken, "create_item", {
          closetId: closet.id,
          brand: "Acme",
          name: "Full price",
          season: "Fall",
          price: "$120"
        })
      ).body
    );
    expect(full.onSale).toBe(false);

    // The server-side filter reads the column, so a marked-down item added through
    // MCP has to show up here.
    const onSaleOnly = toolResult((await callTool(accessToken, "list_items", { onSale: true })).body);
    expect(onSaleOnly.map((item: { name: string }) => item.name)).toEqual(["Marked down"]);

    // Editing only the current price re-derives against the stored originalPrice.
    const recovered = toolResult(
      (await callTool(accessToken, "update_item", { itemId: marked.id, price: "$130" })).body
    );
    expect(recovered.onSale).toBe(false);
  });

  it("rejects a target price that is not a positive number", async () => {
    const { accessToken } = await connect();
    const closet = toolResult((await callTool(accessToken, "create_closet", { name: "Fall" })).body);

    const response = await callTool(accessToken, "create_item", {
      closetId: closet.id,
      brand: "Acme",
      name: "Thing",
      season: "Fall",
      targetPrice: "free"
    });

    expect(response.body.result.isError).toBe(true);
    expect(response.body.result.content[0].text).toContain("positive price");
  });

  // -------------------------------------------------------------------------
  // Revocation
  // -------------------------------------------------------------------------

  it("stops honouring an access token once the grant is revoked", async () => {
    const { accessToken, userId, clientId } = await connect();

    expect((await callTool(accessToken, "list_closets")).status).toBe(200);

    await testPrisma!.oAuthGrant.delete({ where: { userId_clientId: { userId, clientId } } });

    const response = await callTool(accessToken, "list_closets");
    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toContain("invalid_token");
  });

  it("stops honouring an access token after logout-all", async () => {
    const { accessToken, sessionToken } = await connect();

    expect((await callTool(accessToken, "list_closets")).status).toBe(200);

    const logout = await request.post("/api/auth/logout-all").set("Authorization", `Bearer ${sessionToken}`);
    expect(logout.status).toBe(200);

    expect((await callTool(accessToken, "list_closets")).status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Connected apps (account settings)
  // -------------------------------------------------------------------------

  it("lists a connected app and disconnects it from account settings", async () => {
    const { accessToken, refreshToken, sessionToken, clientId } = await connect();

    const listed = await request.get("/api/user/connections").set("Authorization", `Bearer ${sessionToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].clientId).toBe(clientId);
    expect(listed.body[0].clientName).toBe("Test MCP Client");
    expect(listed.body[0].scopes).toContain("closets:write");

    const revoked = await request
      .delete(`/api/user/connections/${encodeURIComponent(clientId)}`)
      .set("Authorization", `Bearer ${sessionToken}`);
    expect(revoked.status).toBe(204);

    // The access token has not expired, but the transport re-checks the grant.
    expect((await callTool(accessToken, "list_closets")).status).toBe(401);

    // ...and the refresh token is gone, so it cannot mint a new one.
    const refresh = await request
      .post("/oauth/token")
      .type("form")
      .send({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId });
    expect(refresh.status).toBe(400);
    expect(refresh.body.error).toBe("invalid_grant");

    const after = await request.get("/api/user/connections").set("Authorization", `Bearer ${sessionToken}`);
    expect(after.body).toHaveLength(0);
  });

  it("does not let one user disconnect another user's app", async () => {
    const alice = await connect();
    const bob = await connect();

    const response = await request
      .delete(`/api/user/connections/${encodeURIComponent(alice.clientId)}`)
      .set("Authorization", `Bearer ${bob.sessionToken}`);

    expect(response.status).toBe(404);

    // Alice's connection is untouched.
    expect((await callTool(alice.accessToken, "list_closets")).status).toBe(200);
  });

  it("requires authentication to list connections", async () => {
    expect((await request.get("/api/user/connections")).status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Client registration
  // -------------------------------------------------------------------------

  it("rejects registration with a non-https, non-loopback redirect", async () => {
    const response = await request
      .post("/oauth/register")
      .send({ client_name: "Bad", redirect_uris: ["http://evil.example.com/cb"] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_redirect_uri");
  });

  it("accepts a loopback redirect and matches it ignoring the port", async () => {
    const { redirectUriAllowed } = await import("../src/oauth/clients");

    // Claude Code declares these two and then binds an ephemeral port.
    const registered = ["http://localhost/callback", "http://127.0.0.1/callback"];

    expect(redirectUriAllowed("http://localhost:3118/callback", registered)).toBe(true);
    expect(redirectUriAllowed("http://127.0.0.1:54321/callback", registered)).toBe(true);
    expect(redirectUriAllowed("http://localhost:3118/other", registered)).toBe(false);
    expect(redirectUriAllowed("https://evil.example.com/callback", registered)).toBe(false);
    // A non-loopback host must still match exactly, port included.
    expect(redirectUriAllowed("https://claude.ai:8443/api/mcp/auth_callback", [REDIRECT_URI])).toBe(false);
  });
});
