import { describe, expect, it } from "vitest";
import { safeNextPath } from "./nextParam";

describe("safeNextPath", () => {
  it("returns a same-origin absolute path", () => {
    expect(safeNextPath("?next=%2Foauth%2Fauthorize%3Fclient_id%3Dabc")).toBe("/oauth/authorize?client_id=abc");
  });

  it("returns null when no next param is present", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath("?foo=bar")).toBeNull();
  });

  it("rejects targets that would leave the origin", () => {
    expect(safeNextPath("?next=https%3A%2F%2Fevil.example.com")).toBeNull();
    // Protocol-relative — a browser reads this as a different host.
    expect(safeNextPath("?next=%2F%2Fevil.example.com")).toBeNull();
    // Some browsers normalise the backslash form into the protocol-relative one.
    expect(safeNextPath("?next=%2F%5Cevil.example.com")).toBeNull();
    expect(safeNextPath("?next=javascript%3Aalert(1)")).toBeNull();
    expect(safeNextPath("?next=oauth%2Fauthorize")).toBeNull();
  });

  it("rejects control characters the URL parser strips before parsing", () => {
    // new URL("/\t/evil.com", origin) resolves to https://evil.com/ — these start
    // with a single slash, so a prefix check alone lets them through.
    expect(safeNextPath("?next=%2F%09%2Fevil.example.com")).toBeNull();
    expect(safeNextPath("?next=%2F%0A%2Fevil.example.com")).toBeNull();
    expect(safeNextPath("?next=%2F%0D%2Fevil.example.com")).toBeNull();
    expect(safeNextPath("?next=%2F%09%5Cevil.example.com")).toBeNull();
  });

  it("keeps the query string and hash of a same-origin target", () => {
    expect(safeNextPath("?next=%2Foauth%2Fauthorize%3Fa%3Db%23frag")).toBe("/oauth/authorize?a=b#frag");
  });
});
