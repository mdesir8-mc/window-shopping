import { apiClient } from "./client";
import type { AuthResponse } from "../types";

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await apiClient.post<AuthResponse>("/api/auth/register", payload);
  return response.data;
}

export async function login(payload: { email: string; password: string }) {
  const response = await apiClient.post<AuthResponse>("/api/auth/login", payload);
  return response.data;
}

export async function googleLogin(credential: string) {
  const response = await apiClient.post<AuthResponse>("/api/auth/google", { credential });
  return response.data;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}

export async function getCurrentUser() {
  const response = await apiClient.get<AuthResponse["user"] & { itemCount: number }>("/api/user");
  return response.data;
}
