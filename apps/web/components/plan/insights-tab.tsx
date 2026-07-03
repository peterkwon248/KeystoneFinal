// source/planinsights.jsx PlanInsights + AvgTrendChart + PiStat 이식, source/Insights.jsx(16~47)의
// InsSection/InsGauge를 모듈 프라이빗으로 동봉 이식(원래 window.InsSection/InsGauge 참조 제거).
// 플랜별 인사이트 — 실행 정확도(평단 아래 매수 비율)·평단가 추이·시나리오 거리·룰 발동 이력.
// 데이터: computeLedger(plan)로 파생. mock 날짜 앵커("today" = "Jun 10")는 마일스톤 6 목업 기준 그대로 유지.
// SVG/차트 계산/className/ko·en 문자열은 프로토타입 그대로. JSX→TSX(React.useState→named useState,
// hover state 타입 지정, 콜백 매개변수 타입 명시).
"use client";
import { useState } from "react";
import { computeLedger } from "@keystone/core/analytics";
import { fmtMoney, fmtCompact } from "@keystone/core/format";
import { trajMonthIdx } from "@/lib/trajectory";
import { Lic } from "@/components/icons";
import type { I18nDict, Lang } from "@keystone/core/types";
import type { UIPlan } from "@/lib/plan-mapper";

function piDays(a: string | null | undefined, b: string | null | undefined): number | null {
  const ma = trajMonthIdx(a);
  const mb = trajMonthIdx(b);
  if (ma == null || mb == null) return null;
  return Math.max(0, Math.round((mb - ma) * 30.4));
}

