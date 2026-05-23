import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface JwtClaims {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
