import http from "node:http";
import net from "node:net";
import { assertAllowedAddress, resolveSafeHost } from "../utils/ssrf";

// Localhost proxy that Chromium routes all traffic through. It performs SSRF validation AND
// the upstream connection in one place, pinned to the vetted IP — closing the DNS-rebinding
// TOCTOU that exists when validation and connection use two separate resolvers.
//
// Residual risk: Chromium's DNS-prefetch/speculative-connect cache is outside this proxy's
// control. The proxy closes the connection-pinning gap; a sub-TTL rebinding could in theory
// pre-warm Chromium's cache, but in the normal rebinding model the CONNECT arrives after TTL
// expiry, so this is residual theoretical risk, not a practical bypass.

let server: http.Server | null = null;

// Resolve a target host to a vetted IP. IP literals are validated directly (no DNS round-trip);
// hostnames go through resolveSafeHost. Throws if the target is disallowed.
async function vetTarget(host: string): Promise<{ address: string; family: 4 | 6 }> {
  const literalFamily = net.isIP(host);
  if (literalFamily) {
    assertAllowedAddress(host, literalFamily);
    return { address: host, family: literalFamily === 6 ? 6 : 4 };
  }
  return resolveSafeHost(host);
}

function handleConnect(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer): void {
  // CONNECT target is host:port. Bracket-aware so IPv6 literals ([::1]:443) parse correctly
  // instead of collapsing to a bogus host.
  const raw = req.url ?? "";
  let host: string;
  let portRaw: string | undefined;
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    host = raw.slice(1, end);
    portRaw = raw.slice(end + 2); // skip "]:"
  } else {
    const idx = raw.lastIndexOf(":");
    host = idx === -1 ? raw : raw.slice(0, idx);
    portRaw = idx === -1 ? undefined : raw.slice(idx + 1);
  }
  const port = Number(portRaw) || 443;

  void (async () => {
    let target: { address: string; family: 4 | 6 };
    try {
      target = await vetTarget(host);
    } catch {
      clientSocket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }

    const upstream = net.connect({ host: target.address, port }, () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });

    upstream.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
  })();
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  void (async () => {
    let parsed: URL;
    try {
      // In proxy mode req.url is absolute-form (http://host/path).
      parsed = new URL(req.url ?? "");
    } catch {
      res.writeHead(400).end();
      return;
    }

    let target: { address: string; family: 4 | 6 };
    try {
      target = await vetTarget(parsed.hostname);
    } catch {
      res.writeHead(403).end();
      return;
    }

    const upstream = http.request(
      {
        host: target.address,
        port: Number(parsed.port) || 80,
        method: req.method,
        path: parsed.pathname + parsed.search,
        headers: { ...req.headers, host: parsed.host }
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );

    upstream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end();
    });

    req.pipe(upstream);
  })();
}

// Start the proxy bound to loopback only (never 0.0.0.0 — must not be an open proxy).
// Idempotent: returns the existing port if already started.
export async function startSsrfProxy(): Promise<number> {
  if (server) {
    return (server.address() as net.AddressInfo).port;
  }

  const instance = http.createServer(handleRequest);
  instance.on("connect", handleConnect);

  await new Promise<void>((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(0, "127.0.0.1", () => {
      instance.removeListener("error", reject);
      resolve();
    });
  });

  server = instance;
  return (instance.address() as net.AddressInfo).port;
}

export async function stopSsrfProxy(): Promise<void> {
  if (!server) {
    return;
  }
  const instance = server;
  server = null;
  await new Promise<void>((resolve) => instance.close(() => resolve()));
}
