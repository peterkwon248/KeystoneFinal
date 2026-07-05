// source/DetailView.jsx ScenariosTab 이식 — 시나리오 카드 그리드 + 평균 카드 + 수렴분석(ConvergenceTest).
// 데이터: UIPlan(scenarios[per/target/status/thesis], iv). 상태 pill = core scAutoStatus.
// GapTab(내재가치 vs 가격 시계열 차트)은 후속 증분 — 이 탭 안 마커 플레이스홀더로 둠.
// 표시 우선: 목표가/논거 인라인 편집(EditableNum/contentEditable)과 add/remove는 후속에서 서버 액션으로.
"use client";
import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { STRATEGIES } from "@keystone/core/reference";
import { scAutoStatus } from "@keystone/core/analytics";
import { fmtMoney, fmtCompact, toDispCur } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";
import { deletePlanScenario } from "@/app/(shell)/plans/[id]/actions";
import { GapTab } from "./gap-tab";
import { ScenarioAuthorModal } from "./scenario-author-modal";

// 시나리오 미니 상태 pill 색 (source/icons.jsx SC_STATUS_COLOR 그대로 — 순수 프레젠테이션).
const SC_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  tracking: { bg: "var(--bg-elevated-2)", fg: "var(--fg-3)" },
  approaching: { bg: "rgba(242,201,76,.18)", fg: "var(--r-base)" },
  realized: { bg: "rgba(76,183,130,.18)", fg: "var(--r-bull)" },
  invalidated: { bg: "rgba(235,87,87,.16)", fg: "var(--r-bear)" },
};

// source/futuretest_view.jsx FTLab — data-tip 정의 라벨.
function FTLab({ text, tip }: { text: string; tip?: string }) {
  return <span className="ft-deflab" data-tip={tip}>{text}</span>;
}

// source/DetailView.jsx ScAvgTip — 평균 카드 물음표 호버 툴팁.
function ScAvgTip({ children }: { children: ReactNode }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} className="sc-avg-q"
      onMouseEnter={() => { const r = ref.current!.getBoundingClientRect(); setPos({ left: r.right, top: r.bottom + 7 }); }}
      onMouseLeave={() => setPos(null)}>
      <span className="ind-q">?</span>
      {pos && <span className="sc-avg-tip" style={{ left: pos.left + "px", top: pos.top + "px" }}>{children}</span>}
    </span>
  );
}

