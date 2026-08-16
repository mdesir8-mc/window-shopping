import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { safeFetch } from "../utils/safeFetch";
import { GRANTABLE_SCOPES } from "./config";

export interface ResolvedClient {
  clientId: string;
  clientName: string;
  /** Host shown on the consent screen as the relying party. */
  displayHost: string;
  redirectUris: string[];
  isPublic: boolean;
  /** CIMD clients are resolved per request and never persisted. */
  source: "cimd" | "registered";
  clientSecretHash: string | null;
}

const CIMD_FETCH_TIMEOUT_MS = 5000;
const CIMD_MAX_BYTES = 64 * 1024;

// ---------------------------------------------------------------------------
// Redirect URI matching
// ---------------------------------------------------------------------------

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

/**
 * Exact string match, except for RFC 8252 loopback redirects: native clients bind
 * an ephemeral port at runtime, so the port is ignored. Claude Code declares
 * http://localhost/callback and http://127.0.0.1/callback and then listens on a
 * random port, so both hostnames get the port-agnostic treatment.
 */
export function redirectUriAllowed(requested: string, registered: string[]): boolean {
  if (registered.includes(requested)) {
    return true;
  }

  let candidate: URL;
  try {
    candidate = new URL(requested);
  } catch {
    return false;
  }

  if (candidate.protocol !== "http:" || !isLoopbackHost(candidate.hostname)) {
    return false;
  }

  return registered.some((entry) => {
    let allowed: URL;
    try {
      allowed = new URL(entry);
    } catch {
      return false;
    }

    return (
      allowed.protocol === candidate.protocol &&
      allowed.hostname === candidate.hostname &&
      allowed.pathname === candidate.pathname
    );
  });
}

// ---------------------------------------------------------------------------
// Client ID Metadata Documents
// ---------------------------------------------------------------------------

