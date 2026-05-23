export interface ParsedProduct {
  brand: string | null;
  name: string | null;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  imageUrl: string | null;
  description: string | null;
  colors: string[];
  suggestedTags: string[];
  suggestedSeason: string | null;
  source: string;
}
