import { createHash, randomBytes } from "node:crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash a raw reset token for storage/lookup. The raw token only ever lives in the
 * emailed link; the database stores this sha256 digest.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mint a single-use password reset token: a random raw token (for the email link), its
 * stored hash, and a 1-hour expiry.
 */
export function generateResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
  };
}
