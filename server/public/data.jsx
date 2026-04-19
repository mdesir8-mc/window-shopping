// Window Shopping — dynamic data bootstrap
// Normalized API responses are adapted into the original prototype globals.

const SEASONS = ["Spring", "Summer", "Fall", "Winter", "F/W", "S/S"];

const PLACEHOLDER_TONES = [
  ["#E8DDD0", "#C9B8A4"],
  ["#D9CFC0", "#A8957E"],
  ["#EADFD0", "#D4B896"],
  ["#C5B5A0", "#8E7A63"],
  ["#E5D9C8", "#B09A7F"],
  ["#D1C2AE", "#9A8569"],
  ["#F0E6D6", "#CBB99F"],
  ["#BCA890", "#7D6B54"],
  ["#DFD2BE", "#B59E82"],
  ["#C9BBA3", "#8A7860"],
  ["#E2D3BD", "#A88B6A"],
  ["#B8A488", "#73604A"]
];

const EMPTY_DATA = {
  CLOSETS: [],
  ITEMS: [],
  TAG_LIBRARY: []
};

function hashSeed(seed, offset = 0) {
  const input = `${seed}:${offset}`;
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash % PLACEHOLDER_TONES.length;
}

function formatRelativeTime(input) {
  const date = new Date(input);
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}d ago`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}w ago`;
  return `${Math.floor(diffMs / month)}mo ago`;
}

function setShowEmpty(showEmpty) {
  if (window.TWEAK_DEFAULTS) {
    window.TWEAK_DEFAULTS = {
      ...window.TWEAK_DEFAULTS,
      showEmpty
    };
  }
}

function adaptClosets(closets) {
  return closets.map((closet, index) => ({
    id: closet.id,
    name: closet.name,
    subtitle: closet.subtitle,
    itemCount: closet.itemCount || 0,
    cover: hashSeed(closet.id, index),
    accent: closet.accent,
    tags: Array.isArray(closet.tags) ? closet.tags : [],
    sections: Array.isArray(closet.sections)
      ? closet.sections.map((section) => ({
          id: section.id,
          name: section.name,
          count: section.itemCount || 0,
          tags: Array.isArray(section.tags) ? section.tags : []
        }))
      : []
  }));
}

function adaptItems(items) {
  return items.map((item, index) => ({
    id: item.id,
    closet: item.closetId,
    section: item.sectionId,
    brand: item.brand,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    currency: item.currency,
    source: item.source,
    url: item.url,
    addedAt: formatRelativeTime(item.addedAt),
    season: item.season,
    tags: Array.isArray(item.tags) ? item.tags : [],
    colors: Array.isArray(item.colors) ? item.colors : [],
    desc: item.description,
    imageUrl: item.imageUrl,
    favorited: !!item.favorited,
    tone: hashSeed(item.id, index)
  }));
}

function adaptTags(tags) {
  return tags.map((tag) => ({
    name: tag.name,
    color: tag.color,
    count: tag.itemCount || 0
  }));
}

async function bootstrapData() {
  Object.assign(window, {
    SEASONS,
    PLACEHOLDER_TONES,
    ...EMPTY_DATA,
    WS_BOOTSTRAP_ERROR: null
  });

  const tokenStorageKey = window.WS_TOKEN_STORAGE_KEY || "window-shopping.jwt";
  const token = window.localStorage.getItem(tokenStorageKey);

  if (!token || typeof window.apiFetch !== "function") {
    Object.assign(window, EMPTY_DATA);
    setShowEmpty(true);
    window.WS_BOOTSTRAP_ERROR = !token
      ? "No JWT found in localStorage['window-shopping.jwt']."
      : "window.apiFetch is unavailable.";
    return EMPTY_DATA;
  }

  try {
    const [closets, items, tags] = await Promise.all([
      window.apiFetch("/api/closets"),
      window.apiFetch("/api/items"),
      window.apiFetch("/api/tags")
    ]);

    const adapted = {
      CLOSETS: adaptClosets(Array.isArray(closets) ? closets : []),
      ITEMS: adaptItems(Array.isArray(items) ? items : []),
      TAG_LIBRARY: adaptTags(Array.isArray(tags) ? tags : [])
    };

    Object.assign(window, adapted);
    setShowEmpty(adapted.CLOSETS.length === 0 && adapted.ITEMS.length === 0);
    return adapted;
  } catch (error) {
    console.error("Failed to bootstrap Window Shopping data:", error);
    Object.assign(window, EMPTY_DATA);
    setShowEmpty(true);
    window.WS_BOOTSTRAP_ERROR = error && error.message ? error.message : "Failed to load data.";
    return EMPTY_DATA;
  }
}

window.__WS_DATA_READY__ = bootstrapData();
