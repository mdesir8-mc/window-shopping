import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted ensures these refs are available when vi.mock factories run (factories
// are hoisted to the top of the file before any other code).
const { validateSsrfSafeUrl, fetchRenderedHtml, safeFetch } = vi.hoisted(() => ({
  validateSsrfSafeUrl: vi.fn(async (url: string) => new URL(url)),
  fetchRenderedHtml: vi.fn<(url: string) => Promise<string>>(),
  safeFetch: vi.fn()
}));

// Mock ssrf so validateSsrfSafeUrl is a passthrough (no real DNS in tests).
vi.mock("../src/utils/ssrf", () => ({ validateSsrfSafeUrl }));

// Mock browser so headless Chromium is never launched in tests.
vi.mock("../src/services/browser", () => ({ fetchRenderedHtml }));

// Mock safeFetch so Shopify/WooCommerce probes (and amazon raw fetch) return 404
// without any real network activity.
vi.mock("../src/utils/safeFetch", () => ({ safeFetch }));

// Imports after mocks so the mocked modules are in place at init time.
import { fetchViaUnblocker, _resetUnblockerCap } from "../src/services/unblocker";
import { parseProductPage } from "../src/services/parser";

// Minimal JSON-LD product page — all three required fields (name, price, image) present
// so the AI enricher is never triggered.
const PRODUCT_HTML = `
<html><head>
  <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Silk Blouse",
      "image": ["https://cdn.therealreal.com/blouse.jpg"],
      "offers": { "@type": "Offer", "price": "450", "priceCurrency": "USD" }
    })}
  </script>
</head></html>
`;

// Shared reset for both describe blocks.
function resetAll() {
  _resetUnblockerCap();
  vi.unstubAllGlobals();
  validateSsrfSafeUrl.mockReset();
  validateSsrfSafeUrl.mockImplementation(async (url: string) => new URL(url));
  fetchRenderedHtml.mockReset();
  safeFetch.mockReset();
  // Shopify/WooCommerce probes hit safeFetch — return 404 so they resolve to null.
  safeFetch.mockResolvedValue({ status: 404, ok: false, text: "not found" });
  delete process.env.UNBLOCKER_API_URL;
  delete process.env.UNBLOCKER_API_KEY;
  delete process.env.UNBLOCKER_DAILY_CAP;
}

describe("fetchViaUnblocker (unit)", () => {
  beforeEach(resetAll);
  afterEach(() => vi.unstubAllGlobals());

  it("(a) returns null when env vars are unset", async () => {
    const result = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");
    expect(result).toBeNull();
  });

  it("(a) returns null when only one of the two env vars is set", async () => {
    process.env.UNBLOCKER_API_URL = "https://app.scrapingbee.com/api/v1/";
    const result = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");
    expect(result).toBeNull();
  });

  it("calls validateSsrfSafeUrl and forwards target URL to provider", async () => {
    process.env.UNBLOCKER_API_URL = "https://app.scrapingbee.com/api/v1/";
    process.env.UNBLOCKER_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    const result = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");

    expect(validateSsrfSafeUrl).toHaveBeenCalledWith("https://www.therealreal.com/products/blouse");
    expect(result).toBe(PRODUCT_HTML);

    const [calledUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    const parsed = new URL(calledUrl);
    expect(parsed.searchParams.get("url")).toBe("https://www.therealreal.com/products/blouse");
    expect(parsed.searchParams.get("api_key")).toBe("test-key");
    expect(parsed.searchParams.get("render_js")).toBe("true");
  });

  it("returns null when provider responds with a non-ok status", async () => {
    process.env.UNBLOCKER_API_URL = "https://app.scrapingbee.com/api/v1/";
    process.env.UNBLOCKER_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "" })
    );

    const result = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");
    expect(result).toBeNull();
  });

  it("(e) returns null once the daily cap is exceeded", async () => {
    process.env.UNBLOCKER_API_URL = "https://app.scrapingbee.com/api/v1/";
    process.env.UNBLOCKER_API_KEY = "test-key";
    process.env.UNBLOCKER_DAILY_CAP = "1";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    const r1 = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");
    const r2 = await fetchViaUnblocker("https://www.therealreal.com/products/blouse");

    expect(r1).not.toBeNull(); // within cap
    expect(r2).toBeNull();     // cap exceeded — no fetch
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe("parseProductPage — unblocker tier integration", () => {
  beforeEach(() => {
    resetAll();
    // Enable the unblocker for integration tests.
    process.env.UNBLOCKER_API_URL = "https://app.scrapingbee.com/api/v1/";
    process.env.UNBLOCKER_API_KEY = "test-key";
  });

  afterEach(() => vi.unstubAllGlobals());

  it("(b) routes a hard-wall host through the unblocker tier", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    await parseProductPage("https://www.therealreal.com/products/blouse");

    expect(fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    const [calledUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("url")).toContain("therealreal.com");
    expect(fetchRenderedHtml).not.toHaveBeenCalled();
  });

  it("(b) does NOT route a normal host through the unblocker tier", async () => {
    const mockGlobalFetch = vi.fn();
    vi.stubGlobal("fetch", mockGlobalFetch);
    fetchRenderedHtml.mockResolvedValue(PRODUCT_HTML);

    await parseProductPage("https://example.com/products/blouse");

    expect(mockGlobalFetch).not.toHaveBeenCalled();
    expect(fetchRenderedHtml).toHaveBeenCalled();
  });

  it("(b) also routes nordstrom.com through the unblocker tier", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    await parseProductPage("https://www.nordstrom.com/s/test-item/12345");

    expect(fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    const [calledUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get("url")).toContain("nordstrom.com");
  });

  it("(c) demoMode never triggers the unblocker tier", async () => {
    const mockGlobalFetch = vi.fn();
    vi.stubGlobal("fetch", mockGlobalFetch);

    // demoMode on a hard-wall host returns an empty-ish result rather than 502.
    const result = await parseProductPage("https://www.therealreal.com/products/blouse", {
      demoMode: true
    });

    expect(mockGlobalFetch).not.toHaveBeenCalled();
    expect(fetchRenderedHtml).not.toHaveBeenCalled();
    // Result is minimal (no JSON-LD available), but no error thrown.
    expect(result.source).toBe("therealreal.com");
  });

  it("(d) HTML from the unblocker feeds the generic JSON-LD extractor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    const result = await parseProductPage("https://www.therealreal.com/products/blouse");

    expect(result.name).toBe("Silk Blouse");
    expect(result.price).toBe("450");
    expect(result.currency).toBe("USD");
    expect(result.imageUrl).toBe("https://cdn.therealreal.com/blouse.jpg");
    expect(result.source).toBe("therealreal.com");
  });

  it("throws ParserFetchError when unblocker is disabled for a hard-wall host", async () => {
    // Disable unblocker — env vars removed by resetAll, but integration beforeEach re-enables them.
    // Remove them here explicitly to test the disabled path.
    delete process.env.UNBLOCKER_API_URL;
    delete process.env.UNBLOCKER_API_KEY;

    await expect(
      parseProductPage("https://www.therealreal.com/products/blouse")
    ).rejects.toThrow("Unblocker not configured or daily cap reached");
  });

  it("(e) throws ParserFetchError when the daily cap is exceeded for a hard-wall host", async () => {
    process.env.UNBLOCKER_DAILY_CAP = "1";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => PRODUCT_HTML })
    );

    // First parse consumes the cap.
    await parseProductPage("https://www.therealreal.com/products/blouse");

    // Second parse — cap exceeded.
    await expect(
      parseProductPage("https://www.therealreal.com/products/blouse")
    ).rejects.toThrow("Unblocker not configured or daily cap reached");
  });
});
