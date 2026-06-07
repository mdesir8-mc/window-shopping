import type { CSSProperties, ReactNode } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface DisplayProps {
  children: ReactNode;
  size?: number;
  weight?: number;
  style?: CSSProperties;
  as?: "h1" | "h2" | "h3" | "div";
}

export default function Display({
  children,
  size = 48,
  weight = 300,
  style,
  as = "h1"
}: DisplayProps) {
  const Component = as;
  const isMobile = useIsMobile();
  const displaySize = isMobile ? Math.max(28, size > 40 ? Math.round(size * 0.5) : size) : size;

  return (
    <Component
      style={{
        margin: 0,
        fontFamily: "var(--ws-display)",
        fontSize: displaySize,
        fontWeight: weight,
        lineHeight: 1.02,
        letterSpacing: 0,
        color: "var(--ws-ink)",
        ...style
      }}
    >
      {children}
    </Component>
  );
}
