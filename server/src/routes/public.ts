import { Router } from "express";
import rateLimit from "express-rate-limit";
import { parseProductPage, ParserFetchError } from "../services/parser";
import { asyncHandler, HttpError } from "../utils/http";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import { requireString } from "../utils/validation";

const router = Router();

// Unauthenticated landing-page parse demo. Stricter than the authed parseLimiter
// (10/min) since the surface is open to the internet and each parse spins up a
// headless browser.
const demoParseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a minute." },
  skip: () => process.env.NODE_ENV === "test"
});

// Global daily cap across all callers — catches distributed-IP abuse the per-IP
// limiter misses. In-memory ⇒ per-process: resets on restart and is not shared
// across instances, which is fine for the current single-instance deploy. The
// threshold is overridable so tests can drive it deterministically.
const DEMO_DAILY_CAP = Number(process.env.DEMO_PARSE_DAILY_CAP ?? 500);
let demoDayKey = "";
let demoDayCount = 0;

function withinDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== demoDayKey) {
    demoDayKey = today;
    demoDayCount = 0;
  }

  if (demoDayCount >= DEMO_DAILY_CAP) {
    return false;
  }

  demoDayCount += 1;
  return true;
}

router.post(
  "/parse-url",
  demoParseLimiter,
  asyncHandler(async (req, res) => {
    if (!withinDailyCap()) {
      throw new HttpError(429, "The demo is busy right now. Try again later.");
    }

    const rawUrl = requireString(req.body?.url, "url");
    if (rawUrl.length > 2048) {
      throw new HttpError(400, "That URL is too long.");
    }
    const safeUrl = await validateSsrfSafeUrl(rawUrl);

    try {
      // demoMode skips Claude enrichment — cheaper, faster, and keeps the
      // unauthenticated path off the AI bill.
      const parsed = await parseProductPage(safeUrl.toString(), { demoMode: true });
      res.json(parsed);
    } catch (error) {
      if (error instanceof ParserFetchError) {
        console.error("[public] product fetch failed:", error.message);
        throw new HttpError(502, "Could not fetch the product page.");
      }

      throw error;
    }
  })
);

export default router;
