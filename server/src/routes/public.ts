import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { parseProductPage, ParserFetchError } from "../services/parser";
import { asyncHandler, HttpError } from "../utils/http";
import { serializePublicCloset } from "../utils/publicSerializers";
import { isValidShareToken } from "../utils/shareToken";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import { requireString } from "../utils/validation";

const router = Router();

// Cheap indexed DB read, so no global daily cap (unlike parse-url, which launches
// a headless browser). This limiter is anti-scraping/DoS only — token brute-force
// is already a non-issue at 256 bits of entropy.
const shareViewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a minute." },
  skip: () => process.env.NODE_ENV === "test"
});

router.get(
  "/closets/:token",
  shareViewLimiter,
  asyncHandler(async (req, res) => {
    const token = requireString(req.params.token, "token");
    // Reject malformed tokens before touching the DB. A revoked or bogus token is
    // indistinguishable from a wrong one — always the same opaque 404.
    if (!isValidShareToken(token)) {
      throw new HttpError(404, "Closet not found.");
    }

    const closet = await prisma.closet.findUnique({
      where: { shareToken: token },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { _count: { select: { items: true } } }
        },
        items: { orderBy: { addedAt: "desc" } },
        _count: { select: { items: true } }
      }
    });

    if (!closet) {
      throw new HttpError(404, "Closet not found.");
    }

    // Keep leaked share links out of search indexes.
    res.setHeader("X-Robots-Tag", "noindex");
    res.json(serializePublicCloset(closet));
  })
);

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
