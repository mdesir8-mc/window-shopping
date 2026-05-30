import type { AuthenticatedUser } from "../types";

type CountedSection = {
  id: string;
  closetId: string;
  name: string;
  tags: string[];
  order: number;
  createdAt: Date;
  _count?: {
    items?: number;
  };
  itemCount?: number;
};

type CountedCloset = {
  id: string;
  userId: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  tags: string[];
  season: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections?: CountedSection[];
  _count?: {
    items?: number;
  };
  itemCount?: number;
};

type SerializedItemInput = {
  id: string;
  closetId: string;
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
  favorited: boolean;
  lastCheckedAt: Date | null;
  inStock: boolean | null;
  onSale: boolean;
  addedAt: Date;
  updatedAt: Date;
  closet?: {
    id: string;
    name: string;
  };
  section?: {
    id: string;
    name: string;
  } | null;
};

export function serializeAuthUser(user: AuthenticatedUser & { plan?: string; avatarUrl?: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    ...(user.plan ? { plan: user.plan } : {}),
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {})
  };
}

export function serializeSection(section: CountedSection) {
  return {
    id: section.id,
    closetId: section.closetId,
    name: section.name,
    tags: section.tags,
    order: section.order,
    createdAt: section.createdAt.toISOString(),
    itemCount: section.itemCount ?? section._count?.items ?? 0
  };
}

export function serializeCloset(closet: CountedCloset) {
  return {
    id: closet.id,
    userId: closet.userId,
    name: closet.name,
    subtitle: closet.subtitle,
    accent: closet.accent,
    tags: closet.tags,
    season: closet.season,
    createdAt: closet.createdAt.toISOString(),
    updatedAt: closet.updatedAt.toISOString(),
    itemCount: closet.itemCount ?? closet._count?.items ?? 0,
    sections: (closet.sections ?? [])
      .slice()
      .sort((left, right) => left.order - right.order)
      .map(serializeSection)
  };
}

export function serializeItem(item: SerializedItemInput) {
  return {
    id: item.id,
    closetId: item.closetId,
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
    favorited: item.favorited,
    lastCheckedAt: item.lastCheckedAt?.toISOString() ?? null,
    inStock: item.inStock,
    onSale: item.onSale,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    closet: item.closet ?? undefined,
    section: item.section ?? null
  };
}

export function serializeTag(tag: { id: string; userId: string; name: string; color: string | null; createdAt: Date }, itemCount = 0) {
  return {
    id: tag.id,
    userId: tag.userId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
    itemCount
  };
}
