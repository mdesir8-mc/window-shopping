// Serializers for the unauthenticated public-share path. Kept deliberately
// separate from serializers.ts so the PII boundary is obvious in the diff and so
// a field added to the authed serializers can never leak here by default. These
// are strict allowlists: every emitted field is named explicitly. Never spread a
// Prisma row through this path.

type PublicItemInput = {
  id: string;
  sectionId: string | null;
  brand: string;
  name: string;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  source: string | null;
  url: string | null;
  season: string;
  tags: string[];
  colors: string[];
  description: string | null;
  imageUrl: string | null;
  inStock: boolean | null;
  onSale: boolean;
  addedAt: Date;
};

type PublicSectionInput = {
  id: string;
  name: string;
  order: number;
  _count?: { items?: number };
};

type PublicClosetInput = {
  id: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  tags: string[];
  season: string | null;
  sections?: PublicSectionInput[];
  items?: PublicItemInput[];
  _count?: { items?: number };
};

// Owner note, favorited flag, userId, lastCheckedAt, updatedAt are intentionally
// dropped — not needed to render and not the viewer's business.
export function serializePublicItem(item: PublicItemInput) {
  return {
    id: item.id,
    sectionId: item.sectionId,
    brand: item.brand,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    currency: item.currency,
    source: item.source,
    url: item.url,
    season: item.season,
    tags: item.tags,
    colors: item.colors,
    description: item.description,
    imageUrl: item.imageUrl,
    inStock: item.inStock,
    onSale: item.onSale,
    addedAt: item.addedAt.toISOString()
  };
}

export function serializePublicSection(section: PublicSectionInput) {
  return {
    id: section.id,
    name: section.name,
    order: section.order,
    itemCount: section._count?.items ?? 0
  };
}

// No userId, no shareToken echoed back, no createdAt/updatedAt.
export function serializePublicCloset(closet: PublicClosetInput) {
  return {
    id: closet.id,
    name: closet.name,
    subtitle: closet.subtitle,
    accent: closet.accent,
    tags: closet.tags,
    season: closet.season,
    itemCount: closet._count?.items ?? closet.items?.length ?? 0,
    sections: (closet.sections ?? [])
      .slice()
      .sort((left, right) => left.order - right.order)
      .map(serializePublicSection),
    items: (closet.items ?? []).map(serializePublicItem)
  };
}
