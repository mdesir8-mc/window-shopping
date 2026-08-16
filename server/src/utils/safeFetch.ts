import { fetch, Agent } from "undici";
import type { LookupOptions } from "node:dns";
import { resolveSafeUrl } from "./ssrf";

const MAX_REDIRECTS = 5;

// Cap how many vetted IPs we actually attempt per hop. The point of the fallback is anycast
// reachability (real CDN answers are ~2-5 IPs, IPv4-first), not exhaustive dialing. Capping
// bounds the outbound connection fan-out a hostname with an attacker-inflated DNS answer can
// induce, independent of the caller's overall timeout.
const MAX_CANDIDATE_IPS = 4;

// Node/undici error codes meaning "this specific IP was unreachable" — safe to retry against
// another pre-vetted IP from the same frozen set. Anything NOT listed (TLS/cert failures,
// aborts, unknown causes) must propagate: retrying past a handshake or certificate error would
// erode connection integrity and could mask a MITM.
const RETRYABLE_CONNECT_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ECONNRESET",
  "EAI_AGAIN",
  "ERR_INVALID_IP_ADDRESS"
]);

function isRetryableConnectError(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "AbortError") {
    return false;
  }
  const code =
    (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code;
  return code !== undefined && RETRYABLE_CONNECT_CODES.has(code);
}

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
      // undici calls this with `{ all: true }`, which per the dns.lookup contract
      // means the callback must hand back an ARRAY of {address, family} — passing
      // the bare (address, family) form makes undici reject it with
      // ERR_INVALID_IP_ADDRESS and every request fails at connect. Both shapes are
      // honoured here so the pin works whichever way the caller asks.
      lookup: (
        _hostname: string,
        options: LookupOptions,
        callback: (
          err: NodeJS.ErrnoException | null,
          address: string | Array<{ address: string; family: number }>,
          family?: number
        ) => void
      ) => {
        if (options?.all) {
          callback(null, [{ address: pinnedAddress, family: pinnedFamily }]);
          return;
        }

        callback(null, pinnedAddress, pinnedFamily);
      }
    }
  });

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const target = await resolveSafeUrl(current);

      // Try each pre-vetted IP in turn, pinning to one at a time. Every candidate already
      // passed the SSRF allow-check in resolveSafeUrl, and the set is frozen for this hop (no
      // re-resolution), so this preserves the DNS-rebinding guarantee while surviving anycast
      // hosts whose first IP is unreachable from this network. MUST stay sequential:
      // pinnedAddress/pinnedFamily are shared closure vars read by the dispatcher's lookup, so
      // parallelizing the attempts would race the pin — do not parallelize this loop.
      let response: Awaited<ReturnType<typeof fetch>> | undefined;
      let lastError: unknown;
      for (const candidate of target.addresses.slice(0, MAX_CANDIDATE_IPS)) {
        pinnedAddress = candidate.address;
        pinnedFamily = candidate.family;
        try {
          response = await fetch(target.url, {
            method: "GET",
            headers: init.headers,
            signal: init.signal,
            redirect: "manual",
            dispatcher
          });
          break;
        } catch (error) {
          if (isRetryableConnectError(error)) {
            lastError = error;
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError ?? new Error("safeFetch: no vetted address could be reached");
      }

      // A settled response means the connection worked. Redirect extraction and body read run
      // OUTSIDE the per-IP loop: once headers are in, the socket is good, so a mid-body error
      // must propagate rather than re-drive a second fetch to another IP.
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
