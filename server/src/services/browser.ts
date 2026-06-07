import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function ensureBrowser(): Promise<Browser> {
  if (browser) {
    return browser;
  }

  if (!browserPromise) {
    browserPromise = chromium
      .launch({ headless: true })
      .then((instance) => {
        browser = instance;
        return instance;
      })
      .finally(() => {
        browserPromise = null;
      });
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
}

export async function fetchRenderedHtml(url: string): Promise<string> {
  const instance = await ensureBrowser();
  const page = await instance.newPage();

  try {
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media", "stylesheet"].includes(type)) {
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
