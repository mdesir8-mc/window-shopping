import { lookup } from "node:dns/promises";
import { HttpError } from "./http";

// CIDR blocks that must not be reachable via user-supplied URLs.
const BLOCKED_CIDRS: Array<{ base: number; mask: number }> = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
].map((cidr) => {
  const [addr, bits] = cidr.split("/");
  const mask = bits === "32" ? 0xffffffff : ~((1 << (32 - Number(bits))) - 1) >>> 0;
  const base = addr.split(".").reduce((acc, octet) => (acc * 256 + Number(octet)) >>> 0, 0);
  return { base: base >>> 0, mask };
});

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const num = parts.reduce((acc, octet) => (acc * 256 + Number(octet)) >>> 0, 0) >>> 0;
  return BLOCKED_CIDRS.some(({ base, mask }) => (num & mask) >>> 0 === base);
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // Loopback and link-local
  return lower === "::1" || lower.startsWith("fe80:");
}

export async function validateSsrfSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "url must be a valid http or https URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError(400, "url must be a valid http or https URL.");
  }

  const hostname = url.hostname;
  let resolved: string;

  try {
    const result = await lookup(hostname);
    resolved = result.address;
  } catch {
    throw new HttpError(400, "url hostname could not be resolved.");
  }

  const family = resolved.includes(":") ? 6 : 4;

  if (family === 4 && isBlockedIpv4(resolved)) {
    throw new HttpError(400, "URL resolves to a disallowed internal address.");
  }

  if (family === 6 && isBlockedIpv6(resolved)) {
    throw new HttpError(400, "URL resolves to a disallowed internal address.");
  }

  return url;
}
