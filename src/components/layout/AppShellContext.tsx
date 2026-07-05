import { createContext, useContext } from "react";
import type { Closet, Item } from "../../types";

export interface AppShellContextValue {
  openAddItem: () => void;
  openTagManager: () => void;
  openItemDrawer: (itemId: string) => void;
  closeItemDrawer: () => void;
  openClosetForm: (closet?: Closet | null) => void;
  openItemForm: (item: Item) => void;
  showToast: (message: string) => void;
}

export const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  const value = useContext(AppShellContext);

  if (!value) {
    throw new Error("useAppShell must be used within AppShell.");
  }

  return value;
}
