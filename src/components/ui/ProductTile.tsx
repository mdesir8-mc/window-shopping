import { useState, type CSSProperties } from "react";
import { PLACEHOLDER_TONES } from "../../constants";

interface ProductTileProps {
  tone?: number;
  label?: string;
  imageUrl?: string | null;
  size?: CSSProperties["width"];
  rounded?: number;
  style?: CSSProperties;
}

export default function ProductTile({
  tone = 0,
  label,
  imageUrl,
  size = "100%",
  rounded = 0,
  style
}: ProductTileProps) {
  const [failed, setFailed] = useState(false);
  const [a, b] = PLACEHOLDER_TONES[tone % PLACEHOLDER_TONES.length];

  if (imageUrl && !failed) {
    return (
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          overflow: "hidden",
          borderRadius: rounded,
          background: "var(--ws-surface)",
          ...style
        }}
      >
        <img
          src={imageUrl}
          alt={label ?? "Product"}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        overflow: "hidden",
        borderRadius: rounded,
        background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        ...style
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 14px)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          mixBlendMode: "overlay",
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.15), transparent 40%)"
        }}
      />
      {label ? (
        <div
          style={{
            position: "absolute",
            left: 10,
            bottom: 8,
            fontFamily: "var(--ws-mono)",
            fontSize: 9,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "rgba(26,22,19,0.55)"
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
