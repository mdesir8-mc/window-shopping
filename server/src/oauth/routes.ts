import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { readAuthCookie } from "../utils/authCookie";
import { verifyAuthToken } from "../utils/jwt";
import { asyncHandler } from "../utils/http";
import {
  GRANTABLE_SCOPES,
  RESOURCE_SCOPES,
  SCOPE_OFFLINE_ACCESS,
  baseUrl,
  formatScopeString,
  getMcpJwtSecret,
  issuer,
  parseScopeString,
  resourceUrl
} from "./config";
import { renderConsentPage, renderErrorPage } from "./consent";
import {
  RegistrationError,
  redirectUriAllowed,
  registerClient,
  resolveClient,
  verifyClientSecret,
  type ResolvedClient
} from "./clients";
import {
  consumeAuthorizationCode,
  issueAuthorizationCode,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  verifyPkce
} from "./tokens";

const router = Router();

const skipInTest = () => process.env.NODE_ENV === "test";

// Dynamic client registration creates a row per call, so it is the one endpoint
// an anonymous caller can use to grow the database. Claude itself uses CIMD and
// never hits this path.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "invalid_request", error_description: "Too many registrations." },
  skip: skipInTest
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "invalid_request", error_description: "Too many token requests." },
  skip: skipInTest
});

const authorizeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authorization attempts. Try again shortly." },
  skip: skipInTest
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function queryString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function getSessionUser(req: Request) {
  const token = readAuthCookie(req.cookies as Record<string, unknown> | undefined);

  if (!token) {
    return null;
  }

  try {
    const claims = verifyAuthToken(token);

    if (!claims.sub) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true, sessionsValidAfter: true }
    });

    if (!user) {
      return null;
    }

    if (user.sessionsValidAfter && (claims.iat ?? 0) * 1000 < user.sessionsValidAfter.getTime()) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
}

/**
 * The consent form round-trips the validated request as an HMAC-signed blob so
 * the POST handler can trust it without re-fetching the client's CIMD document,
 * and so none of the parameters can be edited between the two steps.
 */
