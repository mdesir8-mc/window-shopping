import { useNavigate } from "react-router-dom";
import type { Item } from "../../types";
import ProductTile from "../ui/ProductTile";
import Tag from "../ui/Tag";
import { hasRefreshableUrl, isStale } from "../../../shared/staleness";
import { formatRelativeDate, hashTone } from "../../lib/format";
import { useRefreshItem } from "../../hooks/useItems";
import { useAppShell } from "../layout/AppShellContext";

export default function ItemCard({
  item,
  onClick,
  onEdit
}: {
  item: Item;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const stale = isStale(item.lastCheckedAt, item.url);
  const navigate = useNavigate();
  const refreshMutation = useRefreshItem();
  const { showToast } = useAppShell();
  const refreshable = hasRefreshableUrl(item.url);

  async function handleRefresh(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    try {
      await refreshMutation.mutateAsync(item.id);
      showToast("Item refreshed.");
    } catch {
      showToast("Couldn't refresh item. Try again shortly.");
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        background: "var(--ws-hover-bg, transparent)",
        padding: "8px 8px 14px",
        cursor: "pointer",
        textAlign: "left"
      }}
    >
      <div style={{ position: "relative" }}>
        <ProductTile
          tone={hashTone(item.id)}
          imageUrl={item.imageUrl}
          style={{ width: "100%", aspectRatio: "3 / 4" }}
        />
        {onEdit ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 7px",
              background: "var(--ws-overlay-paper)",
              backdropFilter: "blur(4px)",
              border: "none",
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              color: "var(--ws-ink)",
              cursor: "pointer",
              letterSpacing: 0.5
            }}
          >
            Edit
          </button>
        ) : null}
        {item.onSale ? (
          <div
            style={{
              position: "absolute",
              top: onEdit ? 38 : 10,
              left: 10,
              padding: "3px 7px",
              background: "var(--ws-accent)",
              backdropFilter: "blur(4px)",
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              color: "var(--ws-paper)",
              letterSpacing: 0.5
            }}
          >
            ON SALE
          </div>
        ) : null}
        {refreshable ? (
          <button
            type="button"
            aria-label={`Refresh ${item.name}`}
            disabled={refreshMutation.isPending}
            onClick={(event) => void handleRefresh(event)}
            onKeyDown={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              padding: "4px 8px",
              border: "none",
              background: "var(--ws-overlay-paper)",
              backdropFilter: "blur(4px)",
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              color: "var(--ws-ink)",
              cursor: refreshMutation.isPending ? "default" : "pointer",
              letterSpacing: 0.5,
              opacity: refreshMutation.isPending ? 0.7 : 1,
              textTransform: "uppercase"
            }}
          >
            {refreshMutation.isPending ? "Refreshing" : "Refresh"}
          </button>
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "3px 7px",
            background: "var(--ws-overlay-paper)",
            backdropFilter: "blur(4px)",
            fontFamily: "var(--ws-mono)",
            fontSize: 9,
            color: "var(--ws-accent)"
          }}
        >
          {item.season}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--ws-display)",
              fontSize: 12,
              fontStyle: "italic",
              color: "var(--ws-accent)"
            }}
          >
            {item.brand}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: "var(--ws-ui)",
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {item.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "flex-end",
            gap: 6,
            flexWrap: "wrap",
            flexShrink: 0,
            fontFamily: "var(--ws-mono)",
            fontSize: 11
          }}
        >
          <span>{item.price ?? "TBD"}</span>
          {item.onSale && item.originalPrice ? (
            <span style={{ color: "var(--ws-muted)", textDecoration: "line-through" }}>
              {item.originalPrice}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 8
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {item.tags.slice(0, 2).map((tag) => (
            <Tag
              key={tag}
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                navigate(`/?tags=${encodeURIComponent(tag)}`);
              }}
            >
              {tag}
            </Tag>
          ))}
          {item.tags.length > 2 ? (
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>
              +{item.tags.length - 2}
            </span>
          ) : null}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--ws-mono)",
            fontSize: 10,
            color: "var(--ws-muted)"
          }}
        >
          {stale ? <span aria-label="Stale price or stock data">●</span> : null}
          {formatRelativeDate(item.addedAt)}
        </span>
      </div>
    </div>
  );
}
