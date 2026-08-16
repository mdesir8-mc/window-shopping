import jwt from "jsonwebtoken";
import type { AuthenticatedUser, JwtClaims } from "../types";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }

  return secret;
}

export function signAuthToken(user: AuthenticatedUser) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name
    },
    getJwtSecret(),
    {
      expiresIn: "30d",
      subject: user.id
    }
  );
}

export function verifyAuthToken(token: string) {
  const claims = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as JwtClaims;

  // Session tokens are minted without an audience. MCP access tokens always
  // carry aud=<base>/mcp and are signed with a different secret, so this can
  // only fire if the two secrets are ever misconfigured to the same value —
  // in which case an MCP token must still not pass as a web session.
  if ((claims as { aud?: unknown }).aud !== undefined) {
    throw new Error("Token is not a session token.");
  }

  return claims;
}
