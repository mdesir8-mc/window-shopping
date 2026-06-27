import { describe, it, expect } from "vitest";
import { parsePriceToNumber } from "../../shared/price";

describe("parsePriceToNumber", () => {
  it("parses formatted currency strings", () => {
    expect(parsePriceToNumber("$1,299.00")).toBe(1299);
    expect(parsePriceToNumber("£49.99")).toBe(49.99);
    expect(parsePriceToNumber("1299")).toBe(1299);
  });

  it("returns 0 for empty, null, and unparseable input", () => {
    expect(parsePriceToNumber(null)).toBe(0);
    expect(parsePriceToNumber(undefined)).toBe(0);
    expect(parsePriceToNumber("")).toBe(0);
    expect(parsePriceToNumber("free")).toBe(0);
  });

  it("treats zero as 0", () => {
    expect(parsePriceToNumber("0")).toBe(0);
    expect(parsePriceToNumber("0.00")).toBe(0);
  });

  it("strips the sign from negative strings (real prices are never negative)", () => {
    // The non-numeric strip removes the leading "-", so "-5" parses as 5. Documented
    // so the >0 guard isn't mistaken for negative-handling.
    expect(parsePriceToNumber("-5")).toBe(5);
  });
});
