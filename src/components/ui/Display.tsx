import type { CSSProperties, ReactNode } from "react";

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

  return (
    <Component
      style={{
        margin: 0,
        fontFamily: "var(--ws-display)",
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1.02,
        letterSpacing: `${-0.02 * size}px`,
        color: "var(--ws-ink)",
        ...style
      }}
    >
      {children}
    </Component>
  );
}
