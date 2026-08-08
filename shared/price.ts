// Single source of truth for turning a display price string ("$1,299.00") into a
// comparable number. Strips non-numeric characters; treats anything not a positive
// finite number as 0.

export function parsePriceToNumber(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

// The single definition of "on sale". Every surface reads Item.onSale, which the server
// derives from this. The `> 0` guards matter: parsePriceToNumber returns 0 for missing or
// unparseable input, so a bare `current < original` would report a markdown whenever the
// current price failed to parse.
export function isMarkedDown(price?: string | null, originalPrice?: string | null): boolean {
  const current = parsePriceToNumber(price);
  const original = parsePriceToNumber(originalPrice);
  return current > 0 && original > 0 && current < original;
}
