import { parsePriceToNumber } from "../lib/format";
import type { Item } from "../types";

export interface ClosetStats {
  totalValue: number;
  onSaleCount: number;
  outOfStockCount: number;
}

/**
 * Pure derivation of the closet summary stats shown in the header.
 * Extracted from ClosetDetail so it can be unit-tested without a render.
 */
export function computeClosetStats(items: Item[]): ClosetStats {
  return {
    totalValue: items.reduce((sum, item) => sum + parsePriceToNumber(item.price), 0),
    onSaleCount: items.filter((item) => item.onSale).length,
    outOfStockCount: items.filter((item) => item.inStock === false).length
  };
}
