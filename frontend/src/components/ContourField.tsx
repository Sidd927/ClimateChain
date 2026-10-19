import { memo, useMemo } from "react";

/**
 * Topographic contour field: a deterministic terrain-like height field (sum of
 * Gaussian hills and basins) contoured with marching squares into static SVG paths.
 * Generated once per mount; decorative (aria-hidden). Optional slow CSS drift,
 * disabled under prefers-reduced-motion.
 */
const W = 112;
const H = 63;

type Hill = [x: number, y: number, r: number, h: number];
const HILLS: Hill[] = [
  [0.78, 0.32, 0.22, 1.0], [0.92, 0.75, 0.18, 0.7], [0.58, 0.82, 0.16, -0.55],
  [0.25, 0.2, 0.2, 0.55], [0.12, 0.78, 0.22, 0.8], [0.45, 0.45, 0.12, -0.35], [0.68, 0.55, 0.1, 0.4],
];

function height(x: number, y: number) {
  let v = 0;
  for (const [hx, hy, r, h] of HILLS) {
    const dx = (x - hx) * 1.6, dy = y - hy;
    v += h * Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
  }
  return v + 0.08 * Math.sin(x * 9.1 + y * 3.7) + 0.05 * Math.cos(y * 11.3 - x * 2.1);
}

function contours(levels: number[]) {
  const g: number[][] = [];
  for (let j = 0; j <= H; j++) {
    g.push([]);
    for (let i = 0; i <= W; i++) g[j].push(height(i / W, j / H));
  }
  const sx = 1600 / W, sy = 900 / H;
  return levels.map((lv) => {
    let d = "";
    const lerp = (a: number, b: number) => (lv - a) / (b - a || 1e-9);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], e = g[j + 1][i];
        const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (e > lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const top: [number, number] = [i + lerp(a, b), j];
        const right: [number, number] = [i + 1, j + lerp(b, c)];
        const bottom: [number, number] = [i + lerp(e, c), j + 1];
        const left: [number, number] = [i, j + lerp(a, e)];
        const segs: [number, number][][] = {
          1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]], 5: [[left, top], [bottom, right]],
          6: [[top, bottom]], 7: [[left, top]], 8: [[left, top]], 9: [[top, bottom]], 10: [[left, bottom], [top, right]],
          11: [[top, right]], 12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
        }[idx] as [number, number][][];
        for (const [p, q] of segs) d += `M${Math.round(p[0] * sx)} ${Math.round(p[1] * sy)}L${Math.round(q[0] * sx)} ${Math.round(q[1] * sy)}`;
      }
    }
    return d;
  });
}

const LEVELS = Array.from({ length: 16 }, (_, k) => -0.45 + k * 0.1);
let cached: string[] | null = null; // geometry is identical everywhere: compute once per page load

export const ContourField = memo(function ContourField({ className = "", drift = true }: { className?: string; drift?: boolean }) {
  const paths = useMemo(() => (cached ??= contours(LEVELS)), []);
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${drift ? "contour-drift" : ""}`}>
        {paths.map((d, k) => (
          <path key={k} d={d} fill="none" stroke={k % 5 === 0 ? "#3f6870" : "#24464d"} strokeWidth={k % 5 === 0 ? 1.15 : 0.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgb(13_38_43/0.92),rgb(13_38_43/0.35)_55%,rgb(13_38_43/0.15))]" />
    </div>
  );
});
