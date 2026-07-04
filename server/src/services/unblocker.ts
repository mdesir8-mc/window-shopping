import { validateSsrfSafeUrl } from "../utils/ssrf";

// Reference adapter: ScrapingBee
//
// Request shape (GET):
//   https://app.scrapingbee.com/api/v1/?api_key={key}&url={encodedTargetUrl}&render_js=true
//
// Set UNBLOCKER_API_URL to the full base endpoint (include trailing slash if needed by the
// provider), and UNBLOCKER_API_KEY to your API key.  The function appends api_key, url, and
// render_js as query parameters — this matches ScrapingBee's documented GET interface.
//
// For Zyte API (alternative): their extract endpoint uses a JSON POST body
//   { "url": "...", "httpResponseBody": true } with HTTP Basic auth (api_key as password).
//   That requires a different adapter; ScrapingBee's GET interface is used here.

const FETCH_TIMEOUT_MS = 30_000;

let _dayKey = "";
let _dayCount = 0;

// Read cap dynamically so tests can override UNBLOCKER_DAILY_CAP per-test without
// hitting the module-init timing problem (the module is imported before any test runs).
function getDailyCap(): number {
  return Number(process.env.UNBLOCKER_DAILY_CAP ?? 100);
}

export function withinUnblockerCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== _dayKey) {
    _dayKey = today;
    _dayCount = 0;
  }
  if (_dayCount >= getDailyCap()) {
    return false;
  }
  _dayCount += 1;
  return true;
}

// Reset counter state for test isolation — do not call in production code.
export function _resetUnblockerCap(): void {
  _dayKey = "";
  _dayCount = 0;
}

export async function fetchViaUnblocker(url: string): Promise<string | null> {
  const apiUrl = process.env.UNBLOCKER_API_URL?.trim();
  const apiKey = process.env.UNBLOCKER_API_KEY?.trim();
  if (!apiUrl || !apiKey) {
    return null;
  }

  if (!withinUnblockerCap()) {
    return null;
  }

  // SSRF defense-in-depth: validate the target URL before forwarding to the provider.
  // The route layer already calls validateSsrfSafeUrl, but this guard protects any
  // future caller of fetchViaUnblocker that might skip the route-level check.
  await validateSsrfSafeUrl(url);

  const endpoint = new URL(apiUrl);
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("render_js", "true");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
