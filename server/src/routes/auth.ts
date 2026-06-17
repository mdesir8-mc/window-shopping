import { Router } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { signAuthToken } from "../utils/jwt";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookie";
import { serializeAuthUser } from "../utils/serializers";
import { requireString } from "../utils/validation";
import { generateResetToken, hashResetToken } from "../utils/passwordReset";
import { sendEmail, getAppBaseUrl, EmailSendError } from "../services/email";
import { passwordResetEmail } from "../services/email-templates";
import { requireAuth } from "../middleware/auth";
import type { AuthenticatedRequest } from "../types";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in 15 minutes." },
  // Skip rate limiting under test so the suite's many auth requests don't share a
  // single per-IP budget (which makes test outcomes order-dependent).
  skip: () => process.env.NODE_ENV === "test"
});

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
      plan: user.plan,
      avatarUrl: user.avatarUrl
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

    if (!user || !user.password) {
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
      plan: user.plan,
      avatarUrl: user.avatarUrl
    });

    const token = signAuthToken(safeUser);
    setAuthCookie(res, token);

    res.json({
      token,
      user: safeUser
    });
  })
);

router.post(
  "/google",
  authLimiter,
  asyncHandler(async (req, res) => {
    const credential = requireString(req.body?.credential, "credential");

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean) as string[]
      });
      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Could not verify Google sign-in.");
    }

    if (!payload || payload.email_verified !== true || !payload.sub || !payload.email || !payload.name) {
      throw new HttpError(401, "Could not verify Google sign-in.");
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name;
    const avatarUrl = payload.picture ?? null;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { googleId, avatarUrl, name: existing.name || name }
          })
        : await prisma.user.create({
            data: { email, name, googleId, avatarUrl, password: null }
          });
    } else if (user.avatarUrl !== avatarUrl) {
      user = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
    }

    const safeUser = serializeAuthUser({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatarUrl: user.avatarUrl
    });

    const token = signAuthToken(safeUser);
    setAuthCookie(res, token);

    res.json({
      token,
      user: safeUser
    });
  })
);

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = requireString(req.body?.email, "email").toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any outstanding tokens before issuing a fresh one.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      const { token, tokenHash, expiresAt } = generateResetToken();
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt }
      });

      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${token}`;

      try {
        await sendEmail({ to: email, ...passwordResetEmail(resetUrl) });
      } catch (error) {
        if (error instanceof EmailSendError) {
          console.error("[auth] failed to send password reset email", error);
        } else {
          throw error;
        }
      }
    }

    // Always respond the same way so the endpoint can't be used to enumerate accounts.
    res.json({ ok: true });
  })
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = requireString(req.body?.token, "token");
    const password = requireString(req.body?.password, "password");

    if (password.length < 8) {
      throw new HttpError(400, "password must be at least 8 characters.");
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) }
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, "Invalid or expired reset link.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash }
      }),
      // Mark this token used and clear any siblings so the link is single-use.
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } })
    ]);

    res.json({ ok: true });
  })
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Global sign-out: bump sessionsValidAfter so every token issued before now (on any
// device, including this one) is rejected by requireAuth on its next request.
router.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthenticatedRequest;
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionsValidAfter: new Date() }
    });
    clearAuthCookie(res);
    res.json({ ok: true });
  })
);

export default router;
