import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

interface TopBarProps {
  onOpenTags: () => void;
  onOpenAddItem: () => void;
}

export default function TopBar({ onOpenTags, onOpenAddItem }: TopBarProps) {
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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "18px 32px",
        borderBottom: "1px solid var(--ws-hairline)",
        position: "sticky",
        top: 0,
        background: "var(--ws-paper)",
        zIndex: 5
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: 360,
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid var(--ws-hairline)",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.16)"
        }}
      >
        <span style={{ fontFamily: "var(--ws-mono)", fontSize: 11, color: "var(--ws-muted)" }}>⌕</span>
        <input
          value={search}
          onChange={(event) => updateSearch(event.target.value)}
          placeholder="Search items, brands, tags..."
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--ws-ink)"
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={onOpenTags}
        style={{
          padding: "8px 14px",
          background: "transparent",
          border: "1px solid var(--ws-hairline)",
          cursor: "pointer",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase"
        }}
      >
        Manage tags
      </button>
      <button
        type="button"
        onClick={onOpenAddItem}
        style={{
          padding: "8px 16px",
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
        + Paste link
      </button>
    </div>
  );
}