function signRequest(request: AuthorizationRequest): string {
  const payload = Buffer.from(JSON.stringify(request)).toString("base64url");
  const mac = crypto.createHmac("sha256", getMcpJwtSecret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verifySignedRequest(value: string): AuthorizationRequest | null {
  const [payload, mac] = value.split(".");

  if (!payload || !mac) {
    return null;
  }

  const expected = crypto.createHmac("sha256", getMcpJwtSecret()).update(payload).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(mac);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthorizationRequest;
  } catch {
    return null;
  }
}

function redirectWithError(
  redirectUri: string,
  state: string | null,
  error: string,
  description: string
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  url.searchParams.set("iss", issuer());

  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
}

function isLoopbackRedirect(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /oauth/authorize
// ---------------------------------------------------------------------------

router.get(
  "/authorize",
  authorizeLimiter,
  asyncHandler(async (req, res) => {
    const clientId = queryString(req.query.client_id);
    const redirectUri = queryString(req.query.redirect_uri);

    if (!clientId || !redirectUri) {
      res.status(400).type("html").send(renderErrorPage("Missing client_id or redirect_uri."));
      return;
    }

    let client: ResolvedClient | null;
    try {
      client = await resolveClient(clientId);
    } catch {
      client = null;
    }

    if (!client) {
      res.status(400).type("html").send(renderErrorPage("Unknown or unreachable client_id."));
      return;
    }

    // Until the redirect target is proven to belong to this client, errors are
    // rendered rather than redirected — redirecting first would turn this
    // endpoint into an open redirector.
    if (!redirectUriAllowed(redirectUri, client.redirectUris)) {
      res.status(400).type("html").send(renderErrorPage("redirect_uri is not registered for this client."));
      return;
    }

    const state = queryString(req.query.state);
    const responseType = queryString(req.query.response_type);
    const codeChallenge = queryString(req.query.code_challenge);
    const codeChallengeMethod = queryString(req.query.code_challenge_method) ?? "S256";

    if (responseType !== "code") {
      res.redirect(
        redirectWithError(redirectUri, state, "unsupported_response_type", "Only response_type=code is supported.")
      );
      return;
    }

    if (!codeChallenge || codeChallengeMethod !== "S256") {
      res.redirect(
        redirectWithError(redirectUri, state, "invalid_request", "PKCE with code_challenge_method=S256 is required.")
      );
      return;
    }

    const requestedResource = queryString(req.query.resource);

    // RFC 8707: a token must be bound to the resource it will be used at. Claude
    // always sends this; reject a mismatch rather than silently issuing a token
    // for a resource the client did not ask for.
    if (requestedResource && requestedResource.replace(/\/+$/, "") !== resourceUrl()) {
      res.redirect(
        redirectWithError(redirectUri, state, "invalid_target", "resource does not match this MCP server.")
      );
      return;
    }

    const requested = parseScopeString(req.query.scope);
    const scopes = requested.length > 0 ? requested : [...RESOURCE_SCOPES];

    const user = await getSessionUser(req);

    if (!user) {
      const next = `${req.originalUrl}`;
      res.redirect(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const authorizationRequest: AuthorizationRequest = {
      clientId: client.clientId,
      redirectUri,
      scopes,
      state,
      codeChallenge,
      codeChallengeMethod,
      resource: resourceUrl()
    };

    // The global CSP's form-action is 'self', which Chrome enforces not just on
    // the <form>'s own POST target but on any cross-origin redirect that
    // submission triggers. Approving consent always ends in exactly that: a 302
    // to the client's redirect_uri, which is almost never our own origin. Without
    // this override, the browser silently drops the redirect and "Allow" does
    // nothing. redirect_uri was already checked against the client's registered
    // list above, so widening the policy to that one already-validated origin
    // doesn't weaken anything — it makes the policy match what this response is
    // actually going to do.
    let redirectOrigin: string | null;
    try {
      redirectOrigin = new URL(redirectUri).origin;
    } catch {
      // redirectUriAllowed only guarantees this when it matched via URL parsing,
      // not the literal-string branch. Fall back to 'self' only rather than
      // letting a malformed value break the whole page.
      redirectOrigin = null;
    }

    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        `form-action 'self'${redirectOrigin ? ` ${redirectOrigin}` : ""}`
      ].join("; ")
    );

    res
      .type("html")
      .send(
        renderConsentPage({
          displayHost: client.displayHost,
          clientName: client.clientName,
          scopes,
          userEmail: user.email,
          redirectUri,
          signedRequest: signRequest(authorizationRequest),
          isLoopbackRedirect: isLoopbackRedirect(redirectUri)
        })
      );
  })
);

// ---------------------------------------------------------------------------
// POST /oauth/authorize  (consent decision)
// ---------------------------------------------------------------------------

router.post(
  "/authorize",
  authorizeLimiter,
  asyncHandler(async (req, res) => {
    const signed = typeof req.body?.request === "string" ? req.body.request : null;
    const request = signed ? verifySignedRequest(signed) : null;

    if (!request) {
      res.status(400).type("html").send(renderErrorPage("This authorization request expired or was tampered with."));
      return;
    }

    // A cross-site POST cannot carry the lax session cookie, so an unauthenticated
    // POST here is either an expired session or a forgery. Both get the same answer.
    const user = await getSessionUser(req);

    if (!user) {
      res.status(401).type("html").send(renderErrorPage("Your session expired. Sign in and try again."));
      return;
    }

    if (req.body?.decision !== "allow") {
      res.redirect(
        redirectWithError(request.redirectUri, request.state, "access_denied", "The user denied the request.")
      );
      return;
    }

    const client = await resolveClient(request.clientId);
    const clientName = client?.clientName ?? request.clientId;

    await prisma.oAuthGrant.upsert({
      where: { userId_clientId: { userId: user.id, clientId: request.clientId } },
      create: {
        userId: user.id,
        clientId: request.clientId,
        clientName,
        scopes: request.scopes
      },
      update: { scopes: request.scopes, lastUsedAt: new Date(), clientName }
    });

    const code = await issueAuthorizationCode({
      userId: user.id,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      scopes: request.scopes,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      resource: request.resource
    });

    const url = new URL(request.redirectUri);
    url.searchParams.set("code", code);
    url.searchParams.set("iss", issuer());

    if (request.state) {
      url.searchParams.set("state", request.state);
    }

    res.redirect(url.toString());
  })
);

// ---------------------------------------------------------------------------
// POST /oauth/token
// ---------------------------------------------------------------------------

interface TokenErrorBody {
  error: string;
  error_description: string;
}

function tokenError(res: Response, status: number, body: TokenErrorBody) {
  res.status(status).json(body);
}

router.post(
  "/token",
  tokenLimiter,
  asyncHandler(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    const body = (req.body ?? {}) as Record<string, unknown>;
    const grantType = queryString(body.grant_type);

    // Public clients send client_id in the body; confidential clients may use
    // HTTP Basic instead.
    let clientId = queryString(body.client_id);
    let clientSecret = queryString(body.client_secret);

    const authorization = req.headers.authorization;
    if (authorization?.startsWith("Basic ")) {
      const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator > -1) {
        clientId = clientId ?? decodeURIComponent(decoded.slice(0, separator));
        clientSecret = clientSecret ?? decodeURIComponent(decoded.slice(separator + 1));
      }
    }

    if (!clientId) {
      tokenError(res, 400, { error: "invalid_client", error_description: "client_id is required." });
      return;
    }

    let client: ResolvedClient | null;
    try {
      client = await resolveClient(clientId);
    } catch {
      client = null;
    }

    if (!client || !(await verifyClientSecret(client, clientSecret))) {
      tokenError(res, 401, { error: "invalid_client", error_description: "Client authentication failed." });
      return;
    }

    if (grantType === "authorization_code") {
      const code = queryString(body.code);
      const codeVerifier = queryString(body.code_verifier);
      const redirectUri = queryString(body.redirect_uri);

      if (!code || !codeVerifier) {
        tokenError(res, 400, {
          error: "invalid_request",
          error_description: "code and code_verifier are required."
        });
        return;
      }

      const record = await consumeAuthorizationCode(code);

      if (!record || record.clientId !== clientId) {
        tokenError(res, 400, { error: "invalid_grant", error_description: "Authorization code is not valid." });
        return;
      }

      if (redirectUri && redirectUri !== record.redirectUri) {
        tokenError(res, 400, { error: "invalid_grant", error_description: "redirect_uri does not match." });
        return;
      }

      if (!verifyPkce(codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
        tokenError(res, 400, { error: "invalid_grant", error_description: "PKCE verification failed." });
        return;
      }

      const access = signAccessToken({
        userId: record.userId,
        clientId: record.clientId,
        scopes: record.scopes
      });

      const wantsRefresh = record.scopes.includes(SCOPE_OFFLINE_ACCESS);
      const refreshToken = wantsRefresh
        ? await issueRefreshToken({
            userId: record.userId,
            clientId: record.clientId,
            scopes: record.scopes,
            resource: record.resource
          })
        : null;

      res.json({
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        scope: formatScopeString(record.scopes),
        ...(refreshToken ? { refresh_token: refreshToken } : {})
      });
      return;
    }

    if (grantType === "refresh_token") {
      const presented = queryString(body.refresh_token);

      if (!presented) {
        tokenError(res, 400, { error: "invalid_request", error_description: "refresh_token is required." });
        return;
      }

      const rotated = await rotateRefreshToken(presented, clientId);

      if (!rotated.ok) {
        tokenError(res, 400, { error: "invalid_grant", error_description: "Refresh token is not valid." });
        return;
      }

      const requested = parseScopeString(body.scope);
      // A refresh may narrow scope but never widen it.
      const scopes =
        requested.length > 0 ? requested.filter((scope) => rotated.scopes.includes(scope)) : rotated.scopes;

      const access = signAccessToken({ userId: rotated.userId, clientId, scopes });

      res.json({
        access_token: access.token,
        token_type: "Bearer",
        expires_in: access.expiresIn,
        scope: formatScopeString(scopes),
        refresh_token: rotated.token
      });
      return;
    }

    tokenError(res, 400, {
      error: "unsupported_grant_type",
      error_description: "Supported grant types: authorization_code, refresh_token."
    });
  })
);

// ---------------------------------------------------------------------------
// POST /oauth/register  (RFC 7591)
// ---------------------------------------------------------------------------

router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    try {
      const result = await registerClient(req.body);

      res.status(201).json({
        client_id: result.clientId,
        ...(result.clientSecret ? { client_secret: result.clientSecret } : {}),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: result.clientName,
        redirect_uris: result.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: result.isPublic ? "none" : "client_secret_post",
        scope: formatScopeString([...GRANTABLE_SCOPES])
      });
    } catch (error) {
      if (error instanceof RegistrationError) {
        res.status(400).json({ error: error.code, error_description: error.message });
        return;
      }

      throw error;
    }
  })
);

// ---------------------------------------------------------------------------
// POST /oauth/revoke  (RFC 7009)
// ---------------------------------------------------------------------------

router.post(
  "/revoke",
  tokenLimiter,
  asyncHandler(async (req, res) => {
    const token = queryString((req.body as Record<string, unknown> | undefined)?.token);

    if (token) {
      await revokeRefreshToken(token);
    }

    // RFC 7009: always 200, even for unknown tokens.
    res.status(200).json({});
  })
);

export { baseUrl };
export default router;
