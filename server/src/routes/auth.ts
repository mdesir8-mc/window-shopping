import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { signAuthToken } from "../utils/jwt";
import { serializeAuthUser } from "../utils/serializers";
import { requireString } from "../utils/validation";

const router = Router();

router.post(
  "/register",
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

    res.status(201).json({
      token: signAuthToken(safeUser),
      user: safeUser
    });
  })
);

router.post(
  "/login",
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

    res.json({
      token: signAuthToken(safeUser),
      user: safeUser
    });
  })
);

export default router;
