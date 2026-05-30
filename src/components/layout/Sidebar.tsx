import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Closet, Item, User } from "../../types";
import ProductTile from "../ui/ProductTile";
import Eyebrow from "../ui/Eyebrow";
import { hashTone } from "../../lib/format";
import { useTags } from "../../hooks/useTags";
import { useRefreshStaleItems } from "../../hooks/useItems";
import { FRESHNESS_THRESHOLD_MS } from "../../constants";
import { useAppShell } from "./AppShell";

function isStaleItem(item: Item) {
  if (!/^https?:\/\//i.test(item.url ?? "")) {
    return false;
  }
  return !item.lastCheckedAt || Date.now() - new Date(item.lastCheckedAt).getTime() > FRESHNESS_THRESHOLD_MS;
}

interface SidebarProps {
  closets: Closet[];
  items: Item[];
  user: User | null;
  onOpenNewCloset: () => void;
  onToggleSettings: () => void;
}

export default function Sidebar({
  closets,
  items,
  user,
  onOpenNewCloset,
  onToggleSettings
}: SidebarProps) {
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSeason = searchParams.get("season");
  const activeTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const tagsQuery = useTags();
  const { showToast } = useAppShell();
  const refreshStale = useRefreshStaleItems();
  const staleCount = items.filter(isStaleItem).length;
  const summary = refreshStale.data;
  const seasonCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.season] = (acc[item.season] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <aside
      style={{
        borderRight: "1px solid var(--ws-hairline)",
        padding: "28px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        height: "100vh",
        overflowY: "auto"
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--ws-display)", fontSize: 20, lineHeight: 1, letterSpacing: -0.5 }}>
          Window
          <br />
          Shopping<span style={{ color: "var(--ws-accent)" }}>.</span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--ws-mono)",
            fontSize: 9,
            color: "var(--ws-muted)",
            letterSpacing: 1.5
          }}
        >
          {user?.name?.toUpperCase() ?? "WARDROBE"} · MVP
        </div>
      </div>

      <nav>
        <Eyebrow style={{ marginBottom: 8 }}>Library</Eyebrow>
        {[
          {
            label: "All closets",
            count: closets.length,
            to: "/",
            active: location.pathname === "/" && !searchParams.get("view") && !searchParams.get("priceDrops")
          },
          {
            label: "Everything",
            count: items.length,
            to: "/?view=all",
            active: searchParams.get("view") === "all"
          },
          {
            label: "Recently added",
            count: Math.min(items.length, 12),
            to: "/?sort=newest",
            active: location.pathname === "/" && searchParams.get("sort") === "newest" && !searchParams.get("view") && !searchParams.get("priceDrops")
          },
          {
            label: "Price drops",
            count: items.filter((item) => item.originalPrice).length,
            to: "/?priceDrops=true",
            active: searchParams.get("priceDrops") === "true"
          }
        ].map((entry) => (
          <Link
            key={entry.label}
            to={entry.to}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              marginBottom: 2,
              background: entry.active ? "var(--ws-surface)" : "var(--ws-hover-bg, transparent)",
              fontFamily: "var(--ws-ui)",
              fontSize: 13,
              borderRadius: 2
            }}
          >
            <span style={{ flex: 1 }}>{entry.label}</span>
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{entry.count}</span>
          </Link>
        ))}
        <button
          type="button"
          disabled={refreshStale.isPending || (staleCount === 0 && !summary)}
          onClick={() => {
            void refreshStale
              .mutateAsync()
              .then((result) => {
                const parts: string[] = [];
                if (result.priceDrops > 0) {
                  parts.push(`${result.priceDrops} price drop${result.priceDrops === 1 ? "" : "s"}`);
                }
                if (result.outOfStock > 0) {
                  parts.push(`${result.outOfStock} now out of stock`);
                }
                if (parts.length) {
                  showToast(parts.join(" · "));
                }
              })
              .catch(() => {});
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            marginTop: 6,
            border: "1px solid var(--ws-hairline)",
            borderRadius: 2,
            background: "var(--ws-hover-bg, transparent)",
            fontFamily: "var(--ws-ui)",
            fontSize: 13,
            cursor: refreshStale.isPending || staleCount === 0 ? "default" : "pointer",
            opacity: refreshStale.isPending || (staleCount === 0 && !summary) ? 0.55 : 1,
            textAlign: "left"
          }}
        >
          <span style={{ flex: 1 }}>
            {refreshStale.isPending ? "Refreshing…" : "Refresh stale"}
          </span>
          <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{staleCount}</span>
        </button>
        {refreshStale.isError ? (
          <div style={{ marginTop: 6, padding: "0 10px", fontSize: 11, color: "var(--ws-accent)" }}>
            Couldn't refresh. Try again shortly.
          </div>
        ) : summary && !refreshStale.isPending ? (
          <div style={{ marginTop: 6, padding: "0 10px", fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)", lineHeight: 1.5 }}>
            Checked {summary.checked}
            {summary.priceDrops > 0 ? ` · ${summary.priceDrops} price drop${summary.priceDrops === 1 ? "" : "s"}` : ""}
            {summary.outOfStock > 0 ? ` · ${summary.outOfStock} out of stock` : ""}
            {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
          </div>
        ) : null}
      </nav>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Eyebrow>Closets</Eyebrow>
          <button
            type="button"
            onClick={onOpenNewCloset}
            style={{ border: "none", background: "var(--ws-hover-bg, transparent)", cursor: "pointer", fontSize: 16, padding: 0 }}
          >
            +
          </button>
        </div>
        {closets.map((closet) => {
          const active = location.pathname === `/closets/${closet.id}`;
          return (
            <button
              key={closet.id}
              type="button"
              onClick={() => navigate(`/closets/${closet.id}`)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                marginBottom: 2,
                border: "none",
                borderRadius: 2,
                background: active ? "var(--ws-surface)" : "var(--ws-hover-bg, transparent)",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <ProductTile tone={hashTone(closet.id)} size={18} rounded={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{closet.name}</span>
              <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{closet.itemCount}</span>
            </button>
          );
        })}
      </div>

      <div>
        <Eyebrow style={{ marginBottom: 8 }}>Seasons</Eyebrow>
        {Object.entries(seasonCounts).map(([season, count]) => (
          <button
            key={season}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (activeSeason === season) {
                next.delete("season");
              } else {
                next.set("season", season);
              }
              navigate(`${location.pathname}?${next.toString()}`);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              border: "none",
              background: activeSeason === season ? "var(--ws-surface)" : "var(--ws-hover-bg, transparent)",
              cursor: "pointer",
              textAlign: "left"
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: 4, background: "var(--ws-muted)" }} />
            <span style={{ flex: 1, fontSize: 12, color: "var(--ws-muted)" }}>{season}</span>
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{count}</span>
          </button>
        ))}
      </div>

      {(tagsQuery.data ?? []).length > 0 ? (
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Tags</Eyebrow>
          {(tagsQuery.data ?? []).map((tag) => {
            const isActive = activeTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (isActive) {
                    const remaining = activeTags.filter((t) => t !== tag.name);
                    if (remaining.length) {
                      next.set("tags", remaining.join(","));
                    } else {
                      next.delete("tags");
                    }
                  } else {
                    next.set("tags", [...activeTags, tag.name].join(","));
                  }
                  navigate(`/?${next.toString()}`);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  border: "none",
                  background: isActive ? "var(--ws-surface)" : "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    background: tag.color ?? "var(--ws-muted)",
                    flexShrink: 0
                  }}
                />
                <span style={{ flex: 1, fontSize: 12, color: "var(--ws-muted)" }}>{tag.name}</span>
                <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{tag.itemCount}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--ws-hairline)" }}>
        <button
          type="button"
          onClick={onToggleSettings}
          onMouseEnter={() => setIsAvatarHovered(true)}
          onMouseLeave={() => setIsAvatarHovered(false)}
          onFocus={() => setIsAvatarHovered(true)}
          onBlur={() => setIsAvatarHovered(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 6px",
            border: "none",
            background: isAvatarHovered ? "var(--ws-surface)" : "transparent",
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 4,
            transition: "background 120ms ease"
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 28,
              display: "grid",
              placeItems: "center",
              background: "var(--ws-accent)",
              color: "var(--ws-paper)",
              fontFamily: "var(--ws-display)",
              fontSize: 13
            }}
          >
            {user?.name?.[0] ?? "W"}
          </div>
          <div>
            <div style={{ fontSize: 12 }}>{user?.name ?? "Window Shopping"}</div>
            <div style={{ fontFamily: "var(--ws-mono)", fontSize: 9, color: "var(--ws-muted)" }}>
              {user?.plan ?? "free"} plan · {items.length} items
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
