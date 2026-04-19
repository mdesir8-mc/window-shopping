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

export interface ParsedProduct {
  brand: string | null;
  name: string | null;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  colors: string[];
  suggestedTags: string[];
  suggestedSeason: string | null;
  source: string;
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
