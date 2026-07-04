import { describe, it, expect } from "vitest";
import {
  FRESHNESS_THRESHOLD_MS,
  hasRefreshableUrl,
  isStale
} from "../../shared/staleness";

describe("hasRefreshableUrl", () => {
  it("accepts http and https URLs", () => {
    expect(hasRefreshableUrl("https://example.com/p")).toBe(true);
    expect(hasRefreshableUrl("http://example.com/p")).toBe(true);
  });

  it("rejects empty, null, and non-http schemes", () => {
    expect(hasRefreshableUrl(null)).toBe(false);
    expect(hasRefreshableUrl(undefined)).toBe(false);
    expect(hasRefreshableUrl("")).toBe(false);
    expect(hasRefreshableUrl("ftp://example.com")).toBe(false);
    expect(hasRefreshableUrl("/relative/path")).toBe(false);
  });
});

describe("isStale", () => {
  const url = "https://example.com/p";

  it("is never stale without a refreshable URL", () => {
    expect(isStale(null, null)).toBe(false);
    expect(isStale(new Date(Date.now() - 10 * FRESHNESS_THRESHOLD_MS), "/local")).toBe(false);
  });

  it("is stale when it has a URL but was never checked", () => {
    expect(isStale(null, url)).toBe(true);
  });

  it("is fresh when checked within the threshold", () => {
    const recent = new Date(Date.now() - FRESHNESS_THRESHOLD_MS / 2);
    expect(isStale(recent, url)).toBe(false);
    expect(isStale(recent.toISOString(), url)).toBe(false);
  });

  it("is stale when checked longer ago than the threshold", () => {
    const old = new Date(Date.now() - FRESHNESS_THRESHOLD_MS - 60_000);
    expect(isStale(old, url)).toBe(true);
    expect(isStale(old.toISOString(), url)).toBe(true);
  });
});
