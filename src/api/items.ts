import { apiClient } from "./client";
import type { Item, ItemFilters, ItemPayload, ParsedProduct } from "../types";

function toSearchParams(filters: ItemFilters) {
  const params = new URLSearchParams();

  if (filters.closetId) {
    params.set("closet", filters.closetId);
  }

  if (filters.sectionId) {
    params.set("section", filters.sectionId);
  }

  if (filters.season) {
    params.set("season", filters.season);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  if (filters.tags?.length) {
    params.set("tags", filters.tags.join(","));
  }

  return params.toString();
}

export async function listItems(filters: ItemFilters = {}) {
  const query = toSearchParams(filters);
  const response = await apiClient.get<Item[]>(`/api/items${query ? `?${query}` : ""}`);
  return response.data;
}

export async function getItem(id: string) {
  const response = await apiClient.get<Item>(`/api/items/${id}`);
  return response.data;
}

export async function parseUrl(url: string) {
  const response = await apiClient.post<ParsedProduct>("/api/items/parse-url", { url });
  return response.data;
}

export async function createItem(payload: ItemPayload) {
  const response = await apiClient.post<Item>("/api/items", payload);
  return response.data;
}

export async function patchItem(id: string, payload: Partial<ItemPayload>) {
  const response = await apiClient.patch<Item>(`/api/items/${id}`, payload);
  return response.data;
}

export async function deleteItem(id: string) {
  await apiClient.delete(`/api/items/${id}`);
}

export async function favoriteItem(id: string) {
  const response = await apiClient.post<{ favorited: boolean }>(`/api/items/${id}/favorite`);
  return response.data;
}

export async function moveItem(id: string, payload: { closetId: string; sectionId?: string | null }) {
  const response = await apiClient.post<Item>(`/api/items/${id}/move`, payload);
  return response.data;
}
