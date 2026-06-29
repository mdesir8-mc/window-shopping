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

export async function fetchRenderedHtml(url: string): Promise<string> {
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

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 12_000
    });

    return await page.content();
  } finally {
    await page.close();
  }
}
