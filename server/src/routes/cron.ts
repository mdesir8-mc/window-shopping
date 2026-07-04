import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import rateLimit from "express-rate-limit";
import { asyncHandler, HttpError } from "../utils/http";
import { refreshAllUsers } from "../services/refresh-all";

const router = Router();

// Modest limit — a legit caller hits this once a day. Guards against token-guess
// hammering. Keyed on real client IP via the app's `trust proxy` setting.
const cronLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." },
  skip: () => process.env.NODE_ENV === "test"
});

// Overlap guard: a slow run still going when the next trigger fires returns 409
// instead of stacking a second full refresh. Module-level ⇒ per-process, which is
// fine for the single-instance deploy.
let running = false;

function tokenMatches(authorization: string | undefined, secret: string): boolean {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  const token = authorization.slice("Bearer ".length).trim();
  const provided = Buffer.from(token);
  const expected = Buffer.from(secret);
  // timingSafeEqual throws on length mismatch — short-circuit first. The length
  // difference is not secret-revealing.
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

router.post(
  "/refresh",
  cronLimiter,
  asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      // Fail closed — a misconfigured deploy should be loudly broken, not silently open.
      throw new HttpError(503, "Cron endpoint is not configured.");
    }
    if (!tokenMatches(req.headers.authorization, secret)) {
      throw new HttpError(401, "Unauthorized.");
    }
    if (running) {
      throw new HttpError(409, "A refresh run is already in progress.");
    }

    running = true;
    // Respond before running: the loop is minutes of Playwright work and would
    // otherwise exceed the proxy HTTP timeout. Detached run; errors go to logs.
    res.status(202).json({ started: true });

    refreshAllUsers()
      .catch((error) => {
        console.error("[cron] refresh-all failed:", error);
      })
      .finally(() => {
        running = false;
      });
  })
);

export default router;
