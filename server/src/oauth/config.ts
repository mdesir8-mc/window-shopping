import { getAppBaseUrl } from "../services/email";

export const MCP_PATH = "/mcp";

export const SCOPE_PROFILE = "profile";
export const SCOPE_CLOSETS_READ = "closets:read";
export const SCOPE_CLOSETS_WRITE = "closets:write";
export const SCOPE_OFFLINE_ACCESS = "offline_access";

/**
 * Scopes a token can actually carry rights for. `offline_access` is deliberately
 * absent: the MCP spec tells resource servers not to advertise it as a resource
 * requirement, it only asks the authorization server for a refresh token.
 */
export const RESOURCE_SCOPES = [SCOPE_PROFILE, SCOPE_CLOSETS_READ, SCOPE_CLOSETS_WRITE] as const;

export const GRANTABLE_SCOPES = [...RESOURCE_SCOPES, SCOPE_OFFLINE_ACCESS] as const;

export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  [SCOPE_PROFILE]: "See your name, email, and plan",
  [SCOPE_CLOSETS_READ]: "Read your closets, items, tags, and price history",
  [SCOPE_CLOSETS_WRITE]: "Create, edit, and delete your closets, items, and tags",
  [SCOPE_OFFLINE_ACCESS]: "Stay connected without asking you to sign in again"
};

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;
export const AUTHORIZATION_CODE_TTL_SECONDS = 60;

/** Canonical origin, no trailing slash. Doubles as the OAuth `issuer`. */
export function baseUrl(): string {
  return getAppBaseUrl().replace(/\/+$/, "");
}

/**
 * RFC 8707 resource identifier for this MCP server. Claude requires the `resource`
 * field of the protected resource metadata to match the connector URL exactly as
 * the user typed it, so this must stay `${base}/mcp` with no trailing slash.
 */
export function resourceUrl(): string {
  return `${baseUrl()}${MCP_PATH}`;
}

export function issuer(): string {
  return baseUrl();
}

export function protectedResourceMetadataUrl(): string {
  return `${baseUrl()}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

export function getMcpJwtSecret(): string {
  const secret = process.env.MCP_JWT_SECRET;

  if (!secret) {
    throw new Error("MCP_JWT_SECRET is required.");
  }

  return secret;
}

export function parseScopeString(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const seen = new Set<string>();
  for (const scope of value.split(/\s+/)) {
    if (scope && (GRANTABLE_SCOPES as readonly string[]).includes(scope)) {
      seen.add(scope);
    }
  }

  return [...seen];
}

export function formatScopeString(scopes: string[]): string {
  return scopes.join(" ");
}
