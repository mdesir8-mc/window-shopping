import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track how many fake Chromium pages are open at once so we can assert the
// concurrency cap is never exceeded. Incremented on newPage(), decremented on
// page.close().
let inFlight = 0;
let maxInFlight = 0;
// Each blocked goto() parks its resolver here; the test releases them to let
// renders finish and free slots for queued callers.
let gotoResolvers: Array<() => void> = [];

function resetState() {
  inFlight = 0;
  maxInFlight = 0;
  gotoResolvers = [];
}

function makePage() {
  return {
    route: vi.fn(async () => {}),
    // Block until the test releases this resolver, so multiple renders sit
    // "in flight" simultaneously and the peak page count is observable.
    goto: vi.fn(() => new Promise<void>((resolve) => gotoResolvers.push(resolve))),
    waitForLoadState: vi.fn(async () => {}),
    content: vi.fn(async () => "<html></html>"),
    close: vi.fn(async () => {
      inFlight -= 1;
    })
  };
}

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return makePage();
      }),
      close: vi.fn(async () => {})
    }))
  }
}));

// Avoid spinning up the real SSRF proxy / DNS validation during the test.
vi.mock("../src/services/ssrfProxy", () => ({
  startSsrfProxy: vi.fn(async () => 12345),
  stopSsrfProxy: vi.fn(async () => {})
}));

vi.mock("../src/utils/ssrf", () => ({
  validateSsrfSafeUrl: vi.fn(async (url: string) => new URL(url))
}));

async function loadBrowser() {
  // browser.ts reads the concurrency env per call, so a plain import is enough —
  // no module reset needed between env variants.
  return import("../src/services/browser");
}

function releaseBlockedGotos() {
  const pending = gotoResolvers;
  gotoResolvers = [];
  pending.forEach((resolve) => resolve());
}

describe("fetchRenderedHtml concurrency cap", () => {
  beforeEach(() => {
    resetState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.BROWSER_RENDER_CONCURRENCY;
    delete process.env.BROWSER_RENDER_QUEUE_TIMEOUT_MS;
    delete process.env.BROWSER_RENDER_QUEUE_MAX;
  });

  it("never opens more Chromium pages than the configured cap", async () => {
    process.env.BROWSER_RENDER_CONCURRENCY = "2";
    const { fetchRenderedHtml } = await loadBrowser();

    // Fire 6 renders against a cap of 2. At most 2 reach newPage()/goto() at once;
    // the rest wait in the render queue.
    const renders = Array.from({ length: 6 }, (_, i) =>
      fetchRenderedHtml(`https://shop.example.com/item-${i}`)
    );

    // Drive to completion: yield so blocked renders register + handed-off renders
    // start, then release whatever is currently blocked. Repeat until all resolve.
    let settled = false;
    const all = Promise.all(renders).then(() => {
      settled = true;
    });
    for (let step = 0; step < 50 && !settled; step += 1) {
      await new Promise((r) => setTimeout(r, 0));
      releaseBlockedGotos();
    }
    await all;

    expect(maxInFlight).toBe(2);
    expect(inFlight).toBe(0);
  });

  it("fails fast when a queued caller waits past the queue timeout", async () => {
    process.env.BROWSER_RENDER_CONCURRENCY = "1";
    process.env.BROWSER_RENDER_QUEUE_TIMEOUT_MS = "20";
    const { fetchRenderedHtml } = await loadBrowser();

    // First render holds the only slot (blocked in goto).
    const held = fetchRenderedHtml("https://shop.example.com/held");
    // Second render must queue, then reject after the 20ms timeout.
    const queued = fetchRenderedHtml("https://shop.example.com/queued");

    await expect(queued).rejects.toThrow(/render slot/i);

    // Release the holder so the test cleans up.
    releaseBlockedGotos();
    await held;

    expect(maxInFlight).toBe(1);
  });

  it("rejects immediately once the wait queue is full instead of piling up", async () => {
    process.env.BROWSER_RENDER_CONCURRENCY = "1";
    process.env.BROWSER_RENDER_QUEUE_MAX = "1";
    // Long timeout so rejection can only come from the depth cap, not the timer.
    process.env.BROWSER_RENDER_QUEUE_TIMEOUT_MS = "10000";
    const { fetchRenderedHtml } = await loadBrowser();

    const held = fetchRenderedHtml("https://shop.example.com/held"); // takes the 1 slot
    const queued = fetchRenderedHtml("https://shop.example.com/queued"); // fills the queue (depth 1)
    const overflow = fetchRenderedHtml("https://shop.example.com/overflow"); // over cap → reject now

    await expect(overflow).rejects.toThrow(/queue is full/i);

    // Drain the survivors.
    releaseBlockedGotos();
    await new Promise((r) => setTimeout(r, 0));
    releaseBlockedGotos();
    await Promise.all([held, queued]);

    expect(maxInFlight).toBe(1);
  });
});
