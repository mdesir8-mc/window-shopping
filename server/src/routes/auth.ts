import { Router, type Response } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { signAuthToken } from "../utils/jwt";
import { serializeAuthUser } from "../utils/serializers";
import { requireString } from "../utils/validation";

const router = Router();
const AUTH_COOKIE_NAME = "auth_token";
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in 15 minutes." }
});

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: AUTH_COOKIE_MAX_AGE
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
}

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = requireString(req.body?.email, "email").toLowerCase();
    const name = requireString(req.body?.name, "name");
    const password = requireString(req.body?.password, "password");

    if (password.length < 8) {
      throw new HttpError(400, "password must be at least 8 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash
      }
    });

    const safeUser = serializeAuthUser({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan
    });

    const token = signAuthToken(safeUser);
    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: safeUser
    });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = requireString(req.body?.email, "email").toLowerCase();
    const password = requireString(req.body?.password, "password");

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const safeUser = serializeAuthUser({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan
    });

    const token = signAuthToken(safeUser);
    setAuthCookie(res, token);

    res.json({
      token,
      user: safeUser
    });
  })
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
