import { describe, it, expect } from "vitest";
import { csvCell } from "../src/utils/itemExport";

describe("csvCell — CSV formula injection", () => {
  it("neutralizes string cells that start with a formula trigger", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tx")).toBe("'\tx"); // tab triggers the guard; not in the wrap class
  });

  it("neutralizes a scraped-content formula even when it also needs quoting", () => {
    // a malicious product name with a comma still gets the apostrophe + wrapping
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
  });

  it("leaves safe string cells untouched", () => {
    expect(csvCell("Nice Jacket")).toBe("Nice Jacket");
    expect(csvCell("a,b")).toBe('"a,b"'); // still wraps on comma
  });

  it("does not mangle numbers or booleans (e.g. negative prices)", () => {
    expect(csvCell(-19.99)).toBe("-19.99");
    expect(csvCell(0)).toBe("0");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});
