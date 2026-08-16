import { SCOPE_DESCRIPTIONS } from "./config";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; background: #f6f5f3; color: #1c1917;
    font: 16px/1.5 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .card {
    width: 100%; max-width: 440px; background: #fff; border: 1px solid #e7e5e4;
    border-radius: 16px; padding: 32px; box-shadow: 0 12px 32px rgba(28,25,23,.07);
  }
  h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: -.01em; }
  .sub { margin: 0 0 8px; color: #78716c; font-size: 14px; }
  .claim { margin: 0 0 24px; color: #a8a29e; font-size: 12px; }
  .host { font-weight: 600; color: #1c1917; word-break: break-all; }
  ul { list-style: none; margin: 0 0 24px; padding: 0; border-top: 1px solid #f5f5f4; }
  li { padding: 12px 0; border-bottom: 1px solid #f5f5f4; font-size: 14px; display: flex; gap: 10px; }
  li::before { content: "✓"; color: #16a34a; font-weight: 700; }
  .account { margin: 0 0 24px; padding: 12px 14px; background: #fafaf9; border-radius: 10px; font-size: 13px; color: #57534e; }
  .actions { display: flex; gap: 10px; }
  button { flex: 1; padding: 12px 16px; font: inherit; font-weight: 600; font-size: 14px; border-radius: 10px; cursor: pointer; }
  .allow { border: none; background: #1c1917; color: #fff; }
  .deny { border: 1px solid #d6d3d1; background: #fff; color: #44403c; }
  .warn { margin: 0 0 20px; padding: 12px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 13px; color: #92400e; }
  .err { color: #b91c1c; }
  @media (prefers-color-scheme: dark) {
    body { background: #1c1917; color: #f5f5f4; }
    .card { background: #292524; border-color: #44403c; }
    .host, h1 { color: #f5f5f4; }
    .sub, .account { color: #a8a29e; }
    .claim { color: #78716c; }
    .account { background: #1c1917; }
    ul, li { border-color: #44403c; }
    .allow { background: #f5f5f4; color: #1c1917; }
    .deny { background: #292524; border-color: #57534e; color: #d6d3d1; }
    .warn { background: #292524; border-color: #78350f; color: #fcd34d; }
  }
`;

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body><div class="card">${body}</div></body>
</html>`;
}

export function renderConsentPage(input: {
  displayHost: string;
  clientName: string;
  scopes: string[];
  userEmail: string;
  redirectUri: string;
  signedRequest: string;
  isLoopbackRedirect: boolean;
}): string {
  const permissions = input.scopes
    .map((scope) => `<li>${escapeHtml(SCOPE_DESCRIPTIONS[scope] ?? scope)}</li>`)
    .join("");

  // The MCP spec requires the redirect host to be visible, with an extra warning
  // when the only callback is loopback — any local process can claim that port.
  const loopbackWarning = input.isLoopbackRedirect
    ? `<p class="warn">This app redirects to <strong>${escapeHtml(
        input.redirectUri
      )}</strong> on this computer. Only continue if you just started it yourself.</p>`
    : "";

  return page(
    "Authorize access",
    `
    <h1>Connect to Window Shopping</h1>
    <p class="sub"><span class="host">${escapeHtml(input.displayHost)}</span> wants access to your closets.</p>
    <p class="claim">It calls itself &ldquo;${escapeHtml(input.clientName)}&rdquo;. Only the address above is verified.</p>
    ${loopbackWarning}
    <ul>${permissions}</ul>
    <p class="account">Signed in as ${escapeHtml(input.userEmail)}</p>
    <form method="post" action="/oauth/authorize">
      <input type="hidden" name="request" value="${escapeHtml(input.signedRequest)}">
      <div class="actions">
        <button class="deny" type="submit" name="decision" value="deny">Deny</button>
        <button class="allow" type="submit" name="decision" value="allow">Allow</button>
      </div>
    </form>
  `
  );
}

export function renderErrorPage(message: string): string {
  return page(
    "Authorization error",
    `<h1 class="err">Authorization failed</h1><p class="sub">${escapeHtml(message)}</p>`
  );
}
