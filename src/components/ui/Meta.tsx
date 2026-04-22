import type { CSSProperties } from "react";

export default function Meta({ items, style }: { items: Array<string | null | undefined>; style?: CSSProperties }) {
  const visibleItems = items.filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        fontFamily: "var(--ws-mono)",
        fontSize: 11,
        color: "var(--ws-muted)",
        letterSpacing: 0.2,
        ...style
      }}
    >
      {visibleItems.map((item, index) => (
        <span key={`${item}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {index > 0 ? <span style={{ opacity: 0.35 }}>·</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}
