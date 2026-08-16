import { apiClient } from "./client";
import type { Connection } from "../types";

export async function listConnections() {
  const response = await apiClient.get<Connection[]>("/api/user/connections");
  return response.data;
}

export async function revokeConnection(clientId: string) {
  await apiClient.delete(`/api/user/connections/${encodeURIComponent(clientId)}`);
}
