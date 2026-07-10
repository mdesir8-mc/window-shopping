interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
}

// Minimal inline-SVG line chart. Renders nothing under two points — a single reading
// isn't a trend. A flat series is drawn along the vertical midpoint.
export default function Sparkline({
  points,
  width = 220,
  height = 40,
  stroke = "var(--ws-accent)"
}: SparklineProps) {
  if (points.length < 2) {
    return null;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const stepX = width / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = index * stepX;
    // Invert: SVG y grows downward, so a higher price sits nearer the top.
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Price history, ${points.length} readings`}
      style={{ display: "block", overflow: "visible" }}
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
