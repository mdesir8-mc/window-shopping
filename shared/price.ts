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
