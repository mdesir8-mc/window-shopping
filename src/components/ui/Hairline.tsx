import type { CSSProperties } from "react";

export default function Hairline({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: "var(--ws-hairline)", ...style }} />;
}
