import React, { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

/**
 * Tiny inline sparkline chart rendered as an SVG polyline.
 * Designed for dashboard stat cards — lightweight, no dependencies.
 */
export const Sparkline = React.memo(({ data, width = 64, height = 24, className = "", color }: SparklineProps) => {
  const points = useMemo(() => {
    if (!data.length) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    return data
      .map((v, i) => {
        const x = padding + (i / Math.max(data.length - 1, 1)) * w;
        const y = padding + h - ((v - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (!data.length) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color || "hsl(var(--primary))"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

Sparkline.displayName = "Sparkline";
