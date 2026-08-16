/**
 * Reads a post-login destination from `?next=`.
 *
 * The OAuth consent page at /oauth/authorize sends unauthenticated users here,
 * and needs them sent back afterwards. Anything that is not a same-origin
 * absolute path is rejected so the parameter cannot be used as an open redirect:
 * a scheme ("https://evil.com"), a protocol-relative path ("//evil.com"), and the
 * backslash form ("/\evil.com", which some browsers normalise to the latter) all
 * return null.
 */
export function safeNextPath(search: string): string | null {
  const raw = new URLSearchParams(search).get("next");

  if (!raw || !raw.startsWith("/")) {
    return null;
  }

  // Resolve against our own origin and compare, rather than pattern-matching the
  // raw string. Prefix checks are not enough: the URL parser strips tab, CR, and
  // LF before parsing, so "/\t/evil.com" starts with a single slash but resolves
  // to https://evil.com/. Parsing first means normalisation happens before the
  // origin check, not after it.
  let target: URL;
  try {
    target = new URL(raw, window.location.origin);
  } catch {
    return null;
  }

  if (target.origin !== window.location.origin) {
    return null;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

/**
 * Sends the user to their post-login destination. `next` targets are server
 * routes (the OAuth consent page), not React Router routes, so they need a full
 * page load rather than a client-side navigation.
 */
export function goToPostLoginTarget(
  search: string,
  fallback: string,
  navigate: (path: string) => void
): void {
  const next = safeNextPath(search);

  if (next) {
    window.location.assign(next);
    return;
  }

  navigate(fallback);
}
