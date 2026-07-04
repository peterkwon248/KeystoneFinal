// source/Dashboard.jsx DashStat 이식본 — 헤드라인 스탯 카드(라벨·값·호버 tip 목록).
// dashboard-view.tsx에서 분리(순수 프레젠테이션) — 시나리오 모니터 등에서 재사용.
import type { ReactNode } from "react";

export interface DashTipRow {
  name: ReactNode;
  flag?: ReactNode;
  val?: ReactNode;
  tone?: string;
}

export function DashStat({
  lab, val, tone, tip,
}: { lab: string; val: string; tone?: string; tip?: DashTipRow[] }) {
  return (
    <div className={"dash-stat" + (tip && tip.length ? " has-tip" : "")} tabIndex={tip && tip.length ? 0 : undefined}>
      <span className="dash-stat-lab">{lab}</span>
      <span className={"dash-stat-val mono" + (tone ? " " + tone : "")}>{val}</span>
      {tip && tip.length > 0 && <div className="dash-stat-tip">
        <div className="dash-stat-tip-h">{lab}<span className="dash-stat-tip-n">{tip.length}</span></div>
        <div className="dash-stat-tip-rows">
          {tip.map((r, i) => <div className="dash-stat-tip-row" key={i}>
            <span className="dash-stat-tip-nm">{r.flag}{r.name}</span>
            {r.val != null && <span className={"dash-stat-tip-v mono" + (r.tone ? " " + r.tone : "")}>{r.val}</span>}
          </div>)}
        </div>
      </div>}
    </div>
  );
}
