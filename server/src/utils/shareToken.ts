import { randomBytes } from "node:crypto";

// Share tokens are stored in the clear (unlike password-reset tokens): the token
// IS the URL the owner hands out and must be re-displayable in the UI, and it
// grants only read-only, non-PII access. 256 bits of entropy make it unguessable.
export function generateShareToken(): string {
  return randomBytes(32).toString("hex");
}

// A valid token is exactly 64 lowercase hex chars. Reject anything else before it
// reaches the DB — cheap guard against pathological / malformed :token params.
const SHARE_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function isValidShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}
