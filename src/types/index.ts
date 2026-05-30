export interface User {
  id: string;
  email: string;
  name: string;
  plan?: string;
  avatarUrl?: string | null;
  itemCount?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VersionInfo {
  version: string;
  sha: string;
  released_at: string | null;
}

export interface Section {
  id: string;
  closetId: string;
  name: string;
  tags: string[];
  order: number;
  createdAt: string;
  itemCount: number;
}

export interface Closet {
  id: string;
  userId: string;
  name: string;
  subtitle: string | null;
  accent: string | null;
  tags: string[];
  season: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  sections: Section[];
}

export interface ItemLink {
  id: string;
  name: string;
}

export interface Item {
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
  lastCheckedAt: string | null;
  inStock: boolean | null;
  onSale: boolean;
  addedAt: string;
  updatedAt: string;
  closet?: ItemLink;
  section?: ItemLink | null;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
  itemCount: number;
}

export type { ParsedProduct } from "../../shared/types";

export interface ItemFilters {
  closetId?: string;
  sectionId?: string | null;
  season?: string | null;
  search?: string;
  sort?: "newest" | "oldest" | "updated";
  tags?: string[];
}

export interface ClosetPayload {
  name: string;
  subtitle?: string | null;
  accent?: string | null;
  tags?: string[];
  season?: string | null;
}

export interface SectionPayload {
  name: string;
  tags?: string[];
  order?: number;
}

export interface RefreshStaleSummary {
  checked: number;
  refreshed: number;
  priceDrops: number;
  outOfStock: number;
  failed: number;
}

export interface ItemPayload {
  closetId: string;
  sectionId?: string | null;
  brand: string;
  name: string;
  season: string;
  price?: string | null;
  originalPrice?: string | null;
  currency?: string | null;
  source?: string | null;
  url?: string | null;
  tags?: string[];
  colors?: string[];
  description?: string | null;
  imageUrl?: string | null;
  favorited?: boolean;
  inStock?: boolean | null;
}
