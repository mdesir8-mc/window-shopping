import { describe, expect, it } from "vitest";
import { isMarkedDown } from "./format";

describe("isMarkedDown", () => {
  it("is true only when a parseable price sits below a parseable original", () => {
    expect(isMarkedDown("$220.00", "$320.00")).toBe(true);
    expect(isMarkedDown("$1,299", "$1,499")).toBe(true);
  });

  it("is false when the prices are equal or inverted", () => {
    expect(isMarkedDown("$320.00", "$320.00")).toBe(false);
    expect(isMarkedDown("$320.00", "$220.00")).toBe(false);
  });

  it("is false when either side is missing", () => {
    expect(isMarkedDown("$220.00", null)).toBe(false);
    expect(isMarkedDown(null, "$320.00")).toBe(false);
    expect(isMarkedDown(undefined, undefined)).toBe(false);
  });

  // The guard that matters: parsePriceToNumber returns 0 for junk, so a bare `<` would
  // report a markdown whenever the current price failed to parse.
  it("is false when either side is unparseable", () => {
    expect(isMarkedDown("Sold out", "$320.00")).toBe(false);
    expect(isMarkedDown("$220.00", "Was on sale")).toBe(false);
    expect(isMarkedDown("1.2.3", "$320.00")).toBe(false);
    expect(isMarkedDown("", "$320.00")).toBe(false);
  });
});
