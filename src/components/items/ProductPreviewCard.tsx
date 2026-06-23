import ProductTile from "../ui/ProductTile";
import { hashTone } from "../../lib/format";
import type { ParsedProduct } from "../../types";

// The parsed-product summary card shared by AddItemFlow's preview step and the
// public LandingParseDemo. `url` only seeds the placeholder tile tone.
export default function ProductPreviewCard({
  parsed,
  url,
  isMobile = false
}: {
  parsed: ParsedProduct;
  url: string;
  isMobile?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 14, padding: 12, border: "1px solid var(--ws-hairline)", alignItems: "flex-start" }}>
      <ProductTile
        tone={hashTone(url)}
        imageUrl={parsed.imageUrl}
        size={isMobile ? 72 : 88}
        rounded={2}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--ws-display)",
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--ws-accent)"
          }}
        >
          {parsed.brand ?? parsed.source}
        </div>
        <div style={{ marginTop: 2, fontFamily: "var(--ws-display)", fontSize: 18, fontWeight: 300 }}>
          {parsed.name ?? "Untitled product"}
        </div>
        <div style={{ marginTop: 6, fontFamily: "var(--ws-mono)", fontSize: 11 }}>
          {[parsed.price, parsed.currency].filter(Boolean).join(" ") || "Price unavailable"}
        </div>
      </div>
    </div>
  );
}