function isCimdClientId(clientId: string): boolean {
  try {
    return new URL(clientId).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A CIMD client_id is an HTTPS URL we dereference at authorize time. That is a
 * server-side fetch of a caller-supplied URL, so it runs through the same SSRF
 * guard as product scraping before any request is made.
 */
async function resolveCimdClient(clientId: string): Promise<ResolvedClient | null> {
  const url = new URL(clientId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CIMD_FETCH_TIMEOUT_MS);

  let document: unknown;
  try {
    // safeFetch, not bare fetch: it re-validates every redirect hop and pins each
    // connection to the exact IP it just vetted. Validating the URL and then
    // handing it to fetch() would leave a DNS-rebinding window, because fetch
    // resolves the hostname again itself.
    const response = await safeFetch(clientId, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    if (response.text.length > CIMD_MAX_BYTES) {
      return null;
    }

    document = JSON.parse(response.text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  if (!document || typeof document !== "object") {
    return null;
  }

  const metadata = document as Record<string, unknown>;

  // The document must be self-referential, otherwise any page could claim to be
  // the registration metadata for someone else's client_id.
  if (metadata.client_id !== clientId) {
    return null;
  }

  const redirectUris = Array.isArray(metadata.redirect_uris)
    ? metadata.redirect_uris.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (redirectUris.length === 0) {
    return null;
  }

  // The document is self-asserted, so a redirect target must either be
  // same-origin with the client_id URL or a loopback address. Without this a
  // document could name any third-party host as its callback.
  const allowed = redirectUris.filter((entry) => {
    try {
      const candidate = new URL(entry);
      return candidate.origin === url.origin || (candidate.protocol === "http:" && isLoopbackHost(candidate.hostname));
    } catch {
      return false;
    }
  });

  if (allowed.length === 0) {
    return null;
  }

  return {
    clientId,
    clientName: typeof metadata.client_name === "string" ? metadata.client_name : url.host,
    // Deliberately the client_id host and not client_name: the name is
    // self-asserted and would let a client spoof a trusted brand on the consent
    // screen. The host is what the user can actually verify.
    displayHost: url.host,
    redirectUris: allowed,
    isPublic: metadata.token_endpoint_auth_method !== "client_secret_post",
    source: "cimd",
    clientSecretHash: null
  };
}

// ---------------------------------------------------------------------------
// Resolution + Dynamic Client Registration
// ---------------------------------------------------------------------------

export async function resolveClient(clientId: string): Promise<ResolvedClient | null> {
  if (isCimdClientId(clientId)) {
    return resolveCimdClient(clientId);
  }

  const record = await prisma.oAuthClient.findUnique({ where: { clientId } });

  if (!record) {
    return null;
  }

  return {
    clientId: record.clientId,
    clientName: record.clientName,
    // Dynamic registration is open to anyone, so client_name and client_uri are
    // both self-asserted — a hostile client could register itself as "Claude".
    // The redirect host is the one fact the server verified, and it is where the
    // authorization code will actually be sent, so that is what the user sees.
    displayHost: safeHost(record.redirectUris[0] ?? "") ?? record.clientName,
    redirectUris: record.redirectUris,
    isPublic: record.isPublic,
    source: "registered",
    clientSecretHash: record.clientSecretHash
  };
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export interface RegistrationResult {
  clientId: string;
  clientSecret: string | null;
  clientName: string;
  redirectUris: string[];
  isPublic: boolean;
}

export class RegistrationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

/** RFC 7591 dynamic client registration. */
export async function registerClient(body: unknown): Promise<RegistrationResult> {
  if (!body || typeof body !== "object") {
    throw new RegistrationError("invalid_client_metadata", "Request body must be a JSON object.");
  }

  const metadata = body as Record<string, unknown>;

  const redirectUris = Array.isArray(metadata.redirect_uris)
    ? metadata.redirect_uris.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (redirectUris.length === 0) {
    throw new RegistrationError("invalid_redirect_uri", "redirect_uris is required.");
  }

  for (const uri of redirectUris) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new RegistrationError("invalid_redirect_uri", `Not a valid URL: ${uri}`);
    }

    const isHttpsRedirect = parsed.protocol === "https:";
    const isLoopbackRedirect = parsed.protocol === "http:" && isLoopbackHost(parsed.hostname);

    if (!isHttpsRedirect && !isLoopbackRedirect) {
      throw new RegistrationError(
        "invalid_redirect_uri",
        "redirect_uris must be https, or http on a loopback address."
      );
    }

    if (parsed.hash) {
      throw new RegistrationError("invalid_redirect_uri", "redirect_uris must not contain a fragment.");
    }
  }

  const requestedAuthMethod =
    typeof metadata.token_endpoint_auth_method === "string" ? metadata.token_endpoint_auth_method : "none";
  const isPublic = requestedAuthMethod === "none";

  const clientId = `ws_${crypto.randomBytes(16).toString("hex")}`;
  const clientSecret = isPublic ? null : crypto.randomBytes(32).toString("base64url");

  const requestedScopes =
    typeof metadata.scope === "string"
      ? metadata.scope.split(/\s+/).filter((scope) => (GRANTABLE_SCOPES as readonly string[]).includes(scope))
      : [...GRANTABLE_SCOPES];

  const clientName =
    typeof metadata.client_name === "string" && metadata.client_name.trim().length > 0
      ? metadata.client_name.trim().slice(0, 120)
      : "Unnamed MCP client";

  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? await bcrypt.hash(clientSecret, 12) : null,
      clientName,
      clientUri: typeof metadata.client_uri === "string" ? metadata.client_uri.slice(0, 2048) : null,
      redirectUris,
      grantTypes: ["authorization_code", "refresh_token"],
      scopes: requestedScopes.length > 0 ? requestedScopes : [...GRANTABLE_SCOPES],
      isPublic
    }
  });

  return { clientId, clientSecret, clientName, redirectUris, isPublic };
}

export async function verifyClientSecret(client: ResolvedClient, presented: string | null): Promise<boolean> {
  if (client.isPublic || !client.clientSecretHash) {
    // Public clients authenticate with PKCE alone.
    return true;
  }

  if (!presented) {
    return false;
  }

  return bcrypt.compare(presented, client.clientSecretHash);
}
