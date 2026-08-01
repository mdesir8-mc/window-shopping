import { apiClient } from "./client";
import type { Tag } from "../types";

export async function listTags() {
  const response = await apiClient.get<Tag[]>("/api/tags");
  return response.data;
}

export async function createTag(payload: { name: string; color?: string | null }) {
  const response = await apiClient.post<Tag>("/api/tags", payload);
  return response.data;
}

export async function patchTag(name: string, payload: { color?: string | null }) {
  const response = await apiClient.patch<Tag>(`/api/tags/${encodeURIComponent(name)}`, payload);
  return response.data;
}

export async function deleteTag(name: string) {
  await apiClient.delete(`/api/tags/${encodeURIComponent(name)}`);
}
