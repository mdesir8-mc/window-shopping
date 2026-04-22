import type { CSSProperties, ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  season?: boolean;
  filled?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md";
  style?: CSSProperties;
  color?: string | null;
}

export default function Tag({
  children,
  season,
  filled,
  removable,
  onRemove,
  onClick,
  size = "md",
  style,
  color
}: TagProps) {
  const fontSize = size === "sm" ? 10 : 11;
  const padding = size === "sm" ? "3px 8px" : "5px 10px";
  const background = filled ? color ?? "var(--ws-ink)" : season ? "var(--ws-accent-bg)" : "transparent";
  const textColor = filled ? "var(--ws-paper)" : color ?? (season ? "var(--ws-accent)" : "var(--ws-ink)");

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: `1px solid ${filled ? background : "var(--ws-hairline)"}`,
        borderRadius: 999,
        padding,
        fontFamily: "var(--ws-mono)",
        fontSize,
        letterSpacing: 0.2,
        background,
        color: textColor,
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
    >
      {season ? (
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: 4,
            background: filled ? "var(--ws-paper)" : color ?? "var(--ws-accent)"
          }}
        />
      ) : null}
      {children}
      {(removable || onRemove) && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.();
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 12,
            lineHeight: 1,
            color: "inherit",
            opacity: 0.65
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
