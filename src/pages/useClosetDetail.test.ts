import { describe, expect, it } from "vitest";
import { computeClosetStats } from "./useClosetDetail";
import type { Item } from "../types";

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: "1",
    closetId: "c1",
    sectionId: null,
    brand: "Brand",
    name: "Item",
    price: null,
    targetPrice: null,
    originalPrice: null,
    currency: null,
    source: null,
    url: null,
    season: "Spring",
    tags: [],
    colors: [],
    description: null,
    note: null,
    imageUrl: null,
    favorited: false,
    lastCheckedAt: null,
    inStock: true,
    onSale: false,
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("computeClosetStats", () => {
  it("returns zeroed stats for an empty closet", () => {
    expect(computeClosetStats([])).toEqual({
      totalValue: 0,
      onSaleCount: 0,
      outOfStockCount: 0
    });
  });

  it("sums parseable prices and ignores unparseable/null ones", () => {
    const items = [
      makeItem({ price: "$1,299.00" }),
      makeItem({ price: "49.5" }),
      makeItem({ price: null }),
      makeItem({ price: "Sold out" })
    ];

    expect(computeClosetStats(items).totalValue).toBe(1348.5);
  });

  it("counts on-sale and out-of-stock items independently", () => {
    const items = [
      makeItem({ onSale: true, inStock: true }),
      makeItem({ onSale: true, inStock: false }),
      makeItem({ onSale: false, inStock: false }),
      makeItem({ onSale: false, inStock: null })
    ];

    const stats = computeClosetStats(items);
    expect(stats.onSaleCount).toBe(2);
    // inStock === false only; null must not count as out of stock
    expect(stats.outOfStockCount).toBe(2);
  });
});
