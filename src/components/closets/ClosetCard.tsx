import type { Closet } from "../../types";
import ProductTile from "../ui/ProductTile";
import Eyebrow from "../ui/Eyebrow";
import Tag from "../ui/Tag";
import { hashTone } from "../../lib/format";

interface ClosetCardProps {
  closet: Closet;
  onClick: () => void;
}

export default function ClosetCard({ closet, onClick }: ClosetCardProps) {
  const tone = hashTone(closet.id);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--ws-hover-bg, transparent)",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left"
      }}
    >
      <div style={{ position: "relative", aspectRatio: "3 / 4" }}>
        <ProductTile
          tone={tone}
          imageUrl={null}
          label={closet.name}
          style={{ width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <span
            style={{
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              letterSpacing: 1,
              color: "rgba(26,22,19,0.72)"
            }}
          >
            N° {tone.toString().padStart(2, "0")}
          </span>
          <span
            style={{
              padding: "3px 8px",
              background: "rgba(245,241,234,0.82)",
              backdropFilter: "blur(4px)",
              fontFamily: "var(--ws-mono)",
              fontSize: 10,
              color: "rgba(26,22,19,0.72)"
            }}
          >
            {closet.itemCount} items
          </span>
        </div>
      </div>

      <div style={{ paddingTop: 12 }}>
        <Eyebrow>Closet</Eyebrow>
        <div
          style={{
            marginTop: 4,
            fontFamily: "var(--ws-display)",
            fontSize: 22,
            fontWeight: 300,
            lineHeight: 1.1
          }}
        >
          {closet.name}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: "var(--ws-ui)",
            fontSize: 12,
            color: "var(--ws-muted)"
          }}
        >
          {closet.subtitle ?? "No subtitle yet"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {closet.tags.slice(0, 3).map((tag) => (
            <Tag key={tag} size="sm">
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </button>
  );
}