// source/DetailView.jsx ConvergenceTest — 가격이 각 가치 시나리오로 수렴할 때 기대 IRR.
function ConvergenceTest({ plan, lang }: { plan: UIPlan; lang: Lang }) {
  const ko = lang === "ko";
  const px = plan.currentPrice, sc = plan.scenarios || [];
  const tOf = (en: string) => { const s = sc.find((x) => x.label && x.label.en === en); return s ? s.target : null; };
  const iv = plan.iv ?? 0;
  const rows = [
    { key: "bull", lab: ko ? "상단" : "Bull", color: "var(--r-bull)", tgt: tOf("Bull") || iv * 1.25 },
    { key: "base", lab: ko ? "중간" : "Base", color: "var(--accent)", tgt: tOf("Base") || iv },
    { key: "bear", lab: ko ? "하단" : "Bear", color: "var(--r-bear)", tgt: tOf("Bear") || iv * 0.78 },
  ];
  const horizons = [1, 2, 3];
  const irr = (tgt: number, yrs: number) => (Math.pow(tgt / px, 1 / yrs) - 1) * 100;
  const tone = (v: number) => (v >= 12 ? "pos" : v >= 0 ? "" : "neg");
  return (
    <div className="conv">
      <div className="conv-head">
        <span className="conv-title">{ko ? "수렴 분석 · 기대 연수익률(IRR)" : "Convergence · expected IRR"}</span>
        <span className="conv-sub">{ko ? "가격이 각 가치 시나리오로 수렴한다고 가정할 때" : "If price converges to each value scenario"}</span>
      </div>
      <table className="conv-table">
        <thead><tr><th>{ko ? "시나리오" : "Scenario"}</th><th>{ko ? "목표가" : "Target"}</th><th>{ko ? "총수익" : "Total"}</th>{horizons.map((h) => <th key={h}>{h}{ko ? "년" : "y"}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const total = (r.tgt / px - 1) * 100;
            return (
              <tr key={r.key}>
                <td><span className="conv-dot" style={{ background: r.color }} />{r.lab}</td>
                <td className="mono">{fmtMoney(r.tgt, plan.cur)}</td>
                <td className={"mono " + (total >= 0 ? "pos" : "neg")}>{total >= 0 ? "+" : ""}{total.toFixed(0)}%</td>
                {horizons.map((h) => { const v = irr(r.tgt, h); return <td key={h} className={"mono conv-irr " + tone(v)}>{v >= 0 ? "+" : ""}{v.toFixed(1)}%</td>; })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="conv-note">{ko ? "IRR = (목표가/현재가)^(1/기간) − 1. 12% 이상이면 강조됩니다. 수렴 시점은 가정이며 예측이 아닙니다." : "IRR = (target/price)^(1/yrs) − 1. Convergence timing is an assumption, not a forecast."}</div>
    </div>
  );
}

export function ScenariosTab({ plan, t, lang }: { plan: UIPlan; t: I18nDict; lang: Lang }) {
  const ko = lang === "ko";
  const [modalOpen, setModalOpen] = useState(false);
  const [editSc, setEditSc] = useState<UIPlan["scenarios"][number] | null>(null);
  const [, startTransition] = useTransition();
  const onDeleteSc = (id: string) => startTransition(() => { void deletePlanScenario(plan.dbId, id); });
  const fw = STRATEGIES.find((s) => s.id === plan.strategyId);
  const swingField = fw && fw.fields ? fw.fields.find((f) => f.swing) : null;
  const swingLab = swingField ? swingField.label[lang] : ko ? "가정 PER" : "Assumed P/E";
  const swingUnit = fw && (fw.model === "DCF" || fw.model === "DDM") ? "%" : "×";
  const capFmt = (v: number) => {
    if (!v) return "—";
    const d = toDispCur(v, plan.cur);
    const usd = d.cur === "USD";
    const x = d.v / (usd ? 1e9 : 1e12);
    return (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1)) + (usd ? "B" : "조");
  };
  const avgPrice = plan.avgPrice ?? 0;

  return (
    <div>
      <GapTab plan={plan} t={t} lang={lang} part="track" />

      <div className="sc-grid">
        {plan.scenarios.map((s, i) => {
          const ret = (s.target / plan.currentPrice - 1) * 100;
          const prog = Math.max(0, Math.min(100, (plan.currentPrice / s.target) * 100));
          const isCore = ["Bull", "Base", "Bear"].includes(s.label.en);
          const st = scAutoStatus(plan, s.target);
          const c = SC_STATUS_COLOR[st];
          return (
            <div className="sc-card" key={s.dbId}>
              <div className="sc-card-bar" style={{ background: s.color }} />
              <div className="sc-card-head">
                {isCore
                  ? <span className="sc-label"><FTLab text={s.label[lang]} tip={t["tip_" + s.label.en.toLowerCase()]} /></span>
                  : <span className="sc-label">{s.label[lang]}</span>}
                {s.isAuto && <span className="sc-auto" title={t.scAutoTip}>{t.scAuto}</span>}
                <span className="sc-ministatus-wrap">
                  <span className="sc-ministatus" style={{ background: c.bg, color: c.fg }} title={t.scAutoStatusTip || t.scEditStatus}>{t["sc_" + st]}</span>
                </span>
                <span className="sc-card-actions" style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
                  <button className="iconbtn" onClick={() => setEditSc(s)} title={ko ? "수정" : "Edit"}><Lic name="pencil" size={12} /></button>
                  <button className="iconbtn" onClick={() => onDeleteSc(s.dbId)} title={ko ? "삭제" : "Remove"}><Lic name="x" size={12} /></button>
                </span>
              </div>
              <div className="sc-thesis">{s.thesis?.[lang]}</div>
              <div className="sc-target">
                <span className="sc-target-val mono">{fmtMoney(s.target, plan.cur)}</span>
                <span className={"sc-target-ret " + (ret >= 0 ? "pos" : "neg")}>{ret >= 0 ? "+" : ""}{ret.toFixed(1)}%</span>
              </div>
              <div className="sc-prog-track"><div className="sc-prog-fill" style={{ width: prog + "%", background: s.color }} /></div>
              <div className="sc-metrics">
                <div className="sc-metric"><span className="sc-metric-lab">{swingLab}</span><span className="sc-metric-val">{(s.per ?? 0).toFixed(1)}{swingUnit}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "함의 시총" : "Impl. cap"}</span><span className="sc-metric-val">{capFmt(s.target * (plan.sharesOut || 0) * 1e6)}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "현재가 대비" : "vs price"}</span><span className={"sc-metric-val " + (ret >= 0 ? "pos" : "neg")}>{ret >= 0 ? "+" : ""}{ret.toFixed(0)}%</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{t.expPL}</span><span className="sc-metric-val">{plan.totalShares ? fmtCompact((s.target - avgPrice) * plan.totalShares, plan.cur) : "—"}</span></div>
              </div>
            </div>
          );
        })}
        {(() => {
          const ts = plan.scenarios.map((s) => s.target).filter((v) => v > 0);
          if (!ts.length) return null;
          const avgTarget = Math.round(ts.reduce((a, b) => a + b, 0) / ts.length);
          const avgRet = (avgTarget / plan.currentPrice - 1) * 100;
          const avgPL = plan.totalShares ? (avgTarget - avgPrice) * plan.totalShares : null;
          const lo = Math.min(...ts), hi = Math.max(...ts);
          const prog = Math.max(0, Math.min(100, (plan.currentPrice / avgTarget) * 100));
          return (
            <div className="sc-card sc-card--avg">
              <div className="sc-card-bar" style={{ background: "var(--accent)" }} />
              <div className="sc-card-head">
                <span className="sc-label">{ko ? "평균" : "Average"}</span>
                <ScAvgTip><b>{(ko ? "시나리오 평균 " : "Average ") + fmtMoney(avgTarget, plan.cur)}</b><span className="fin-tip-def">{ko ? "상단·중간·하단 세 목표가를 단순 평균한 값이에요. 확률을 가정하지 않은 중립적 기준점이라 어느 한쪽으로 치우치지 않아요." : "Simple average of the bull/base/bear targets — a neutral reference that assumes no probabilities."}</span><span className="fin-tip-f">{"(" + ts.map((v) => fmtMoney(v, plan.cur)).join(" + ") + ") ÷ " + ts.length + " = " + fmtMoney(avgTarget, plan.cur)}</span></ScAvgTip>
              </div>
              <div className="sc-exp-form">{ko ? "상단·중간·하단 목표가의 단순 평균이에요." : "Simple average of the three targets."}</div>
              <div className="sc-target">
                <span className="sc-target-val mono">{fmtMoney(avgTarget, plan.cur)}</span>
                <span className={"sc-target-ret " + (avgRet >= 0 ? "pos" : "neg")}>{avgRet >= 0 ? "+" : ""}{avgRet.toFixed(1)}%</span>
              </div>
              <div className="sc-prog-track"><div className="sc-prog-fill" style={{ width: prog + "%", background: "var(--accent)" }} /></div>
              <div className="sc-metrics">
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "목표 범위" : "Range"}</span><span className="sc-metric-val">{fmtCompact(lo, plan.cur) + "~" + fmtCompact(hi, plan.cur)}</span></div>
                <div className="sc-metric"><span className="sc-metric-lab">{ko ? "평균 손익" : "Avg P/L"}</span><span className="sc-metric-val">{avgPL != null ? fmtCompact(avgPL, plan.cur) : "—"}</span></div>
              </div>
            </div>
          );
        })()}
        <div className="sc-add" onClick={() => setModalOpen(true)}>
          <Lic name="plus" size={16} color="var(--fg-4)" />{t.addScenarioHere}
        </div>
      </div>

      <GapTab plan={plan} t={t} lang={lang} part="head" />
      <ConvergenceTest plan={plan} lang={lang} />

      {(modalOpen || editSc) && <ScenarioAuthorModal plan={plan}
        editScenario={editSc ? { id: editSc.dbId, caseT: editSc.caseT, target: editSc.target, thesis: editSc.thesis?.ko ?? editSc.thesis?.en ?? "" } : undefined}
        onClose={() => { setModalOpen(false); setEditSc(null); }} />}
    </div>
  );
}
