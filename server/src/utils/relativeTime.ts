export function formatRelativeTime(input: Date | string, now = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (diffMs < minute) {
    return "just now";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  if (diffMs < week) {
    return `${Math.floor(diffMs / day)}d ago`;
  }

  if (diffMs < month) {
    return `${Math.floor(diffMs / week)}w ago`;
  }

  return `${Math.floor(diffMs / month)}mo ago`;
}
