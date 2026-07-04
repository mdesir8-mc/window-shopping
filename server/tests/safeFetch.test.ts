import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveSafeUrl, undiciFetch } = vi.hoisted(() => ({
  resolveSafeUrl: vi.fn(),
  undiciFetch: vi.fn()
}));

vi.mock("../src/utils/ssrf", () => ({ resolveSafeUrl }));
vi.mock("undici", () => ({
  fetch: undiciFetch,
  Agent: class {
    async close() {}
  }
}));

import { safeFetch } from "../src/utils/safeFetch";

function fakeResponse(status: number, headers: Record<string, string> = {}, body = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
    body: { cancel: async () => {} },
    text: async () => body
  };
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
      return { url: new URL(u), address: "93.184.216.34", family: 4 };
    });
    undiciFetch.mockResolvedValueOnce(fakeResponse(302, { location: "http://internal.test/x" }));

    await expect(safeFetch("https://public.test/start")).rejects.toThrow(/disallowed/i);
    expect(resolveSafeUrl).toHaveBeenCalledWith("https://public.test/start");
    expect(resolveSafeUrl).toHaveBeenCalledWith("http://internal.test/x");
  });

  it("follows a public redirect and returns the final body", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) => ({
      url: new URL(u),
      address: "93.184.216.34",
      family: 4
    }));
    undiciFetch
      .mockResolvedValueOnce(fakeResponse(301, { location: "https://public.test/final" }))
      .mockResolvedValueOnce(fakeResponse(200, {}, "<html>ok</html>"));

    const result = await safeFetch("http://public.test/start");
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.text).toBe("<html>ok</html>");
  });

  it("enforces the redirect cap", async () => {
    resolveSafeUrl.mockImplementation(async (u: string) => ({
      url: new URL(u),
      address: "1.1.1.1",
      family: 4
    }));
    undiciFetch.mockResolvedValue(fakeResponse(302, { location: "https://public.test/next" }));

    await expect(safeFetch("https://public.test/loop")).rejects.toThrow(/redirect/i);
  });
});
