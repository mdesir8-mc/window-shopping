import { lookup } from "node:dns/promises";
import type { LookupOptions } from "node:dns";
import { HttpError } from "./http";

// CIDR blocks that must not be reachable via user-supplied URLs.
const BLOCKED_CIDRS: Array<{ base: number; mask: number }> = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10", // carrier-grade NAT
  "127.0.0.0/8",
  "169.254.0.0/16", // link-local, incl. cloud metadata 169.254.169.254
  "172.16.0.0/12",
  "192.168.0.0/16",
].map((cidr) => {
  const [addr, bits] = cidr.split("/");
  const mask = bits === "32" ? 0xffffffff : (~((1 << (32 - Number(bits))) - 1)) >>> 0;
  const base = addr.split(".").reduce((acc, octet) => (acc * 256 + Number(octet)) >>> 0, 0);
  return { base: base >>> 0, mask };
});

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const num = parts.reduce((acc, octet) => (acc * 256 + Number(octet)) >>> 0, 0) >>> 0;
  return BLOCKED_CIDRS.some(({ base, mask }) => ((num & mask) >>> 0) === base);
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — validate the embedded IPv4 instead.
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }

  return (
    lower === "::1" || // loopback (compressed)
    lower === "::" || // unspecified
    /^(?:0+:){7}0*1$/.test(lower) || // loopback (expanded, e.g. 0:0:0:0:0:0:0:1)
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") || // unique-local fc00::/7
    lower.startsWith("fd")
  );
}

export function assertAllowedAddress(address: string, family: number): void {
  const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
  if (blocked) {
    throw new HttpError(400, "URL resolves to a disallowed internal address.");
  }
}

export interface VettedAddress {
  address: string;
  family: 4 | 6;
}

export interface SafeTarget {
  url: URL;
  address: string;
  family: 4 | 6;
  addresses: VettedAddress[];
}

// Resolve a hostname and validate every address it maps to. Every resolved address must pass —
// not just the first. Returns the full validated set (IPv4-first), plus `address`/`family` =
// the first entry for callers that connect to a single IP. Callers pin the connection to a
// member of this set so a second DNS resolution can't swap in an internal address (DNS
// rebinding); the set is frozen here from ONE lookup — never re-resolve during connect.
export async function resolveSafeHost(
  hostname: string
): Promise<{ address: string; family: 4 | 6; addresses: VettedAddress[] }> {
  let resolved: Array<{ address: string; family: number }>;

  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new HttpError(400, "url hostname could not be resolved.");
  }

  if (resolved.length === 0) {
    throw new HttpError(400, "url hostname could not be resolved.");
  }

  for (const { address, family } of resolved) {
    assertAllowedAddress(address, family);
  }

  // Build the vetted set from the already-validated `resolved` array — NO second lookup(),
  // which would reopen the rebinding TOCTOU. IPv4 first: some host containers have no IPv6
  // egress, so connecting to an AAAA hangs until timeout; trying IPv4 first matches undici's
  // effective behavior. Stable sort keeps original order within each family. Every address
  // was validated above, so ordering never weakens the SSRF guard.
  const addresses: VettedAddress[] = resolved
    .map((entry) => ({ address: entry.address, family: (entry.family === 6 ? 6 : 4) as 4 | 6 }))
    .sort((a, b) => a.family - b.family);

  const [first] = addresses;
  return { address: first.address, family: first.family, addresses };
}

// Resolve and validate a user-supplied URL, returning the parsed URL plus the vetted IP set.
export async function resolveSafeUrl(rawUrl: string): Promise<SafeTarget> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "url must be a valid http or https URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError(400, "url must be a valid http or https URL.");
  }

  const { address, family, addresses } = await resolveSafeHost(url.hostname);
  return { url, address, family, addresses };
}

// Back-compat wrapper for callers that only need validation (the route-level early
// reject and the Playwright request guard).
export async function validateSsrfSafeUrl(rawUrl: string): Promise<URL> {
  return (await resolveSafeUrl(rawUrl)).url;
}

export type { LookupOptions };
