import { chromium, type Browser } from "playwright";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import { startSsrfProxy, stopSsrfProxy } from "./ssrfProxy";

let browser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function ensureBrowser(): Promise<Browser> {
  if (browser) {
    return browser;
  }

  if (!browserPromise) {
    browserPromise = (async () => {
      // Route all Chromium traffic through the localhost SSRF-pinning proxy so connections
      // are pinned to a vetted IP (defeats DNS rebinding). If the launch fails, tear the
      // proxy down so its port isn't leaked.
      const port = await startSsrfProxy();
      try {
        const instance = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          proxy: { server: `http://127.0.0.1:${port}` }
        });
        browser = instance;
        return instance;
      } catch (error) {
        await stopSsrfProxy();
        throw error;
      } finally {
        browserPromise = null;
      }
    })();
  }

  return browserPromise;
}

export async function launchBrowser(): Promise<void> {
  await ensureBrowser();
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
  await stopSsrfProxy();
}

// Bound the number of concurrent headless renders so a burst of parse requests
// (the unauthenticated /api/public/parse-url demo is the exposed surface) can't
// spawn unbounded Chromium pages and OOM the single-instance container. Values are
// read per-call so the cap stays overridable via env without a module reload, and
// `|| default` guards against a non-numeric / NaN override.
function renderConcurrency(): number {
  return Math.max(1, Number(process.env.BROWSER_RENDER_CONCURRENCY) || 3);
}

function renderQueueTimeoutMs(): number {
  return Math.max(0, Number(process.env.BROWSER_RENDER_QUEUE_TIMEOUT_MS) || 8_000);
}

// Cap how deep the wait queue can grow so a sustained burst can't pile up an
// unbounded backlog of waiters (and live timers) — beyond this, callers fail fast
// immediately instead of waiting out the timeout. Defaults to 2× the render cap.
function renderQueueMax(): number {
  return Math.max(1, Number(process.env.BROWSER_RENDER_QUEUE_MAX) || renderConcurrency() * 2);
}

interface RenderWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
}

let activeRenders = 0;
const renderQueue: RenderWaiter[] = [];

// Acquire a render slot. Resolves immediately when under the cap; otherwise queues
// and either gets handed a slot by a finishing render or, after a bounded wait,
// rejects so the caller fails fast into the existing raw-fetch fallback instead of
// piling up a backlog. `settled` makes the timeout/release hand-off race-safe.
function acquireRenderSlot(): Promise<void> {
  if (activeRenders < renderConcurrency()) {
    activeRenders += 1;
    return Promise.resolve();
  }

  // Backlog already at capacity — reject now rather than parking yet another waiter.
  if (renderQueue.length >= renderQueueMax()) {
    return Promise.reject(new Error("Headless render queue is full."));
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: RenderWaiter = {
      resolve,
      reject,
      settled: false,
      timer: setTimeout(() => {
        if (waiter.settled) {
          return;
        }
        waiter.settled = true;
        const index = renderQueue.indexOf(waiter);
        if (index !== -1) {
          renderQueue.splice(index, 1);
        }
        reject(new Error("Timed out waiting for a headless render slot."));
      }, renderQueueTimeoutMs())
    };

    renderQueue.push(waiter);
  });
}

function releaseRenderSlot(): void {
  let next = renderQueue.shift();
  // Skip any already-timed-out waiters (they remove themselves, but guard against a
  // release/timeout ordering race).
  while (next && next.settled) {
    next = renderQueue.shift();
  }

  if (next) {
    next.settled = true;
    clearTimeout(next.timer);
    next.resolve(); // hand off the slot; activeRenders stays the same
    return;
  }

  activeRenders = Math.max(0, activeRenders - 1);
}

export async function fetchRenderedHtml(url: string): Promise<string> {
  // Gate before launching/reusing the browser and opening a page — no point holding
  // a slot while the browser boots.
  await acquireRenderSlot();

  try {
    const instance = await ensureBrowser();
    const page = await instance.newPage();

    try {
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (["image", "font", "media", "stylesheet"].includes(request.resourceType())) {
          void route.abort();
          return;
        }

        // Re-validate every request host (initial document, redirects, subresources)
        // right before Chromium connects, so a redirect to an internal address can't
        // slip past the one-time check on the original URL.
        try {
          await validateSsrfSafeUrl(request.url());
        } catch {
          void route.abort();
          return;
        }

        void route.continue();
      });

      // Wait only for the navigation to commit (server response received), not for
      // DOMContentLoaded. Heavy retail SPAs (e.g. Farfetch) load a script that blocks
      // the parser so DOMContentLoaded never fires within the timeout, yet the
      // server-rendered HTML — title/OpenGraph/JSON-LD, all the parser reads — is already
      // present at commit. Give the DOM a brief grace period for client-rendered pages,
      // but never hang on the ones whose DOMContentLoaded never arrives.
      await page.goto(url, {
        waitUntil: "commit",
        timeout: 12_000
      });
      await page.waitForLoadState("domcontentloaded", { timeout: 3_000 }).catch(() => {});

      return await page.content();
    } finally {
      await page.close();
    }
  } finally {
    releaseRenderSlot();
  }
}
