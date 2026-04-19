import { apiClient } from "./client";
import type { Closet, ClosetPayload, Section, SectionPayload } from "../types";

export async function listClosets() {
  const response = await apiClient.get<Closet[]>("/api/closets");
  return response.data;
}

export async function getCloset(id: string) {
  const response = await apiClient.get<Closet>(`/api/closets/${id}`);
  return response.data;
}

export async function createCloset(payload: ClosetPayload) {
  const response = await apiClient.post<Closet>("/api/closets", payload);
  return response.data;
}

export async function patchCloset(id: string, payload: Partial<ClosetPayload>) {
  const response = await apiClient.patch<Closet>(`/api/closets/${id}`, payload);
  return response.data;
}

export async function deleteCloset(id: string) {
  await apiClient.delete(`/api/closets/${id}`);
}

export async function createSection(closetId: string, payload: SectionPayload) {
  const response = await apiClient.post<Section>(`/api/closets/${closetId}/sections`, payload);
  return response.data;
}

export async function patchSection(
  closetId: string,
  sectionId: string,
  payload: Partial<SectionPayload>
) {
  const response = await apiClient.patch<Section>(`/api/closets/${closetId}/sections/${sectionId}`, payload);
  return response.data;
}

export async function deleteSection(closetId: string, sectionId: string, deleteItems = false) {
  await apiClient.delete(
    `/api/closets/${closetId}/sections/${sectionId}?deleteItems=${deleteItems ? "true" : "false"}`
  );
}
