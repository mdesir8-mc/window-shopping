import axios from "axios";
import type { PublicCloset } from "../types";

// The public share view is unauthenticated. Use a bare axios client (not the shared
// apiClient) so we never attach the viewer's bearer token and never trip the
// 401→/login redirect interceptor — a bad/revoked token returns a plain 404.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export async function fetchPublicCloset(token: string) {
  const response = await axios.get<PublicCloset>(`${baseURL}/api/public/closets/${token}`);
  return response.data;
}
