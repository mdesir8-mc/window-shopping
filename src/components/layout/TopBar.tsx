import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface TopBarProps {
  onOpenTags: () => void;
  onOpenAddItem: () => void;
}

export default function TopBar({ onOpenTags, onOpenAddItem }: TopBarProps) {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

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

  const sortValue = searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  const searchBox = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        maxWidth: isMobile ? "none" : 360,
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid var(--ws-hairline)",
        padding: isMobile ? "10px 12px" : "8px 12px",
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
  );

  const sortSelect = (
    <select
      value={sortValue}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams);
        next.set("sort", event.target.value);
        navigate(`${location.pathname}?${next.toString()}`);
      }}
      style={{
        border: "1px solid var(--ws-hairline)",
        background: "var(--ws-surface)",
        color: "var(--ws-ink)",
        padding: "8px 12px",
        width: isMobile ? 94 : 112,
        minHeight: isMobile ? 40 : undefined,
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        cursor: "pointer"
      }}
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
    </select>
  );

  const tagsButton = (
    <button
      type="button"
      onClick={onOpenTags}
      style={{
        padding: isMobile ? "10px 14px" : "8px 14px",
        minHeight: isMobile ? 40 : undefined,
        background: "var(--ws-hover-bg, transparent)",
        border: "1px solid var(--ws-hairline)",
        cursor: "pointer",
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase"
      }}
    >
      Manage tags
    </button>
  );

  const addButton = (
    <button
      type="button"
      onClick={onOpenAddItem}
      style={{
        padding: isMobile ? "10px 16px" : "8px 16px",
        minHeight: isMobile ? 40 : undefined,
        background: "var(--ws-ink)",
        color: "var(--ws-paper)",
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        borderRadius: 2
      }}
    >
      + New item
    </button>
  );

  const stickyHeader = {
    borderBottom: "1px solid var(--ws-hairline)",
    position: "sticky" as const,
    top: 0,
    background: "var(--ws-paper)",
    zIndex: 5
  };

  if (isMobile) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", ...stickyHeader }}>
        {sortSelect}
        <div style={{ flex: 1 }} />
        {addButton}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 32px", ...stickyHeader }}>
      {searchBox}
      {sortSelect}
      <div style={{ flex: 1 }} />
      {tagsButton}
      {addButton}
    </div>
  );
}
