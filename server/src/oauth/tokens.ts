import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZATION_CODE_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  formatScopeString,
  getMcpJwtSecret,
  issuer,
  resourceUrl
} from "./config";

export interface McpAccessTokenClaims {
  sub: string;
  scope: string;
  client_id: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

function randomSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Codes and refresh tokens are opaque bearer secrets, so only their hashes are
 * stored. SHA-256 (not bcrypt) is right here: these are already 256 bits of
 * entropy, so there is nothing to brute-force, and lookup must be a single
 * indexed query rather than a scan.
 */
function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

// ---------------------------------------------------------------------------
// Access tokens
// ---------------------------------------------------------------------------

/**
 * Signed with MCP_JWT_SECRET, never JWT_SECRET. The session verifier
 * (utils/jwt.ts) passes no `audience` option, so a token signed with the session
 * secret would authenticate /api/* as a full web session. A separate secret plus
 * the explicit `aud` check below keeps the two credential families disjoint.
 */
export function signAccessToken(input: {
  userId: string;
  clientId: string;
  scopes: string[];
}): { token: string; expiresIn: number } {
  const token = jwt.sign(
    {
      scope: formatScopeString(input.scopes),
      client_id: input.clientId
    },
    getMcpJwtSecret(),
    {
      algorithm: "HS256",
      subject: input.userId,
      issuer: issuer(),
      audience: resourceUrl(),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    }
  );

  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export function verifyAccessToken(token: string): McpAccessTokenClaims {
  return jwt.verify(token, getMcpJwtSecret(), {
    algorithms: ["HS256"],
    issuer: issuer(),
    audience: resourceUrl()
  }) as McpAccessTokenClaims;
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

export async function issueAuthorizationCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
}): Promise<string> {
  const code = randomSecret();

  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: hashSecret(code),
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      scopes: input.scopes,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: input.codeChallengeMethod,
      resource: input.resource,
      expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_SECONDS * 1000)
    }
  });

  return code;
}

/**
 * Single-use. Returns null for unknown, expired, or already-redeemed codes so the
 * caller can answer with a uniform `invalid_grant`.
 */
export async function consumeAuthorizationCode(code: string) {
  const record = await prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash: hashSecret(code) }
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() }
  });

  // Lost the race against a concurrent redemption of the same code.
  if (claimed.count === 0) {
    return null;
  }

  return record;
}

export function verifyPkce(codeVerifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") {
    return false;
  }

  const computed = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const expected = Buffer.from(challenge);
  const actual = Buffer.from(computed);

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

export async function issueRefreshToken(input: {
  userId: string;
  clientId: string;
  scopes: string[];
  resource: string;
}): Promise<string> {
  const token = randomSecret();

  await prisma.oAuthRefreshToken.create({
    data: {
      tokenHash: hashSecret(token),
      clientId: input.clientId,
      userId: input.userId,
      scopes: input.scopes,
      resource: input.resource,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
    }
  });

  return token;
}

/** Internal signal used to roll back a rotation that lost the claim race. */
class RotationRaceLost extends Error {}

export type RefreshRotation =
  | { ok: true; token: string; userId: string; scopes: string[]; resource: string }
  | { ok: false };

/**
 * Rotates on every use, as OAuth 2.1 requires for public clients. Presenting a
 * token that already has a successor means the token leaked and was replayed, so
 * the entire chain for that (user, client) is revoked rather than served.
 */
export async function rotateRefreshToken(
  presented: string,
  clientId: string
): Promise<RefreshRotation> {
  const record = await prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash: hashSecret(presented) }
  });

  if (!record || record.clientId !== clientId) {
    return { ok: false };
  }

  if (record.replacedById || record.revokedAt) {
    await prisma.oAuthRefreshToken.updateMany({
      where: { userId: record.userId, clientId: record.clientId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { ok: false };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false };
  }

  const grant = await prisma.oAuthGrant.findUnique({
    where: { userId_clientId: { userId: record.userId, clientId: record.clientId } }
  });

  // The user revoked consent since this token was issued.
  if (!grant) {
    return { ok: false };
  }

  const replacement = randomSecret();

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.oAuthRefreshToken.create({
        data: {
          tokenHash: hashSecret(replacement),
          clientId: record.clientId,
          userId: record.userId,
          scopes: record.scopes,
          resource: record.resource,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
        }
      });

      // Claim the source token atomically, the same way consumeAuthorizationCode
      // claims a code. The checks above ran against a plain read, so two
      // concurrent presentations of one token could otherwise both rotate and
      // both mint a live successor — which is exactly the replay that reuse
      // detection exists to catch. Losing the claim rolls the whole transaction
      // back, including the replacement created a moment ago.
      const claimed = await tx.oAuthRefreshToken.updateMany({
        where: { id: record.id, revokedAt: null, replacedById: null },
        data: { replacedById: created.id, revokedAt: new Date() }
      });

      if (claimed.count === 0) {
        throw new RotationRaceLost();
      }

      await tx.oAuthGrant.update({
        where: { id: grant.id },
        data: { lastUsedAt: new Date() }
      });
    });
  } catch (error) {
    if (error instanceof RotationRaceLost) {
      return { ok: false };
    }

    throw error;
  }

  return {
    ok: true,
    token: replacement,
    userId: record.userId,
    scopes: record.scopes,
    resource: record.resource
  };
}

export async function revokeRefreshToken(presented: string): Promise<void> {
  await prisma.oAuthRefreshToken.updateMany({
    where: { tokenHash: hashSecret(presented), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
