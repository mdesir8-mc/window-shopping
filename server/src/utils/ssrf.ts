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
    lower === "::1" || // loopback
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") || // unique-local fc00::/7
    lower.startsWith("fd")
  );
}

function assertAllowedAddress(address: string, family: number): void {
  const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
  if (blocked) {
    throw new HttpError(400, "URL resolves to a disallowed internal address.");
  }
}

export interface SafeTarget {
  url: URL;
  address: string;
  family: 4 | 6;
}

// Resolve and validate a user-supplied URL, returning the parsed URL plus a single
// vetted IP to connect to. Callers should pin the connection to `address` so a second
// DNS resolution can't swap in an internal address (DNS rebinding). Every address the
// hostname resolves to must pass — not just the first.
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

  let resolved: Array<{ address: string; family: number }>;

  try {
    resolved = await lookup(url.hostname, { all: true });
  } catch {
    throw new HttpError(400, "url hostname could not be resolved.");
  }

  if (resolved.length === 0) {
    throw new HttpError(400, "url hostname could not be resolved.");
  }

  for (const { address, family } of resolved) {
    assertAllowedAddress(address, family);
  }

  const target = resolved[0];
  return { url, address: target.address, family: target.family === 6 ? 6 : 4 };
}

// Back-compat wrapper for callers that only need validation (the route-level early
// reject and the Playwright request guard).
export async function validateSsrfSafeUrl(rawUrl: string): Promise<URL> {
  return (await resolveSafeUrl(rawUrl)).url;
}

export type { LookupOptions };
