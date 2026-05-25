import type { Item } from "../../types";
import ProductTile from "../ui/ProductTile";
import Tag from "../ui/Tag";
import { formatRelativeDate, hashTone } from "../../lib/format";

export default function ItemCard({
  item,
  onClick,
  onEdit
}: {
  item: Item;
  onClick: () => void;
  onEdit?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        background: "var(--ws-hover-bg, transparent)",
        padding: 0,
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
        <div style={{ fontFamily: "var(--ws-mono)", fontSize: 11 }}>{item.price ?? "TBD"}</div>
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
            <Tag key={tag} size="sm">
              {tag}
            </Tag>
          ))}
          {item.tags.length > 2 ? (
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>
              +{item.tags.length - 2}
            </span>
          ) : null}
        </div>
        <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>
          {formatRelativeDate(item.addedAt)}
        </span>
      </div>
    </div>
  );
}
