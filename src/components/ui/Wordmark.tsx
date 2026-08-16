import type { CSSProperties } from "react";

interface WordmarkProps {
  /** Height of the mark in pixels; the width follows the aspect ratio. */
  size?: number;
  style?: CSSProperties;
}

// Tight box around the "WS" block plus the accent rule, so `size` is the height
// the mark occupies on screen. The icon files in public/ keep a padded 64x64 box.
const VIEW_WIDTH = 48;
const VIEW_HEIGHT = 34;

/**
 * "WS" initials mark. Decorative: every use site shows the full name next to it,
 * so the mark stays hidden from screen readers. Colors and the letterform come
 * from the theme tokens, so the mark follows the active theme.
 */
export default function Wordmark({ size = 22, style }: WordmarkProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width={(size * VIEW_WIDTH) / VIEW_HEIGHT}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <text
        x="24"
        y="24"
        textAnchor="middle"
        letterSpacing="0.5"
        fontFamily="var(--ws-display)"
        fontSize="32"
        fill="var(--ws-ink)"
      >
        WS
      </text>
      <rect x="18" y="29" width="12" height="1.5" fill="var(--ws-accent)" />
    </svg>
  );
}
