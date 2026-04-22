import type { CSSProperties, ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  style?: CSSProperties;
  color?: string;
}

export default function Eyebrow({ children, style, color }: EyebrowProps) {
  return (
    <div
      style={{
        fontFamily: "var(--ws-ui)",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        color: color ?? "var(--ws-muted)",
        ...style
      }}
    >
      {children}
    </div>
  );
}
