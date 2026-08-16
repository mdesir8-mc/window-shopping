import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { prisma } from "../lib/prisma";
import {
  RESOURCE_SCOPES,
  SCOPE_CLOSETS_READ,
  SCOPE_CLOSETS_WRITE,
  formatScopeString,
  protectedResourceMetadataUrl
} from "../oauth/config";
import { verifyAccessToken } from "../oauth/tokens";
import { buildMcpServer } from "./server";

const router = Router();

/**
 * Tool name -> scope required to call it. Anything absent needs closets:write,
 * so a tool added without a matching entry fails closed rather than open.
 */
/**
 * Tools that scrape a retailer page. They occupy a slot in the shared headless
 * browser pool for tens of seconds, so they get a much tighter budget than
 * ordinary CRUD calls.
 */
const EXPENSIVE_TOOLS = new Set(["add_item_from_url", "refresh_item"]);

const READ_TOOLS = new Set([
  "get_profile",
  "list_closets",
  "get_closet",
  "list_items",
  "get_item",
  "get_price_history",
  "list_tags"
]);

function challenge(params: Record<string, string>): string {
  const parts = Object.entries(params).map(([key, value]) => `${key}="${value}"`);
  return `Bearer ${parts.join(", ")}`;
}

/**
 * Claude only runs the OAuth flow for a transport-level 401. A 200 wrapping a
 * tool error is passed to the model as text and produces no Connect card.
 */
function unauthorized(res: Response, description: string) {
  res
    .status(401)
    .set(
      "WWW-Authenticate",
      challenge({
        error: "invalid_token",
        error_description: description,
        resource_metadata: protectedResourceMetadataUrl(),
        scope: formatScopeString([...RESOURCE_SCOPES])
      })
    )
    .json({ error: "invalid_token", error_description: description });
}

function insufficientScope(res: Response, required: string[]) {
  const description = `This action needs the ${required.join(" and ")} permission.`;

  res
    .status(403)
    .set(
      "WWW-Authenticate",
      challenge({
        error: "insufficient_scope",
        error_description: description,
        resource_metadata: protectedResourceMetadataUrl(),
        // The spec asks for every scope needed for the operation in one
        // challenge, so a step-up does not have to happen twice.
        scope: formatScopeString([...RESOURCE_SCOPES])
      })
    )
    .json({ error: "insufficient_scope", error_description: description });
}

/** Does this request body call any tool in `names`? */
function callsToolIn(body: unknown, names: Set<string>): boolean {
  const messages = Array.isArray(body) ? body : [body];

  return messages.some((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    const { method, params } = message as { method?: unknown; params?: { name?: unknown } };
    return method === "tools/call" && typeof params?.name === "string" && names.has(params.name);
  });
}

/**
 * Throttle per access token rather than per IP: every request from a hosted
 * Claude surface arrives from the same Anthropic egress range, so an IP key would
 * put every user of this connector in one bucket.
 */
function tokenKey(req: Request, res: Response): string {
  const token = extractBearer(req);

  if (!token) {
    return ipKeyGenerator(req.ip ?? "", 56);
  }

  return `t:${crypto.createHash("sha256").update(token).digest("hex")}`;
}

const skipInTest = () => process.env.NODE_ENV === "test";

const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tokenKey,
  skip: skipInTest,
  message: { jsonrpc: "2.0", error: { code: -32000, message: "Too many requests." }, id: null }
});

const expensiveToolLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: tokenKey,
  skip: (req) => skipInTest() || !callsToolIn(req.body, EXPENSIVE_TOOLS),
  message: {
    jsonrpc: "2.0",
    error: { code: -32000, message: "Too many page-scraping requests. Try again in a minute." },
    id: null
  }
});

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/** Scopes needed by the tool calls in this request body, if any. */
function requiredScopesFor(body: unknown): string[] {
  const messages = Array.isArray(body) ? body : [body];
  const required = new Set<string>();

  for (const message of messages) {
    if (!message || typeof message !== "object") {
      continue;
    }

    const { method, params } = message as { method?: unknown; params?: { name?: unknown } };

    if (method !== "tools/call") {
      continue;
    }

    const name = typeof params?.name === "string" ? params.name : "";
    required.add(READ_TOOLS.has(name) ? SCOPE_CLOSETS_READ : SCOPE_CLOSETS_WRITE);
  }

  return [...required];
}

async function handleMcpPost(req: Request, res: Response): Promise<void> {
  const token = extractBearer(req);

  if (!token) {
    unauthorized(res, "Authentication required.");
    return;
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    unauthorized(res, "Access token is invalid or expired.");
    return;
  }

  const scopes = typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];

  // The access token is self-contained, but consent can be withdrawn inside its
  // one-hour lifetime, and logout-all revokes everything at once. Both are
  // checked per request.
  const [grant, user] = await Promise.all([
    prisma.oAuthGrant.findUnique({
      where: { userId_clientId: { userId: claims.sub, clientId: claims.client_id } }
    }),
    prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, sessionsValidAfter: true } })
  ]);

  if (!user || !grant) {
    unauthorized(res, "This connection was revoked. Reconnect to continue.");
    return;
  }

  if (user.sessionsValidAfter && claims.iat * 1000 < user.sessionsValidAfter.getTime()) {
    unauthorized(res, "This connection was revoked. Reconnect to continue.");
    return;
  }

  // get_profile is gated by the profile scope inside registerTools; the
  // transport gate only needs to separate reads from writes.
  const required = requiredScopesFor(req.body).filter((scope) => !scopes.includes(scope));

  if (required.length > 0) {
    insufficientScope(res, required);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on("close", () => {
    void transport.close();
  });

  const server = buildMcpServer({ userId: claims.sub, scopes });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

router.post("/", mcpLimiter, expensiveToolLimiter, (req, res) => {
  handleMcpPost(req, res).catch((error) => {
    console.error("MCP request failed", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null
      });
    }
  });
});

// Stateless transport: there is no server-initiated stream to open and no session
// to delete, so both verbs are answered rather than falling through to the SPA.
router.get("/", (_req, res) => {
  res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. This server is stateless; use POST." },
    id: null
  });
});

router.delete("/", (_req, res) => {
  res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. This server is stateless; use POST." },
    id: null
  });
});

export default router;
