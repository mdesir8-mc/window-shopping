// Single source of truth for item-freshness logic, shared by web, server, and mobile.
// An item is "stale" when it has a refreshable (http/https) URL and either has never
// been checked or was last checked longer ago than FRESHNESS_THRESHOLD_MS.

export const FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function hasRefreshableUrl(url?: string | null): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function isStale(lastCheckedAt: string | Date | null, url?: string | null): boolean {
  if (!hasRefreshableUrl(url)) {
    return false;
  }

  return (
    !lastCheckedAt || Date.now() - new Date(lastCheckedAt).getTime() > FRESHNESS_THRESHOLD_MS
  );
}
