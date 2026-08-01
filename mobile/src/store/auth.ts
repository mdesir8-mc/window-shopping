import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  // Router gate: SecureStore rehydrates asynchronously, so the app shows a splash until
  // this flips true (see docs/mobile-build.md § Session lifecycle).
  hasHydrated: boolean;
  setAuth: (payload: { token: string; user: User }) => void;
  setToken: (token: string) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

const AUTH_STORAGE_KEY = "window-shopping.auth";

// Persist to the iOS Keychain (encrypted at rest) via expo-secure-store. The token
// never touches AsyncStorage (plaintext). Keys may use alphanumerics, ".", "-", "_",
// so AUTH_STORAGE_KEY is already valid.
const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name)
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: ({ token, user }) => set({ token, user }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      // KEY DIFF vs web: persist the token too. Web persisted only `user` and relied on
      // the httpOnly cookie; native has no cookie jar, so the token must live on-device.
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true)
    }
  )
);
