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
  return jwt.verify(token, getJwtSecret()) as JwtClaims;
}
