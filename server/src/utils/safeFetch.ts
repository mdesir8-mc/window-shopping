import { fetch, Agent } from "undici";
import type { LookupOptions } from "node:dns";
import { resolveSafeUrl } from "./ssrf";

const MAX_REDIRECTS = 5;

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  text: string;
}

interface SafeFetchInit {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Fetch a user-supplied URL with SSRF protection that survives redirects and DNS
// rebinding: every hop is re-validated by resolveSafeUrl, and each connection is
// pinned (via a custom DNS lookup) to the exact IP that was just vetted, so the
// hostname can't re-resolve to an internal address between check and connect.
export async function safeFetch(rawUrl: string, init: SafeFetchInit = {}): Promise<SafeFetchResult> {
  let current = rawUrl;
  let pinnedAddress = "";
  let pinnedFamily: 4 | 6 = 4;

  const dispatcher = new Agent({
    connect: {
      lookup: (
        _hostname: string,
        _options: LookupOptions,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
      ) => {
        callback(null, pinnedAddress, pinnedFamily);
      }
    }
  });

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const target = await resolveSafeUrl(current);
      pinnedAddress = target.address;
      pinnedFamily = target.family;

      const response = await fetch(target.url, {
        method: "GET",
        headers: init.headers,
        signal: init.signal,
        redirect: "manual",
        dispatcher
      });

      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel().catch(() => {});
        current = new URL(location, target.url).toString();
        continue;
      }

      const text = await response.text();
      return { status: response.status, ok: response.ok, text };
    }

    throw new Error(`Exceeded ${MAX_REDIRECTS} redirects`);
  } finally {
    await dispatcher.close();
  }
}
