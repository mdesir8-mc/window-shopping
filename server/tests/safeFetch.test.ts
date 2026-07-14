import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveSafeUrl, undiciFetch, agentInstances } = vi.hoisted(() => ({
  resolveSafeUrl: vi.fn(),
  undiciFetch: vi.fn(),
  agentInstances: [] as Array<{
    opts: {
      connect?: {
        lookup?: (
          hostname: string,
          options: unknown,
          callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
        ) => void;
      };
    };
    closed: boolean;
  }>
}));

vi.mock("../src/utils/ssrf", () => ({ resolveSafeUrl }));
vi.mock("undici", () => ({
  fetch: undiciFetch,
  Agent: class {
    closed = false;

    constructor(public opts: unknown) {
      agentInstances.push(this as (typeof agentInstances)[number]);
    }

    async close() {
      this.closed = true;
    }
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

async function lookupPinnedAddress(index: number) {
  const lookup = agentInstances[index].opts.connect?.lookup;
  if (!lookup) {
    throw new Error("missing pinned lookup");
  }

  return new Promise<{ address: string; family: number }>((resolve, reject) => {
    lookup("public.test", {}, (err, address, family) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({ address, family });
    });
  });
}

describe("safeFetch", () => {
  beforeEach(() => {
    resolveSafeUrl.mockReset();
    undiciFetch.mockReset();
    agentInstances.length = 0;
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

  it("tries the next vetted IP when the pinned connection fails", async () => {
    resolveSafeUrl.mockResolvedValue({
      url: new URL("https://public.test/item"),
      address: "203.0.113.10",
      family: 4,
      addresses: [
        { address: "203.0.113.10", family: 4 },
        { address: "203.0.113.11", family: 4 }
      ]
    });
    undiciFetch
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(fakeResponse(200, {}, "<html>ok</html>"));

    const result = await safeFetch("https://public.test/item");

    expect(result.text).toBe("<html>ok</html>");
    expect(undiciFetch).toHaveBeenCalledTimes(2);
    await expect(lookupPinnedAddress(0)).resolves.toEqual({ address: "203.0.113.10", family: 4 });
    await expect(lookupPinnedAddress(1)).resolves.toEqual({ address: "203.0.113.11", family: 4 });
    expect(agentInstances.every((agent) => agent.closed)).toBe(true);
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
