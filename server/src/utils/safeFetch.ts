import { fetch, Agent } from "undici";
import type { LookupOptions } from "node:dns";
import { resolveSafeUrl, type SafeAddress, type SafeTarget } from "./ssrf";

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
// pinned (via a custom DNS lookup) to an IP from the vetted set, so the hostname
// can't re-resolve to an internal address between check and connect.
function createPinnedDispatcher(target: SafeAddress) {
  return new Agent({
    connect: {
      lookup: (
        _hostname: string,
        _options: LookupOptions,
        callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
      ) => {
        callback(null, target.address, target.family);
      }
    }
  });
}

function targetAddresses(target: SafeTarget): SafeAddress[] {
  return target.addresses?.length ? target.addresses : [{ address: target.address, family: target.family }];
}

function shouldRetryAddress(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return false;
  }

  return !(error instanceof Error && error.name === "AbortError");
}

async function fetchWithPinnedAddress(target: SafeTarget, address: SafeAddress, init: SafeFetchInit) {
  const dispatcher = createPinnedDispatcher(address);

  try {
    const response = await fetch(target.url, {
      method: "GET",
      headers: init.headers,
      signal: init.signal,
      redirect: "manual",
      dispatcher
    });
    return { dispatcher, response };
  } catch (error) {
    await dispatcher.close();
    throw error;
  }
}

export async function safeFetch(rawUrl: string, init: SafeFetchInit = {}): Promise<SafeFetchResult> {
  let current = rawUrl;

  redirects: for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const target = await resolveSafeUrl(current);
    const addresses = targetAddresses(target);
    let lastConnectionError: unknown;

    for (let index = 0; index < addresses.length; index += 1) {
      const address = addresses[index];
      let response: Awaited<ReturnType<typeof fetch>>;
      let dispatcher: Agent;

      try {
        ({ dispatcher, response } = await fetchWithPinnedAddress(target, address, init));
      } catch (error) {
        if (!shouldRetryAddress(error, init.signal) || index === addresses.length - 1) {
          throw error;
        }

        lastConnectionError = error;
        continue;
      }

      try {
        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location) {
          await response.body?.cancel().catch(() => {});
          current = new URL(location, target.url).toString();
          continue redirects;
        }

        const text = await response.text();
        return { status: response.status, ok: response.ok, text };
      } finally {
        await dispatcher.close();
      }
    }

    if (lastConnectionError) {
      throw lastConnectionError;
    }
  }

  throw new Error(`Exceeded ${MAX_REDIRECTS} redirects`);
}
