import { describe, it, expect, vi, beforeEach } from "vitest";
import { lookup } from "node:dns/promises";
import { resolveSafeUrl, validateSsrfSafeUrl } from "../src/utils/ssrf";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
const mockedLookup = vi.mocked(lookup);

function resolvesTo(address: string, family = address.includes(":") ? 6 : 4) {
  mockedLookup.mockResolvedValue([{ address, family }] as never);
}

describe("resolveSafeUrl", () => {
  beforeEach(() => mockedLookup.mockReset());

  it("allows a public IPv4 host and returns the vetted IP", async () => {
    resolvesTo("93.184.216.34");
    const target = await resolveSafeUrl("https://example.com/p?x=1");
    expect(target.address).toBe("93.184.216.34");
    expect(target.family).toBe(4);
    expect(target.url.href).toBe("https://example.com/p?x=1");
  });

  it.each([
    ["loopback", "127.0.0.1"],
    ["private 10/8", "10.1.2.3"],
    ["link-local / metadata", "169.254.169.254"],
    ["private 192.168", "192.168.0.5"],
    ["CGNAT 100.64/10", "100.64.1.1"],
  ])("blocks %s", async (_label, ip) => {
    resolvesTo(ip);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
  });

  it("blocks IPv6 loopback and unique-local (fc00::/7)", async () => {
    resolvesTo("::1", 6);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
    resolvesTo("fd00::1", 6);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
  });

  it("blocks IPv4-mapped IPv6 metadata (::ffff:169.254.169.254)", async () => {
    resolvesTo("::ffff:169.254.169.254", 6);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
  });

  it("blocks IPv6 unspecified (::) and expanded loopback (0:0:0:0:0:0:0:1)", async () => {
    resolvesTo("::", 6);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
    resolvesTo("0:0:0:0:0:0:0:1", 6);
    await expect(resolveSafeUrl("https://evil.test/")).rejects.toThrow(/disallowed/i);
  });

  it("rejects non-http(s) schemes without resolving", async () => {
    await expect(resolveSafeUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(resolveSafeUrl("gopher://x/")).rejects.toThrow();
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it("rejects if ANY resolved address is internal", async () => {
    mockedLookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 }
    ] as never);
    await expect(resolveSafeUrl("https://example.com/")).rejects.toThrow(/disallowed/i);
  });

  it("validateSsrfSafeUrl returns a URL for allowed hosts", async () => {
    resolvesTo("93.184.216.34");
    const url = await validateSsrfSafeUrl("https://example.com/p");
    expect(url).toBeInstanceOf(URL);
    expect(url.hostname).toBe("example.com");
  });
});
