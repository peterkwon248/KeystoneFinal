// source/trajectory.jsx Sparkline 이식본 — 리스트 로우/헤더용 미니 라인
// (mock 시장가 경로 + 실제 승패 틴트).
"use client";
import type { Plan } from "@keystone/core/types";
import { planTrajectory, type PriceClose } from "@/lib/trajectory";

export function Sparkline({ plan, closes, w = 62, h = 22 }: { plan: Plan; closes?: PriceClose[]; w?: number; h?: number }) {
  const tj = planTrajectory(plan, closes);
  if (!tj.hasPosition) return <span className="spark-empty" style={{ width: w, display: "inline-block" }} />;
  const xs = tj.samples.map((s) => s.mkt);
  const lo = Math.min(...xs), hi = Math.max(...xs), span = (hi - lo) || 1;
  const pts = tj.samples.map((s, i) => {
    const x = (i / (tj.samples.length - 1)) * (w - 2) + 1;
    const y = (h - 3) - ((s.mkt - lo) / span) * (h - 6) + 1.5;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const won = tj.won;
  const color = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  const lastX = w - 1, lastY = (h - 3) - ((xs[xs.length - 1] - lo) / span) * (h - 6) + 1.5;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={pts} stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="1.8" fill={color} />
    </svg>
  );
}
