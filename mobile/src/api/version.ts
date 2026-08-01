import { apiClient } from "./client";
import type { VersionInfo } from "../types";

export async function getVersion() {
  const response = await apiClient.get<VersionInfo>("/version");
  return response.data;
}
