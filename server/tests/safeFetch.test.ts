import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveSafeUrl, undiciFetch } = vi.hoisted(() => ({
  resolveSafeUrl: vi.fn(),
  undiciFetch: vi.fn()
}));

vi.mock("../src/utils/ssrf", () => ({ resolveSafeUrl }));
vi.mock("undici", () => ({
  fetch: undiciFetch,
  // Capture the connect.lookup so tests can observe which IP the fetch was pinned to.
  Agent: class {
    lookup?: (h: string, o: unknown, cb: (e: unknown, a: string, f: number) => void) => void;
    constructor(opts?: { connect?: { lookup?: MockAgent["lookup"] } }) {
      this.lookup = opts?.connect?.lookup;
    }
    async close() {}
  }
}));

import { safeFetch } from "../src/utils/safeFetch";

type MockAgent = { lookup?: (h: string, o: unknown, cb: (e: unknown, a: string, f: number) => void) => void };

// Read the IP the dispatcher is currently pinned to (the value the lookup callback returns).
function pinnedAddressOf(opts: { dispatcher?: MockAgent }): string {
  let addr = "";
  opts.dispatcher?.lookup?.("host", {}, (_e, a) => {
    addr = a;
  });
  return addr;
}

function fakeResponse(status: number, headers: Record<string, string> = {}, body = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    body: { cancel: async () => {} },
    text: async () => body
  };
}

function connErr(code: string) {
  return Object.assign(new Error("fetch failed"), { cause: { code } });
}

function target(url: string, addresses: Array<{ address: string; family: 4 | 6 }>) {
  return { url: new URL(url), address: addresses[0].address, family: addresses[0].family, addresses };
}

describe("safeFetch", () => {
  beforeEach(() => {
    resolveSafeUrl.mockReset();
    undiciFetch.mockReset();
  });

  it("re-validates each hop and rejects a redirect to a blocked address", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) => {
      if (u.includes("internal")) {
        throw new Error("URL resolves to a disallowed internal address.");
      }
      return target(u, [{ address: "93.184.216.34", family: 4 }]);
    });
    undiciFetch.mockResolvedValueOnce(fakeResponse(302, { location: "http://internal.test/x" }));

    await expect(safeFetch("https://public.test/start")).rejects.toThrow(/disallowed/i);
    expect(resolveSafeUrl).toHaveBeenCalledWith("https://public.test/start");
    expect(resolveSafeUrl).toHaveBeenCalledWith("http://internal.test/x");
  });

  it("follows a public redirect and returns the final body", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) =>
      target(u, [{ address: "93.184.216.34", family: 4 }])
    );
    undiciFetch
      .mockResolvedValueOnce(fakeResponse(301, { location: "https://public.test/final" }))
      .mockResolvedValueOnce(fakeResponse(200, {}, "<html>ok</html>"));

    const result = await safeFetch("http://public.test/start");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.text).toBe("<html>ok</html>");
  });

  it("enforces the redirect cap", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) =>
      target(u, [{ address: "1.1.1.1", family: 4 }])
    );
    undiciFetch.mockResolvedValue(fakeResponse(302, { location: "https://public.test/next" }));

    await expect(safeFetch("https://public.test/loop")).rejects.toThrow(/redirect/i);
  });

  it("(a) falls back to the next vetted IP when the first connection is refused", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    undiciFetch
      .mockRejectedValueOnce(connErr("ECONNREFUSED"))
      .mockResolvedValueOnce(fakeResponse(200, {}, "ok"));

    const result = await safeFetch("https://public.test/x");
    expect(result.text).toBe("ok");
    expect(undiciFetch).toHaveBeenCalledTimes(2);
  });

  it("(b) throws the last connection error when every vetted IP fails", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    const last = connErr("ETIMEDOUT");
    undiciFetch.mockRejectedValueOnce(connErr("ECONNREFUSED")).mockRejectedValueOnce(last);

    await expect(safeFetch("https://public.test/x")).rejects.toBe(last);
    expect(undiciFetch).toHaveBeenCalledTimes(2);
  });

  it("(c) does not try other IPs on an AbortError", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    undiciFetch.mockRejectedValueOnce(abort).mockResolvedValueOnce(fakeResponse(200));

    await expect(safeFetch("https://public.test/x")).rejects.toBe(abort);
    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("(d) returns an HTTP 404 without retrying other IPs", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    undiciFetch.mockResolvedValueOnce(fakeResponse(404, {}, "nope"));

    const result = await safeFetch("https://public.test/x");
    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("(e) follows a 3xx via the outer hop loop, not the inner IP loop", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) =>
      target(u, [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    undiciFetch
      .mockResolvedValueOnce(fakeResponse(301, { location: "https://public.test/final" }))
      .mockResolvedValueOnce(fakeResponse(200, {}, "done"));

    const result = await safeFetch("https://public.test/start");
    expect(result.text).toBe("done");
    // redirect + final = 2 fetches; NOT a second IP attempt on the first hop
    expect(undiciFetch).toHaveBeenCalledTimes(2);
    expect(resolveSafeUrl).toHaveBeenCalledTimes(2); // one resolution per hop
  });

  it("(f) propagates a TLS/cert error immediately without trying other IPs", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    const tls = connErr("ERR_TLS_CERT_ALTNAME_INVALID");
    undiciFetch.mockRejectedValueOnce(tls).mockResolvedValueOnce(fakeResponse(200));

    await expect(safeFetch("https://public.test/x")).rejects.toBe(tls);
    expect(undiciFetch).toHaveBeenCalledTimes(1);
  });

  it("(g) resolves each hop exactly once even when falling back across IPs", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 },
        { address: "3.3.3.3", family: 4 }
      ])
    );
    undiciFetch
      .mockRejectedValueOnce(connErr("ECONNREFUSED"))
      .mockRejectedValueOnce(connErr("EHOSTUNREACH"))
      .mockResolvedValueOnce(fakeResponse(200, {}, "ok"));

    await safeFetch("https://public.test/x");
    expect(resolveSafeUrl).toHaveBeenCalledTimes(1); // one hop, 3 IP attempts
    expect(undiciFetch).toHaveBeenCalledTimes(3);
  });

  it("(h) advances the pin to the next IP on retry", async () => {
    resolveSafeUrl.mockResolvedValue(
      target("https://public.test/x", [
        { address: "1.1.1.1", family: 4 },
        { address: "2.2.2.2", family: 4 }
      ])
    );
    const pins: string[] = [];
    undiciFetch.mockImplementation(async (_url: string, opts: { dispatcher?: MockAgent }) => {
      pins.push(pinnedAddressOf(opts));
      if (pins.length === 1) {
        throw connErr("ECONNREFUSED");
      }
      return fakeResponse(200, {}, "ok");
    });

    await safeFetch("https://public.test/x");
    expect(pins).toEqual(["1.1.1.1", "2.2.2.2"]);
  });

  it("(i) caps connection attempts at MAX_CANDIDATE_IPS (4) even with more vetted IPs", async () => {
    resolveSafeUrl.mockResolvedValue(
      target(
        "https://public.test/x",
        Array.from({ length: 8 }, (_, i) => ({ address: `9.9.9.${i}`, family: 4 as const }))
      )
    );
    undiciFetch.mockRejectedValue(connErr("ECONNREFUSED"));

    await expect(safeFetch("https://public.test/x")).rejects.toBeDefined();
    // 8 vetted IPs available, but only the first 4 are dialed.
    expect(undiciFetch).toHaveBeenCalledTimes(4);
  });
});
