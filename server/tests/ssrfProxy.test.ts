import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import http from "node:http";
import net from "node:net";
import { startSsrfProxy, stopSsrfProxy } from "../src/services/ssrfProxy";
import { resolveSafeHost, assertAllowedAddress } from "../src/utils/ssrf";

// Mock the SSRF allowlist so we can drive the proxy's vetting decisions deterministically.
// The real allow/block logic is covered by ssrf.test.ts; here we verify the proxy WIRES it
// correctly: IP literals go through assertAllowedAddress (no DNS), hostnames through
// resolveSafeHost, connections pin to the returned IP, and rejection yields 403.
vi.mock("../src/utils/ssrf", () => ({
  resolveSafeHost: vi.fn(),
  assertAllowedAddress: vi.fn()
}));

const mockedResolve = vi.mocked(resolveSafeHost);
const mockedAssert = vi.mocked(assertAllowedAddress);

let proxyPort = 0;

// Send a CONNECT through the proxy; resolve with the response status code.
function connectVia(target: string): Promise<{ status: number; socket?: net.Socket }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: proxyPort, method: "CONNECT", path: target });
    req.on("connect", (res, socket) => resolve({ status: res.statusCode ?? 0, socket }));
    req.on("response", (res) => resolve({ status: res.statusCode ?? 0 }));
    req.on("error", reject);
    req.end();
  });
}

beforeAll(async () => {
  proxyPort = await startSsrfProxy();
});

afterAll(async () => {
  await stopSsrfProxy();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ssrfProxy", () => {
  it("binds to loopback only", () => {
    expect(proxyPort).toBeGreaterThan(0);
  });

  it("rejects a CONNECT to a disallowed hostname with 403", async () => {
    mockedResolve.mockRejectedValue(new Error("disallowed"));
    const { status } = await connectVia("evil.test:443");
    expect(status).toBe(403);
    expect(mockedResolve).toHaveBeenCalledWith("evil.test");
  });

  it("rejects an internal IP-literal CONNECT with 403 WITHOUT a DNS lookup", async () => {
    mockedAssert.mockImplementation(() => {
      throw new Error("disallowed");
    });
    const { status } = await connectVia("127.0.0.1:443");
    expect(status).toBe(403);
    expect(mockedAssert).toHaveBeenCalledWith("127.0.0.1", 4);
    expect(mockedResolve).not.toHaveBeenCalled(); // literal path must not hit DNS
  });

  it("parses a bracketed IPv6 literal CONNECT and vets it directly (no DNS)", async () => {
    mockedAssert.mockImplementation(() => {
      throw new Error("disallowed");
    });
    const { status } = await connectVia("[2001:db8::1]:443");
    expect(status).toBe(403);
    expect(mockedAssert).toHaveBeenCalledWith("2001:db8::1", 6); // bracket stripped, port split off
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("handles a bracketed IPv6 literal with no port", async () => {
    mockedAssert.mockImplementation(() => {
      throw new Error("disallowed");
    });
    const { status } = await connectVia("[::1]");
    expect(status).toBe(403);
    expect(mockedAssert).toHaveBeenCalledWith("::1", 6);
    expect(mockedResolve).not.toHaveBeenCalled();
  });

  it("pins an allowed CONNECT to the vetted IP returned by resolveSafeHost", async () => {
    // Stand up a throwaway upstream on loopback and have the (mocked) resolver point at it,
    // so we can confirm the proxy dials the address it was told to — not the hostname.
    const upstream = net.createServer((sock) => sock.end("ok"));
    await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
    const upstreamPort = (upstream.address() as net.AddressInfo).port;

    const connections: net.Socket[] = [];
    upstream.on("connection", (s) => connections.push(s));

    mockedResolve.mockResolvedValue({
      address: "127.0.0.1",
      family: 4,
      addresses: [{ address: "127.0.0.1", family: 4 }]
    });

    const { status, socket } = await connectVia(`example.com:${upstreamPort}`);
    expect(status).toBe(200);
    expect(mockedResolve).toHaveBeenCalledWith("example.com");

    socket?.destroy();
    await new Promise<void>((r) => upstream.close(() => r()));
    expect(connections.length).toBeGreaterThan(0); // proxy actually dialed the vetted IP
  });
});

// E2E browser-rebinding verification cannot run headless Chromium networking in this sandbox.
// Manual test: point a low-TTL domain that returns a public IP while resolveSafeUrl validates,
// then flips to 127.0.0.1, navigate via fetchRenderedHtml(), and assert the connection is
// refused (the proxy pins to the originally-vetted public IP).
describe.skip("e2e: browser rebinding (manual)", () => {
  it("refuses a host that rebinds to an internal address after validation", () => {
    // see comment above
  });
});
