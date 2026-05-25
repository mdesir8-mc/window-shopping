import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (payload: { token: string; user: User }) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

export const AUTH_STORAGE_KEY = "window-shopping.auth";

function persistedUser(state: unknown) {
  return state && typeof state === "object" && "user" in state ? (state as Pick<AuthState, "user">).user : null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => set({ token, user }),
      setUser: (user) => set((state) => ({ ...state, user })),
      clearAuth: () => set({ token: null, user: null })
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState) => ({ user: persistedUser(persistedState) }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        user: persistedUser(persistedState)
      }),
      partialize: (state) => ({
        user: state.user
      })
    }
  )
);