/* ---- section shell (source/Insights.jsx:16-29) ---- */
function InsSection({ title, sub, children, right }: {
  title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="ins-section">
      <div className="ins-head">
        <div>
          <div className="ins-title">{title}</div>
          <div className="ins-sub">{sub}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ---- semicircle gauge — a bounded 0..100 score (source/Insights.jsx:32-48) ---- */
function InsGauge({ pct, label, sub }: { pct: number | null; label: React.ReactNode; sub?: React.ReactNode }) {
  const R = 42, cx = 50, cy = 48, sw = 9;
  const v = pct == null ? null : Math.max(0, Math.min(100, pct));
  const arc = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  const col = v == null ? "var(--fg-4)" : v >= 60 ? "var(--pos)" : v >= 40 ? "var(--r-base)" : "var(--neg)";
  return (
    <div className="ins-gauge">
      <svg viewBox="0 0 100 60" className="ins-gauge-svg">
        <path d={arc} pathLength={100} fill="none" stroke="var(--border-strong)" strokeWidth={sw} strokeLinecap="round" />
        {v != null && <path d={arc} pathLength={100} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${v} 100`} />}
        <text x="50" y="44" textAnchor="middle" className="ins-gauge-num" style={{ fill: col }}>{v == null ? "—" : v + "%"}</text>
      </svg>
      <div className="ins-gauge-lab">{label}</div>
      {sub && <div className="ins-gauge-sub">{sub}</div>}
    </div>
  );
}

/* avg-cost improvement chart: step line of running avg + fill-price dots per round */
function AvgTrendChart({ plan, lang }: { plan: UIPlan; lang: Lang }) {
  const ko = lang === "ko";
  const [hov, setHov] = useState<number | null>(null);
  const L = computeLedger(plan);
  const buys = L.rows.filter((r) => r.type !== "sell" && r.avg != null);
  if (buys.length < 2) return null;
  const W = 560, H = 120, padL = 6, padR = 6, padT = 14, padB = 18;
  const xs = (i: number) => padL + (i / (buys.length - 1)) * (W - padL - padR);
  const vals = buys.map((r) => r.avg as number).concat(buys.filter((r) => r.e).map((r) => (r.e as NonNullable<typeof r.e>).price));
  const lo = Math.min(...vals), hi = Math.max(...vals), span = (hi - lo) || 1, vp = span * 0.12;
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo + vp) / (span + vp * 2));
  const line = buys.map((r, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)} ${y(r.avg as number).toFixed(1)}`).join(" ");
  const rnd = (r: typeof buys[number], i: number) => r.e && r.e.round != null ? r.e.round : (r.type === "open" ? (ko ? "이월" : "c/f") : i + 1);
  const h = hov != null ? buys[hov] : null;
  return (
    <div className="pi-chartwrap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="pi-chart" preserveAspectRatio="none">
        {[0.5].map((g) => <line key={g} x1={padL} y1={padT + (H - padT - padB) * g} x2={W - padR} y2={padT + (H - padT - padB) * g} stroke="var(--border)" strokeWidth="1" />)}
        <path d={line} fill="none" stroke="var(--fg-2)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        {buys.map((r, i) => r.e && <circle key={i} cx={xs(i)} cy={y(r.e.price)} r={hov === i ? "4" : "2.6"} fill={r.e.price <= (r.avg as number) ? "var(--pos)" : "var(--fg-4)"} opacity={0.85} />)}
        {h && <line x1={xs(hov as number)} x2={xs(hov as number)} y1={padT} y2={H - padB} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 2" />}
        {h && <circle cx={xs(hov as number)} cy={y(h.avg as number)} r="3.5" fill="var(--fg)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        {buys.map((r, i) => <rect key={"h" + i} x={xs(i) - (W / buys.length / 2)} y={0} width={W / buys.length} height={H} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov((c) => c === i ? null : c)} />)}
        <text x={padL} y={H - 5} className="pi-axis">{buys[0].type === "open" ? (lang === "ko" ? "이월" : "c/f") : "#" + (buys[0].e && buys[0].e.round != null ? buys[0].e.round : 1)}</text>
        <text x={W - padR} y={H - 5} textAnchor="end" className="pi-axis">#{buys[buys.length - 1].e && buys[buys.length - 1].e!.round != null ? buys[buys.length - 1].e!.round : buys.length}</text>
      </svg>
      {h && <div className="pi-tip" style={{ left: (xs(hov as number) / W * 100) + "%" }}>
        <div className="pi-tip-h">{ko ? `${rnd(h, hov as number)}회차` : `Round ${rnd(h, hov as number)}`}{h.e && h.e.date ? " · " + h.e.date : ""}</div>
        {h.e && <div className="pi-tip-row"><span className="pi-tip-dot" style={{ background: h.e.price <= (h.avg as number) ? "var(--pos)" : "var(--fg-4)" }} />{ko ? "체결가" : "Fill"} <b>{fmtMoney(h.e.price, plan.cur)}</b></div>}
        <div className="pi-tip-row"><span className="pi-tip-dot" style={{ background: "var(--fg-2)" }} />{ko ? "평단가" : "Avg"} <b>{fmtMoney(h.avg as number, plan.cur)}</b></div>
      </div>}
    </div>
  );
}

function PiStat({ lab, val, tone }: { lab: React.ReactNode; val: React.ReactNode; tone?: string }) {
  return (
    <div className="pi-stat">
      <div className="pi-stat-lab">{lab}</div>
      <div className={"pi-stat-val mono" + (tone ? " " + tone : "")}>{val}</div>
    </div>
  );
}

export function InsightsTab({ plan, t: _t, lang }: { plan: UIPlan; t: I18nDict; lang: Lang }) {
  void _t;
  const ko = lang === "ko";
  const today = "Jun 10"; // mock "today" anchor — matches the milestone-6 mock date window, not real now()
  const L = computeLedger(plan);
  const buys = (plan.executions || []).filter((e) => e.side === "buy").slice().reverse();
  const hasPos = plan.totalShares > 0 && plan.avgPrice != null;
  // if rounds were carried forward, the first listed fill isn't the true entry — fall back to createdAt
  const hasCF = L.rows.length > 0 && L.rows[0].type === "open";
  const entryDate = buys.length ? (hasCF ? plan.createdAt : buys[0].date) : null;
  const obsDays = entryDate && hasCF ? null : piDays(plan.createdAt, entryDate || today);
  const holdDays = entryDate ? piDays(entryDate, plan.status === "closed" ? (plan.closedAt || today) : today) : null;

  // execution efficiency (buys only, vs running avg before each fill)
  let improving = 0, checked = 0;
  {
    let q = 0, c = 0;
    const chrono = L.rows.filter((r) => r.type !== "sell");
    chrono.forEach((r) => {
      if (r.type === "open") { q = r.qty ?? 0; c = r.cost ?? 0; return; }
      const prevAvg = q > 0 ? c / q : null;
      if (prevAvg != null && r.e) { checked++; if (r.e.price < prevAvg) improving++; }
      q = r.qty ?? 0; c = (r.qty ?? 0) * (r.avg ?? 0);
    });
  }
  const firstAvg = L.rows.length ? (L.rows[0].avg != null ? L.rows[0].avg : null) : null;
  const avgImpr = hasPos && firstAvg ? ((plan.avgPrice as number) / firstAvg - 1) * 100 : null;
  const firedRules = (plan.rules || []).filter((r) => r.last && r.last !== "Never");
  const disc = checked > 0 ? Math.round(improving / checked * 100) : null;
  const allRules = (plan.rules || []).length;

  const metricTiles = (
    <div className="metric-row" style={{ marginBottom: 0 }}>
      {obsDays != null && <div className="metric"><div className="metric-lab">{ko ? "관찰 → 진입" : "Research → entry"}</div><div className="metric-val sm mono">{entryDate ? obsDays + (ko ? "일" : "d") : obsDays + (ko ? "일째" : "d")}</div></div>}
      {holdDays != null && <div className="metric"><div className="metric-lab">{ko ? "보유 기간" : "Holding"}</div><div className="metric-val sm mono">{holdDays + (ko ? "일" : "d")}</div></div>}
      {plan.divisions != null && <div className="metric"><div className="metric-lab">{ko ? "회차 진행" : "Rounds"}</div><div className="metric-val sm mono">{plan.round + "/" + plan.divisions}</div></div>}
      {avgImpr != null && <div className="metric"><div className="metric-lab">{ko ? "평단 개선" : "Avg vs initial"}</div><div className={"metric-val sm mono" + (avgImpr <= 0 ? " pos" : "")}>{(avgImpr <= 0 ? "" : "+") + avgImpr.toFixed(1) + "%"}</div></div>}
      <div className="metric"><div className="metric-lab">{ko ? "룰 발동" : "Rules fired"}</div><div className="metric-val sm mono">{firedRules.length}{allRules ? "/" + allRules : ""}</div></div>
    </div>
  );

  return (
    <div className="pi-wrap ins-wrap" style={{ maxWidth: "none", padding: 0, margin: 0 }}>
      <InsSection title={ko ? "실행 정확도" : "Execution quality"} sub={ko ? "계획대로 사고 있나 — 평단 아래 매수 비율" : "Are you buying to plan — share of fills below running avg"}>
        <div className="ins-split">
          <InsGauge pct={disc} label={ko ? "평단 아래 매수" : "Buys below avg"} sub={checked > 0 ? (improving + "/" + checked + (ko ? "회차" : " rounds")) : (ko ? "진입 전" : "pre-entry")} />
          <div className="ins-split-main">{metricTiles}</div>
        </div>
      </InsSection>

      {hasPos && <InsSection title={ko ? "평단가 추이" : "Avg-cost trend"} sub={ko ? "선=평단 · 점=체결가 (초록=평단 아래)" : "line=avg · dots=fills (green=below avg)"}>
        <AvgTrendChart plan={plan} lang={lang} />
      </InsSection>}

      <InsSection title={ko ? "시나리오 거리" : "Scenario distance"} sub={ko ? "현재가 → 각 목표가" : "current price → targets"}>
        <div className="pi-rows">
          {(plan.scenarios || []).map((s, i) => {
            const d = (s.target / plan.currentPrice - 1) * 100;
            const w = Math.min(100, Math.abs(d) * 2.2);
            return (
              <div className="pi-row" key={i}>
                <span className="pi-row-lab"><span className="pf-dot" style={{ background: s.color }} />{s.label[lang]}</span>
                <span className="pi-track"><span className={"pi-fill " + (d >= 0 ? "pos" : "neg")} style={{ width: w + "%" }} /></span>
                <span className={"pi-row-val mono " + (d >= 0 ? "pos" : "neg")}>{(d >= 0 ? "+" : "") + d.toFixed(1) + "%"}</span>
                <span className="pi-row-meta mono">{fmtCompact(s.target, plan.cur)}</span>
              </div>
            );
          })}
        </div>
      </InsSection>

      {firedRules.length > 0 && <InsSection title={ko ? "룰 발동 이력" : "Rule activity"} sub={ko ? "규칙이 실제로 동작한 기록" : "when your rules actually fired"}>
        <div className="pi-rows">
          {firedRules.map((r, i) => (
            <div className="pi-row" key={i}>
              <span className="pi-row-lab"><Lic name="zap" size={12} cls="icon-sm" color="var(--r-base)" />{r.name[lang]}</span>
              <span className="pi-row-desc">{r.when[lang]} → {r.then[lang]}</span>
              <span className="pi-row-meta mono">{r.last}</span>
            </div>
          ))}
        </div>
      </InsSection>}

      {!hasPos && <div className="pi-note">{ko ? "아직 포지션이 없어 체결 기반 인사이트는 진입 후 표시됩니다." : "Execution-based insights appear after the first fill."}</div>}
    </div>
  );
}
