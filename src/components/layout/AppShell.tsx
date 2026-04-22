import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import type { Closet } from "../../types";
import { useClosets } from "../../hooks/useClosets";
import { useItems } from "../../hooks/useItems";
import { useAuthStore } from "../../store/auth";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AddItemFlow from "../items/AddItemFlow";
import ItemDrawer from "../items/ItemDrawer";
import TagManagerModal from "../tags/TagManagerModal";
import ClosetFormModal from "../closets/ClosetFormModal";
import { DEFAULT_THEME, THEME_OPTIONS, type ThemeName } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import Eyebrow from "../ui/Eyebrow";

interface AppShellContextValue {
  openAddItem: () => void;
  openTagManager: () => void;
  openItemDrawer: (itemId: string) => void;
  closeItemDrawer: () => void;
  openClosetForm: (closet?: Closet | null) => void;
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
  const closetsQuery = useClosets();
  const itemsQuery = useItems();
  const user = useAuthStore((state) => state.user);
  const { logout } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [itemDrawerId, setItemDrawerId] = useState<string | null>(null);
  const [closetFormTarget, setClosetFormTarget] = useState<Closet | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [dark, setDark] = useState(false);

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
      openClosetForm: (closet) => setClosetFormTarget(closet)
    }),
    []
  );

  return (
    <AppShellContext.Provider value={value}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "232px 1fr",
          minHeight: "100vh",
          background: "var(--ws-paper)",
          color: "var(--ws-ink)"
        }}
      >
        <Sidebar
          closets={closetsQuery.data ?? []}
          items={itemsQuery.data ?? []}
          user={user}
          onOpenNewCloset={() => setClosetFormTarget(null)}
          onToggleSettings={() => setSettingsOpen((current) => !current)}
        />

        <main style={{ overflow: "auto", position: "relative" }}>
          <TopBar onOpenTags={() => setIsTagsOpen(true)} onOpenAddItem={() => setIsAddOpen(true)} />
          <Outlet />
        </main>
      </div>

      {settingsOpen ? (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            width: 280,
            zIndex: 85,
            background: "var(--ws-overlay-paper)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--ws-hairline)",
            padding: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            color: "var(--ws-ink)"
          }}
        >
          <div style={{ fontFamily: "var(--ws-display)", fontSize: 22, fontWeight: 300 }}>Settings</div>
          <div style={{ marginTop: 14 }}>
            <Eyebrow style={{ marginBottom: 8 }}>Appearance</Eyebrow>
            <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ws-muted)", marginBottom: 6 }}>
              Theme
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "1px solid var(--ws-hairline)",
                    background: theme === option.value ? "var(--ws-ink)" : "transparent",
                    color: theme === option.value ? "var(--ws-paper)" : "var(--ws-ink)",
                    cursor: "pointer",
                    fontSize: 10,
                    textTransform: "uppercase"
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDark((current) => !current)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 12px",
                border: "1px solid var(--ws-hairline)",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ws-ink)"
              }}
            >
              {dark ? "Dark mode on" : "Dark mode off"}
            </button>
          </div>
          <div style={{ marginTop: 18 }}>
            <Eyebrow style={{ marginBottom: 8 }}>Account</Eyebrow>
            <button
              type="button"
              onClick={logout}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--ws-hairline)",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ws-accent)"
              }}
            >
              Log out
            </button>
          </div>
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
    </AppShellContext.Provider>
  );
}
