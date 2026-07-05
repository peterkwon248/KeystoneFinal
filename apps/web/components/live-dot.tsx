// 라이브 인디케이터 — 실시간 시세가 적용된 가격 옆의 미세한 pulse dot.
// reticle.css의 livePulse 키프레임을 재사용(과하지 않게, 6px 미만).
"use client";

export function LiveDot({ title = "Live" }: { title?: string }) {
  return <span className="live-quote-dot" title={title} aria-hidden="true" />;
}
