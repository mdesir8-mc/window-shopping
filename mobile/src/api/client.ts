import axios from "axios";
import { router } from "expo-router";
import { useAuthStore } from "../store/auth";

// Variant of web src/api/client.ts. Differences:
//  - base URL comes from EXPO_PUBLIC_API_BASE_URL (not import.meta.env)
//  - no withCredentials: native has no cookie jar, the bearer token carries the session
//  - reads the X-Refreshed-Token header to slide the session forward (server re-issues)
//  - 401 routes to /login via expo-router instead of window.location
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // Sliding session: once the JWT passes the re-issue threshold the server returns a
    // fresh one here. Persist it so the token rolls forward with activity.
    const refreshed = response.headers["x-refreshed-token"];

    if (typeof refreshed === "string" && refreshed.length > 0) {
      useAuthStore.getState().setToken(refreshed);
    }

    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      router.replace("/login");
    }

    return Promise.reject(error);
  }
);
