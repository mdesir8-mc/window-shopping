import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Closet, Item, Tag, User } from "../../types";
import ProductTile from "../ui/ProductTile";
import Eyebrow from "../ui/Eyebrow";
import { hashTone } from "../../lib/format";
import { useTags } from "../../hooks/useTags";
import { useRefreshStaleItems } from "../../hooks/useItems";
import { isStale } from "../../../shared/staleness";
import { useAppShell } from "./AppShell";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface SidebarProps {
  closets: Closet[];
  items: Item[];
  user: User | null;
  onOpenNewCloset: () => void;
  onOpenAccount: () => void;
  onOpenTags: () => void;
}

export default function Sidebar({
  closets,
  items,
  user,
  onOpenNewCloset,
  onOpenAccount,
  onOpenTags
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileShelf, setMobileShelf] = useState<"closets" | "seasons" | "tags">("closets");
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const activeSeason = searchParams.get("season");
  const activeTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const tagsQuery = useTags();
  const sidebarTags = tagsQuery.data ?? [];
  const { showToast } = useAppShell();
  const refreshStale = useRefreshStaleItems();
  const staleCount = items.filter((item) => isStale(item.lastCheckedAt, item.url)).length;
  const summary = refreshStale.data;
  const seasonCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.season] = (acc[item.season] ?? 0) + 1;
    return acc;
  }, {});
  const libraryEntries = [
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
  ];
  const mobileRowStyle = isMobile
    ? {
        display: "flex",
        alignItems: "center",
        gap: 8,
        overflowX: "auto" as const,
        paddingBottom: 4
      }
    : undefined;
  const mobileChipStyle = isMobile
    ? {
        width: "auto",
        minWidth: "max-content",
        marginBottom: 0,
        padding: "8px 10px",
        minHeight: 40
      }
    : undefined;
  const mobileShelfButtonStyle = (active: boolean) => ({
    ...mobileChipStyle,
    border: "1px solid var(--ws-hairline)",
    borderRadius: 2,
    background: active ? "var(--ws-ink)" : "var(--ws-hover-bg, transparent)",
    color: active ? "var(--ws-paper)" : "var(--ws-ink)",
    cursor: "pointer",
    fontFamily: "var(--ws-mono)",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const
  });

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  function updateSearch(value: string) {
    setSearch(value);
    const next = new URLSearchParams(searchParams);

    if (value.trim()) {
      next.set("search", value);
    } else {
      next.delete("search");
    }

    navigate(`${location.pathname}?${next.toString()}`);
  }

  const renderClosetButton = (closet: Closet) => {
    const active = location.pathname === `/closets/${closet.id}`;
    return (
      <button
        key={closet.id}
        type="button"
        onClick={() => {
          setIsMobileMenuOpen(false);
          navigate(`/closets/${closet.id}`);
        }}
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
          textAlign: "left",
          ...mobileChipStyle
        }}
      >
        <ProductTile tone={hashTone(closet.id)} size={18} rounded={2} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13 }}>{closet.name}</span>
        <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{closet.itemCount}</span>
      </button>
    );
  };

  const renderLibraryEntry = (entry: (typeof libraryEntries)[number]) => (
    <Link
      key={entry.label}
      to={entry.to}
      onClick={() => setIsMobileMenuOpen(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        marginBottom: 2,
        background: entry.active ? "var(--ws-surface)" : "var(--ws-hover-bg, transparent)",
        fontFamily: "var(--ws-ui)",
        fontSize: 13,
        borderRadius: 2,
        ...mobileChipStyle
      }}
    >
      <span style={{ flex: 1 }}>{entry.label}</span>
      <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{entry.count}</span>
    </Link>
  );

  const renderSeasonButton = ([season, count]: [string, number]) => (
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
        setIsMobileMenuOpen(false);
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
        textAlign: "left",
        ...mobileChipStyle
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: 4, background: "var(--ws-muted)" }} />
      <span style={{ flex: 1, fontSize: 12, color: "var(--ws-muted)" }}>{season}</span>
      <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{count}</span>
    </button>
  );

  const renderTagButton = (tag: Tag) => {
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
          setIsMobileMenuOpen(false);
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
          textAlign: "left",
          ...mobileChipStyle
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
  };

  return (
    <aside
      className={isMobile ? "ws-scrollbar" : undefined}
      style={{
        borderRight: isMobile ? "none" : "1px solid var(--ws-hairline)",
        borderBottom: isMobile ? "1px solid var(--ws-hairline)" : "none",
        padding: isMobile ? "14px 16px 10px" : "28px 20px",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 10 : 28,
        height: isMobile ? "auto" : "100vh",
        overflowY: isMobile ? "visible" : "auto",
        position: isMobile ? "sticky" : "static",
        top: isMobile ? 0 : undefined,
        zIndex: isMobile ? 8 : undefined,
        background: "var(--ws-paper)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--ws-display)", fontSize: isMobile ? 18 : 20, lineHeight: 1, letterSpacing: 0 }}>
            Window
            {isMobile ? " " : <br />}
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
        {isMobile ? (
          <button
            type="button"
            onClick={onOpenAccount}
            aria-label="Account"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: 36,
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-hover-bg, transparent)",
              cursor: "pointer",
              padding: 3,
              display: "grid",
              placeItems: "center"
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name ?? "Account"}
                referrerPolicy="no-referrer"
                style={{ width: 28, height: 28, borderRadius: 28, objectFit: "cover" }}
              />
            ) : (
              <span
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
              </span>
            )}
          </button>
        ) : null}
      </div>

      {isMobile ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--ws-hairline)",
              padding: "10px 12px",
              background: "var(--ws-surface)"
            }}
          >
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 11, color: "var(--ws-muted)" }}>⌕</span>
            <input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search items, brands, tags..."
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                color: "var(--ws-ink)"
              }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-expanded={isMobileMenuOpen}
              style={{
                width: "100%",
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "9px 12px",
                border: "1px solid var(--ws-hairline)",
                borderRadius: 2,
                background: "var(--ws-hover-bg, transparent)",
                cursor: "pointer",
                fontFamily: "var(--ws-mono)",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase"
              }}
            >
              <span>Browse wardrobe</span>
              <span aria-hidden="true">{isMobileMenuOpen ? "^" : "v"}</span>
            </button>

            {isMobileMenuOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  zIndex: 12,
                  display: "grid",
                  gap: 14,
                  maxHeight: "min(62vh, 520px)",
                  overflowY: "auto",
                  padding: 14,
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-paper)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.12)"
                }}
              >
                <div>
                  <Eyebrow style={{ marginBottom: 8 }}>Library</Eyebrow>
                  <div className="ws-scrollbar" style={mobileRowStyle}>
                    {libraryEntries.map(renderLibraryEntry)}
                    <button
                      type="button"
                      disabled={refreshStale.isPending || (staleCount === 0 && !summary)}
                      onClick={() => {
                        void refreshStale
                          .mutateAsync()
                          .then((result) => {
                            const parts: string[] = [
                              `Checked ${result.checked} item${result.checked === 1 ? "" : "s"}`
                            ];
                            if (result.priceDrops > 0) {
                              parts.push(`${result.priceDrops} price drop${result.priceDrops === 1 ? "" : "s"}`);
                            }
                            if (result.outOfStock > 0) {
                              parts.push(`${result.outOfStock} now out of stock`);
                            }
                            if (result.failed > 0) {
                              parts.push(`${result.failed} couldn't be reached`);
                            }
                            showToast(parts.join(" · "));
                          })
                          .catch(() => {});
                      }}
                      style={{
                        width: "auto",
                        minWidth: "max-content",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        minHeight: 40,
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
                      <span style={{ flex: 1 }}>{refreshStale.isPending ? "Refreshing..." : "Refresh stale"}</span>
                      <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{staleCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenTags();
                      }}
                      style={{
                        ...mobileChipStyle,
                        border: "1px solid var(--ws-hairline)",
                        borderRadius: 2,
                        background: "var(--ws-hover-bg, transparent)",
                        cursor: "pointer",
                        fontFamily: "var(--ws-ui)",
                        fontSize: 13
                      }}
                    >
                      Manage tags
                    </button>
                  </div>
                </div>

                <div>
                  <div className="ws-scrollbar" style={mobileRowStyle}>
                    <button
                      type="button"
                      onClick={() => setMobileShelf("closets")}
                      style={mobileShelfButtonStyle(mobileShelf === "closets")}
                    >
                      Closets
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileShelf("seasons")}
                      style={mobileShelfButtonStyle(mobileShelf === "seasons")}
                    >
                      Seasons
                    </button>
                    {sidebarTags.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setMobileShelf("tags")}
                        style={mobileShelfButtonStyle(mobileShelf === "tags")}
                      >
                        Tags
                      </button>
                    ) : null}
                    {mobileShelf === "closets" ? (
                      <>
                        {closets.map(renderClosetButton)}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onOpenNewCloset();
                          }}
                          aria-label="New closet"
                          style={{
                            ...mobileChipStyle,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid var(--ws-hairline)",
                            borderRadius: 2,
                            background: "var(--ws-hover-bg, transparent)",
                            cursor: "pointer",
                            fontSize: 13
                          }}
                        >
                          + New
                        </button>
                      </>
                    ) : mobileShelf === "tags" ? (
                      sidebarTags.map(renderTagButton)
                    ) : (
                      Object.entries(seasonCounts).map(renderSeasonButton)
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {!isMobile ? (
      <nav>
        <Eyebrow style={{ marginBottom: 8 }}>Library</Eyebrow>
        <div className={isMobile ? "ws-scrollbar" : undefined} style={mobileRowStyle}>
          {libraryEntries.map(renderLibraryEntry)}
          <button
            type="button"
            disabled={refreshStale.isPending || (staleCount === 0 && !summary)}
            onClick={() => {
              void refreshStale
                .mutateAsync()
                .then((result) => {
                  const parts: string[] = [
                    `Checked ${result.checked} item${result.checked === 1 ? "" : "s"}`
                  ];
                  if (result.priceDrops > 0) {
                    parts.push(`${result.priceDrops} price drop${result.priceDrops === 1 ? "" : "s"}`);
                  }
                  if (result.outOfStock > 0) {
                    parts.push(`${result.outOfStock} now out of stock`);
                  }
                  if (result.failed > 0) {
                    parts.push(`${result.failed} couldn't be reached`);
                  }
                  showToast(parts.join(" · "));
                })
                .catch(() => {});
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              marginTop: isMobile ? 0 : 6,
              border: "1px solid var(--ws-hairline)",
              borderRadius: 2,
              background: "var(--ws-hover-bg, transparent)",
              fontFamily: "var(--ws-ui)",
              fontSize: 13,
              cursor: refreshStale.isPending || staleCount === 0 ? "default" : "pointer",
              opacity: refreshStale.isPending || (staleCount === 0 && !summary) ? 0.55 : 1,
              textAlign: "left",
              ...mobileChipStyle
            }}
          >
            <span style={{ flex: 1 }}>
              {refreshStale.isPending ? "Refreshing…" : "Refresh stale"}
            </span>
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>{staleCount}</span>
          </button>
        </div>
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
      ) : null}

      {isMobile ? null : (
        <>
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
            <div style={mobileRowStyle}>{closets.map(renderClosetButton)}</div>
          </div>

          <div>
            <Eyebrow style={{ marginBottom: 8 }}>Seasons</Eyebrow>
            <div style={mobileRowStyle}>{Object.entries(seasonCounts).map(renderSeasonButton)}</div>
          </div>
        </>
      )}

      {!isMobile && sidebarTags.length > 0 ? (
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Tags</Eyebrow>
          <div style={mobileRowStyle}>{sidebarTags.map(renderTagButton)}</div>
        </div>
      ) : null}

      {isMobile ? null : (
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--ws-hairline)" }}>
        <button
          type="button"
          onClick={onOpenAccount}
          onMouseEnter={() => setIsAvatarHovered(true)}
          onMouseLeave={() => setIsAvatarHovered(false)}
          onFocus={() => setIsAvatarHovered(true)}
          onBlur={() => setIsAvatarHovered(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: isMobile ? "8px 10px" : "4px 6px",
            border: "none",
            background: isAvatarHovered ? "var(--ws-surface)" : "transparent",
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 4,
            transition: "background 120ms ease",
            minHeight: isMobile ? 40 : undefined
          }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name ?? "Account"}
              referrerPolicy="no-referrer"
              style={{
                width: 28,
                height: 28,
                borderRadius: 28,
                objectFit: "cover"
              }}
            />
          ) : (
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
          )}
          <div>
            <div style={{ fontSize: 12 }}>{user?.name ?? "Window Shopping"}</div>
            <div style={{ fontFamily: "var(--ws-mono)", fontSize: 9, color: "var(--ws-muted)" }}>
              {user?.plan ?? "free"} plan · {items.length} items
            </div>
          </div>
        </button>
      </div>
      )}
    </aside>
  );
}
