// source/BoardTimeline.jsx TimelineView 이식본 — 성과/여정 궤적 타임라인 (간트).
// 시장가 경로는 프로토타입 mock (lib/trajectory) — 실데이터는 마일스톤 6+.
// 어댑테이션: PORTFOLIOS 전역 → DB 포트폴리오 파라미터, category 그룹핑 미노출.
"use client";
import { useEffect, useRef, useState } from "react";
import type { I18nDict, Lang, PlanStatus } from "@keystone/core/types";
import { EXEC_STRATEGIES, PLAN_STATUS, STATUS_ORDER } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { fmtMoney } from "@keystone/core/format";
import { Flag, StatusIcon } from "@/components/icons";
import { planTrajectory } from "@/lib/trajectory";
import { orderPlans, type Grouping, type Ordering } from "./group";
import type { PfLite } from "@/lib/pf-palette";
import type { UIPlan } from "@/lib/plan-mapper";

const TL_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const TL_MONTH_LABEL: Record<string, { en: string; ko: string }> = { Sep: { en: "Sep", ko: "9월" }, Oct: { en: "Oct", ko: "10월" }, Nov: { en: "Nov", ko: "11월" }, Dec: { en: "Dec", ko: "12월" }, Jan: { en: "Jan '26", ko: "1월" }, Feb: { en: "Feb", ko: "2월" }, Mar: { en: "Mar", ko: "3월" }, Apr: { en: "Apr", ko: "4월" }, May: { en: "May", ko: "5월" }, Jun: { en: "Jun", ko: "6월" } };
const TL_COLW = 116;
const TL_NAMEW = 210;
const TL_ROWH = 56;
const TODAY_T = 9 + 8 / 31; // Jun 8

export type TlMode = "performance" | "journey";
export type TlYMode = "price" | "pct";
export interface TlOverlays { avg: boolean; band: boolean; execs: boolean; transitions: boolean }

