export function hashTone(value: string) {
  return Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function formatRelativeDate(isoDate: string) {
  const input = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = now - input;
  const day = 24 * 60 * 60 * 1000;

  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / (60 * 60 * 1000)));
    return `${hours}h ago`;
  }

  if (diff < day * 7) {
    return `${Math.max(1, Math.round(diff / day))}d ago`;
  }

  if (diff < day * 31) {
    return `${Math.max(1, Math.round(diff / (day * 7)))}w ago`;
  }

  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function parsePriceToNumber(value?: string | null) {
  if (!value) {
    return 0;
  }

  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(value || 0);
}
