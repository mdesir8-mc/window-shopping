import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      details: err.details ?? null
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "A record with those values already exists." });
      return;
    }
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON request body." });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