// one plan's trajectory drawn as a mini line chart spanning its active months
function TrajectoryRow({ plan, mode, overlays, yMode = "price", yDomain = null }: {
  plan: UIPlan; mode: TlMode; overlays?: TlOverlays; yMode?: TlYMode; yDomain?: { lo: number; hi: number } | null;
}) {
  const ov = overlays || { avg: true, band: true, execs: true, transitions: true };
  const tj = planTrajectory(plan);
  const x = (t: number) => TL_NAMEW + t * TL_COLW + TL_COLW * 0.5;
  const rowTop = 6, rowH = TL_ROWH - 12;
  const pts = tj.samples;
  const isPct = yMode === "pct";
  const base = pts[0] ? pts[0].mkt : 1;
  const conv = (v: number) => (isPct ? (v / base - 1) * 100 : v);
  const vals = pts.map((s) => s.mkt).concat(pts.filter((s) => s.avg != null).map((s) => s.avg as number));
  let lo: number, hi: number;
  if (isPct && yDomain) { lo = yDomain.lo; hi = yDomain.hi; }
  else { lo = Math.min(...vals); hi = Math.max(...vals); }
  const vspan = (hi - lo) || 1;
  const y = (v: number) => rowTop + rowH - ((conv(v) - lo) / vspan) * rowH;
  const mktLine = pts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ");
  const avgPts = pts.filter((s) => s.avg != null);
  const avgLine = avgPts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.avg as number).toFixed(1)}`).join(" ");
  // P/L shaded band between mkt & avg, split into win/loss segments
  const bandSegs: { win: boolean; rows: typeof pts }[] = [];
  if (avgPts.length) {
    let cur: { win: boolean; rows: typeof pts } | null = null;
    pts.forEach((s) => {
      if (s.avg == null) { if (cur) { bandSegs.push(cur); cur = null; } return; }
      const win = s.mkt >= s.avg;
      if (!cur || cur.win !== win) { if (cur) bandSegs.push(cur); cur = { win, rows: [] }; }
      cur.rows.push(s);
    });
    if (cur) bandSegs.push(cur);
  }
  const won = tj.won;
  const lineColor = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  // journey mode: status active at each sample → status-colored line segments
  const statusAt = (tt: number) => { let st = tj.transitions[0] ? tj.transitions[0].status : "research"; tj.transitions.forEach((tr) => { if (tr.t <= tt) st = tr.status; }); return st; };
  const journeySegs: { st: string; rows: typeof pts }[] = [];
  if (mode === "journey") {
    let cur: { st: string; rows: typeof pts } | null = null;
    pts.forEach((s) => { const st = statusAt(s.t); if (!cur || cur.st !== st) { if (cur) journeySegs.push(cur); cur = { st, rows: [] }; if (journeySegs.length) cur.rows.push(pts[pts.indexOf(s) - 1] || s); } cur.rows.push(s); });
    if (cur) journeySegs.push(cur);
  }
  return (
    <g>
      {ov.band && mode !== "journey" && bandSegs.map((seg, i) => {
        if (seg.rows.length < 2) return null;
        const top = seg.rows.map((s) => `${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`);
        const bot = seg.rows.slice().reverse().map((s) => `${x(s.t).toFixed(1)} ${y(s.avg as number).toFixed(1)}`);
        const d = `M${top.join(" L")} L${bot.join(" L")} Z`;
        return <path key={i} d={d} fill={seg.win ? "var(--pos)" : "var(--neg)"} opacity="0.13" />;
      })}
      {ov.avg && mode !== "journey" && avgPts.length > 1 && <path d={avgLine} fill="none" stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 2.5" opacity="0.7" />}
      {mode === "journey"
        ? journeySegs.map((seg, i) => seg.rows.length < 2 ? null : <path key={"j" + i} d={seg.rows.map((s, j) => `${j ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ")} fill="none" stroke={(PLAN_STATUS[seg.st as PlanStatus] || {}).color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />)
        : <path d={mktLine} fill="none" stroke={lineColor} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />}
      {ov.execs && tj.execs.map((e, i) => {
        const px = x(e.t), s = pts.reduce((a, b) => (Math.abs(b.t - e.t) < Math.abs(a.t - e.t) ? b : a));
        return <circle key={"e" + i} cx={px} cy={y(s.mkt)} r={mode === "journey" ? 3 : 2.6} fill={e.side === "buy" ? "var(--r-active)" : "var(--r-closing)"} stroke="var(--bg-app)" strokeWidth="1.2" />;
      })}
      {ov.transitions && tj.transitions.map((tr, i) => {
        const px = x(tr.t);
        return <g key={"t" + i}>
          <line x1={px} y1={rowTop - 2} x2={px} y2={rowTop + rowH + 2} stroke={(PLAN_STATUS[tr.status as PlanStatus] || {}).color} strokeWidth={mode === "journey" ? 1.5 : 1} opacity={mode === "journey" ? 0.5 : 0.26} strokeDasharray={mode === "journey" ? "" : "2 2"} />
          {mode === "journey" && i > 0 && <circle cx={px} cy={rowTop + rowH / 2} r="3.5" fill={(PLAN_STATUS[tr.status as PlanStatus] || {}).color} stroke="var(--bg-app)" strokeWidth="1.5" />}
        </g>;
      })}
      {plan.closedAt && <circle cx={x(tj.endT)} cy={y(tj.endPrice)} r="3.5" fill="var(--r-closed)" stroke="var(--bg-app)" strokeWidth="1.5" />}
    </g>
  );
}

interface Entry { type: "head" | "plan"; plan?: UIPlan; label?: string; dot?: string; statusKey?: PlanStatus; count?: number; top: number }

