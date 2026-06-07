import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import type { Closet, Item } from "../../types";
import { useClosets } from "../../hooks/useClosets";
import { useItems } from "../../hooks/useItems";
import { useAuthStore } from "../../store/auth";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AddItemFlow from "../items/AddItemFlow";
import ItemDrawer from "../items/ItemDrawer";
import TagManagerModal from "../tags/TagManagerModal";
import ClosetFormModal from "../closets/ClosetFormModal";
import ItemFormModal from "../items/ItemFormModal";
import AccountSettingsModal from "../account/AccountSettingsModal";
import { DEFAULT_THEME, type ThemeName } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface AppShellContextValue {
  openAddItem: () => void;
  openTagManager: () => void;
  openItemDrawer: (itemId: string) => void;
  closeItemDrawer: () => void;
  openClosetForm: (closet?: Closet | null) => void;
  openItemForm: (item: Item) => void;
  showToast: (message: string) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);
const THEME_STORAGE_KEY = "window-shopping.theme";

export function useAppShell() {
  const value = useContext(AppShellContext);

  if (!value) {
    throw new Error("useAppShell must be used within AppShell.");
  }

  return value;
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const closetsQuery = useClosets();
  const itemsQuery = useItems();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [itemDrawerId, setItemDrawerId] = useState<string | null>(null);
  const [closetFormTarget, setClosetFormTarget] = useState<Closet | null | undefined>(undefined);
  const [itemFormTarget, setItemFormTarget] = useState<Item | undefined>(undefined);
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as { theme: ThemeName; dark: boolean };
      setTheme(parsed.theme);
      setDark(parsed.dark);
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    document.body.setAttribute("data-dark", dark ? "1" : "0");
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme, dark }));
  }, [dark, theme]);

  const value = useMemo<AppShellContextValue>(
    () => ({
      openAddItem: () => setIsAddOpen(true),
      openTagManager: () => setIsTagsOpen(true),
      openItemDrawer: (itemId) => setItemDrawerId(itemId),
      closeItemDrawer: () => setItemDrawerId(null),
      openClosetForm: (closet) => setClosetFormTarget(closet),
      openItemForm: (item) => setItemFormTarget(item),
      showToast: (message) => setToast({ id: Date.now(), message })
    }),
    []
  );

  return (
    <AppShellContext.Provider value={value}>
      <div
        style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? "1fr" : "232px 1fr",
          minHeight: "100vh",
          height: isMobile ? "auto" : "100vh",
          overflow: isMobile ? "visible" : "hidden",
          background: "var(--ws-paper)",
          color: "var(--ws-ink)"
        }}
      >
        <Sidebar
          closets={closetsQuery.data ?? []}
          items={itemsQuery.data ?? []}
          user={user}
          onOpenNewCloset={() => setClosetFormTarget(null)}
          onOpenAccount={() => setAccountOpen(true)}
          onOpenTags={() => setIsTagsOpen(true)}
        />

        <main style={{ overflow: isMobile ? "visible" : "auto", position: "relative" }}>
          <TopBar
            onOpenTags={() => setIsTagsOpen(true)}
            onOpenAddItem={() => setIsAddOpen(true)}
          />
          <Outlet />
        </main>
      </div>

      <AccountSettingsModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={user}
        theme={theme}
        dark={dark}
        onSelectTheme={setTheme}
        onToggleDark={() => setDark((current) => !current)}
        onSignOut={() => {
          setAccountOpen(false);
          void logout();
        }}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: 20,
            bottom: 20,
            zIndex: 90,
            maxWidth: 320,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: "var(--ws-overlay-paper)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--ws-hairline)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            color: "var(--ws-ink)"
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--ws-accent)", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--ws-muted)",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      <AddItemFlow open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <TagManagerModal open={isTagsOpen} onClose={() => setIsTagsOpen(false)} />
      <ItemDrawer itemId={itemDrawerId} onClose={() => setItemDrawerId(null)} />
      <ClosetFormModal
        open={closetFormTarget !== undefined}
        closet={closetFormTarget ?? null}
        onClose={() => setClosetFormTarget(undefined)}
      />
      <ItemFormModal
        open={itemFormTarget !== undefined}
        item={itemFormTarget ?? null}
        onClose={() => setItemFormTarget(undefined)}
      />
    </AppShellContext.Provider>
  );
}