export function TimelineView({ plans, t, lang, onOpen, mode: modeProp, setMode: setModeProp, ordering = "return", grouping = "none", overlays, yMode = "price", portfolios }: {
  plans: UIPlan[]; t: I18nDict; lang: Lang; onOpen: (p: UIPlan) => void;
  mode?: TlMode; setMode?: (m: TlMode) => void; ordering?: Ordering; grouping?: Grouping;
  overlays?: TlOverlays; yMode?: TlYMode; portfolios: PfLite[];
}) {
  const [modeLocal, setModeLocal] = useState<TlMode>("performance");
  const mode = modeProp || modeLocal;
  const setMode = setModeProp || setModeLocal;
  const [hover, setHover] = useState<{ plan: UIPlan; top: number; t: number; clientX: number; clientY: number } | null>(null);
  const width = TL_MONTHS.length * TL_COLW;
  const H_HEAD = 34;
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const todayX = TL_NAMEW + TODAY_T * TL_COLW + TL_COLW * 0.5;
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth + 80); }, [todayX]);

  const buildGroups = () => {
    if (grouping === "status") return STATUS_ORDER.map((st) => ({ label: t["s_" + st], statusKey: st as PlanStatus, dot: undefined as string | undefined, items: plans.filter((p) => p.status === st) })).filter((g) => g.items.length);
    if (grouping === "strategy") {
      const gs = EXEC_STRATEGIES.map((s) => ({ label: s.name[lang], dot: s.color as string | undefined, statusKey: undefined as PlanStatus | undefined, items: plans.filter((p) => p.execId === s.id) })).filter((g) => g.items.length);
      const none = plans.filter((p) => !p.execId); if (none.length) gs.push({ label: t.noStrategy, dot: undefined, statusKey: undefined, items: none });
      return gs;
    }
    if (grouping === "portfolio") return portfolios.map((pf) => ({ label: pf.name, dot: pf.color as string | undefined, statusKey: undefined as PlanStatus | undefined, items: plans.filter((p) => p.portfolioId === pf.id) })).filter((g) => g.items.length);
    return null;
  };
  const entries: Entry[] = []; let yAcc = 0;
  const grp = grouping === "none" ? null : buildGroups();
  if (!grp) {
    orderPlans(plans, ordering, lang).forEach((p) => { entries.push({ type: "plan", plan: p, top: yAcc }); yAcc += TL_ROWH; });
  } else {
    grp.forEach((g) => {
      entries.push({ type: "head", label: g.label, dot: g.dot, statusKey: g.statusKey, count: g.items.length, top: yAcc }); yAcc += H_HEAD;
      orderPlans(g.items, ordering, lang).forEach((p) => { entries.push({ type: "plan", plan: p, top: yAcc }); yAcc += TL_ROWH; });
    });
  }
  const totalH = yAcc;
  const planEntries = entries.filter((e) => e.type === "plan");

  // shared % domain (pct mode) so rows are comparable on one scale
  let yDomain: { lo: number; hi: number } | null = null;
  if (yMode === "pct") {
    let mn = 0, mx = 0;
    plans.forEach((p) => { const tj = planTrajectory(p); const b = tj.samples[0] ? tj.samples[0].mkt : 1; tj.samples.forEach((s) => { const pc = (s.mkt / b - 1) * 100; if (pc < mn) mn = pc; if (pc > mx) mx = pc; if (s.avg != null) { const pa = (s.avg / b - 1) * 100; if (pa < mn) mn = pa; if (pa > mx) mx = pa; } }); });
    const pad = (mx - mn) * 0.1 || 5; yDomain = { lo: mn - pad, hi: mx + pad };
  }

  const xToT = (px: number) => (px - TL_NAMEW - TL_COLW * 0.5) / TL_COLW;
  const onMove = (e: React.MouseEvent) => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (px < TL_NAMEW) { setHover(null); return; }
    const ent = planEntries.find((en) => py >= en.top && py < en.top + TL_ROWH);
    if (!ent || !ent.plan) { setHover(null); return; }
    const tt = Math.max(0, Math.min(9.99, xToT(px)));
    setHover({ plan: ent.plan, top: ent.top, t: tt, clientX: e.clientX, clientY: e.clientY });
  };

  let tip: { plan: UIPlan; mkt: number; avg: number | null; pl: number | null; month: string; x: number; y: number } | null = null;
  if (hover) {
    const p = hover.plan;
    const tj = planTrajectory(p);
    if (hover.t >= tj.startT - 0.3 && hover.t <= Math.max(tj.endT, tj.todayT) + 0.3) {
      const s = tj.samples.reduce((a, b) => (Math.abs(b.t - hover.t) < Math.abs(a.t - hover.t) ? b : a));
      const pl = s.avg != null ? ((s.mkt / s.avg - 1) * 100) : null;
      const mi = Math.max(0, Math.min(9, Math.round(hover.t)));
      tip = { plan: p, mkt: s.mkt, avg: s.avg, pl, month: TL_MONTH_LABEL[TL_MONTHS[mi]][lang], x: hover.clientX, y: hover.clientY };
    }
  }

  return (
    <div className="tl-wrap">
      <div className="tl-ctrl">
        <span style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)" }}>{mode === "journey" ? (lang === "ko" ? "여정 타임라인" : "Journey") : (lang === "ko" ? "성과 타임라인" : "Performance")}{yMode === "pct" ? " · %" : ""}</span>
        <div className="tl-legend">
          {mode === "journey" ? <>
            {(["research", "active", "paused", "closing", "closed"] as PlanStatus[]).map((s) => (
              <span key={s}><i style={{ background: (PLAN_STATUS[s] || {}).color }} />{t["s_" + s]}</span>
            ))}
          </> : <>
            <span><i style={{ background: "var(--pos)" }} />{lang === "ko" ? "수익" : "Profit"}</span>
            <span><i style={{ background: "var(--neg)" }} />{lang === "ko" ? "손실" : "Loss"}</span>
            <span><i className="tl-leg-dash" />{lang === "ko" ? "평단가" : "Avg cost"}</span>
            <span><i style={{ background: "var(--r-active)" }} />{lang === "ko" ? "매수" : "Buy"}</span>
            <span><i style={{ background: "var(--r-closing)" }} />{lang === "ko" ? "매도" : "Sell"}</span>
          </>}
        </div>
        <div className="tl-zoom">
          {([["performance", lang === "ko" ? "성과" : "Performance"], ["journey", lang === "ko" ? "여정" : "Journey"]] as [TlMode, string][]).map(([z, lab]) => (
            <div key={z} className={"seg" + (mode === z ? " active" : "")} style={{ height: 26, fontSize: 12 }} onClick={() => setMode(z)}>{lab}</div>
          ))}
        </div>
      </div>
      <div className="tl-scroll" ref={scrollRef}>
        <div style={{ minWidth: TL_NAMEW + width, position: "relative" }}>
          <div className="tl-axis">
            <div className="tl-month" style={{ width: TL_NAMEW, borderLeft: 0, position: "sticky", left: 0, background: "var(--bg-app)", zIndex: 5 }} />
            {TL_MONTHS.map((m) => <div key={m} className="tl-month" style={{ width: TL_COLW }}><span className="tl-mlabel">{TL_MONTH_LABEL[m][lang]}</span></div>)}
          </div>
          <div style={{ position: "relative" }} ref={areaRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <div className="tl-today" style={{ left: todayX, top: 0, bottom: 0 }} />
            <div className="tl-today-pill" style={{ left: todayX }}>{lang === "ko" ? "오늘" : "Today"}</div>
            {hover && <div className="tl-crosshair" style={{ left: TL_NAMEW + hover.t * TL_COLW + TL_COLW * 0.5, top: 0, height: totalH }} />}
            {hover && <div className="tl-rowhi" style={{ top: hover.top, height: TL_ROWH, left: TL_NAMEW, width: width }} />}
            {entries.map((en, i) => {
              if (en.type === "head") {
                return <div className="tl-group-head" key={"h" + i} style={{ height: H_HEAD }}>
                  {en.dot && <span className="pf-dot" style={{ background: en.dot }} />}{en.statusKey && <StatusIcon status={en.statusKey} size={13} />}<span className="tl-group-lab">{en.label}</span><span className="tl-group-count">{en.count}</span>
                </div>;
              }
              const p = en.plan!, ret = planReturn(p);
              return <div className="tl-prow" key={p.dbId} style={{ height: TL_ROWH }} onClick={() => onOpen(p)}>
                <div className="tl-name" style={{ width: TL_NAMEW, height: TL_ROWH }}>
                  <StatusIcon status={p.status} size={14} />
                  <span className="tl-nm">
                    <span className="tl-nm-title"><Flag market={p.cur === "KRW" ? "KR" : "US"} size={13} /> {p.tickerName[lang]}</span>
                    <span className="tl-nm-sub mono">{p.ticker} · {t["s_" + p.status]}</span>
                  </span>
                  <span className={"tl-nm-ret mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
                </div>
              </div>;
            })}
            <svg className="tl-traj-svg" style={{ left: 0, top: 0, width: TL_NAMEW + width, height: totalH }} width={TL_NAMEW + width} height={totalH}>
              {planEntries.map((en) => (
                <g key={en.plan!.dbId} transform={`translate(0 ${en.top})`}>
                  <TrajectoryRow plan={en.plan!} mode={mode} overlays={overlays} yMode={yMode} yDomain={yDomain} />
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
      {tip && <div className="tl-tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 180), top: tip.y + 14 }}>
        <div className="tl-tip-head">{tip.plan.tickerName[lang]} · <span className="mono">{tip.month}</span></div>
        <div className="tl-tip-row"><span>{lang === "ko" ? "시장가" : "Market"}</span><span className="mono">{fmtMoney(Math.round(tip.mkt), tip.plan.cur)}</span></div>
        {tip.avg != null && <div className="tl-tip-row"><span>{lang === "ko" ? "평단가" : "Avg cost"}</span><span className="mono">{fmtMoney(Math.round(tip.avg), tip.plan.cur)}</span></div>}
        {tip.pl != null ? <div className="tl-tip-row"><span>{lang === "ko" ? "손익" : "P/L"}</span><span className={"mono " + (tip.pl >= 0 ? "pos" : "neg")}>{tip.pl >= 0 ? "+" : ""}{tip.pl.toFixed(1)}%</span></div>
        : <div className="tl-tip-row"><span style={{ color: "var(--fg-4)" }}>{lang === "ko" ? "미보유" : "No position"}</span></div>}
      </div>}
    </div>
  );
}
