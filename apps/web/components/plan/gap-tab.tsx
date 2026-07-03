// source/DetailView.jsx GapTab(2548~2960) 이식 — 시나리오 탭의 히어로 괴리 차트.
// 내재가치(내 기준 목표가 계단선) vs 시장가 시계열, 그 사이 '갭'을 시각화한다.
// 데이터 소스: plan.priceHistory/ivHistory/scenarioHistory 대신 gapHistory(plan) mock 이음새.
// (마일스톤 6에서 실 히스토리로 교체 — trajectory.ts와 동일 성격.)
// part 분기: "track" → 헤드라인+PlanValueBar(hero head)만 렌더, "head" → 차트+메모만 렌더.
// onPatchPlan/onUpdateScenario/onGotoValuation 는 이번 이식에선 호출부가 넘기지 않으므로
// optional + 가드 처리 — 편집/뮤테이션은 후속 증분에서 서버 액션으로 배선한다.
"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import type { I18nDict, Lang, Scenario } from "@keystone/core/types";
import { STRATEGIES } from "@keystone/core/reference";
import { gaugeData, planActionLines } from "@keystone/core/analytics";
import { fmtMoney, fmtCompact } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { MiniDropdown } from "./mini-dropdown";
import { gapHistory } from "@/lib/gap-history";
import type { UIPlan } from "@/lib/plan-mapper";

/* ---- EditableNum — 목표가 인라인 편집(현재가 대비 퀵칩). 이번 이식에선 onCommit이 optional. ---- */
function EditableNum({
  value, cur, onCommit, cls, quickBase, lang,
}: {
  value: number; cur: UIPlan["cur"]; onCommit?: (v: number) => void; cls?: string; quickBase?: number; lang: Lang;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const ko = lang === "ko";
  const clickEdit = ko ? "클릭해 목표가 수정" : "Click to edit target";
  const curLabel = ko ? "현재가" : "Now";
  const quickTip = ko ? "현재가 대비 빠른 설정" : "Quick-set vs current price";
  const rnd = (x: number) => cur === "USD" ? Math.round(x * 100) / 100 : Math.round(x / 100) * 100;
  if (editing) {
    const chips = quickBase && quickBase > 0 ? [-20, -10, 0, 10, 20, 30] : null;
    return (
      <span className="sc-edit-pop">
        <input className="sc-target-input mono" type="number" autoFocus value={v}
          onChange={(e) => setV(Number(e.target.value) || 0)}
          onBlur={() => { setEditing(false); if (v > 0 && v !== value) onCommit?.(v); else setV(value); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") { e.stopPropagation(); setV(value); setEditing(false); } }} />
        {chips && <span className="sc-edit-chips" title={quickTip}>
          {chips.map((p) => <button key={p} className={"sc-edit-chip" + (p === 0 ? " base" : "")}
            onMouseDown={(e) => { e.preventDefault(); const nv = rnd((quickBase as number) * (1 + p / 100)); setV(nv); setEditing(false); if (nv > 0 && nv !== value) onCommit?.(nv); }}>
            {p === 0 ? curLabel : (p > 0 ? "+" : "") + p + "%"}</button>)}
        </span>}
      </span>
    );
  }
  return <span className={(cls || "") + " editable"} onClick={() => setEditing(true)} title={clickEdit}>
    {fmtMoney(value, cur)}
    <svg className="edit-pen" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /></svg>
  </span>;
}

/* ---- PlanValueBar — 시나리오 범위 바(핀 드래그). GapTab hero head에서 사용. ---- */
function PlanValueBar({
  plan, t, lang, onUpdateScenario, onPatchPlan, title,
}: {
  plan: UIPlan; t: I18nDict; lang: Lang;
  onUpdateScenario?: (id: string, idx: number, patch: Record<string, unknown>) => void;
  onPatchPlan?: (id: string, patch: Record<string, unknown>) => void;
  title?: string;
}) {
  const g = gaugeData(plan);
  const fmtT = (n: number) => fmtCompact(n, plan.cur);
  const buys = (plan.executions || []).filter((e) => e.side === "buy");
  const entryPx = buys.length ? buys.reduce((a, b) => ((a.round ?? 99) <= (b.round ?? 99) ? a : b)).price : null;
  const roundN = plan.round || buys.length;
  const roundTxt = roundN > 0 ? (plan.divisions ? `${roundN}/${plan.divisions}${t.roundUnit}` : `${roundN}${t.roundUnit}`) : null;
  const avgLabel = plan.avgPrice == null ? t.avg : [
    entryPx != null && Math.abs(entryPx - plan.avgPrice) > 0.001 ? `${t.entry} ${fmtT(entryPx)}` : null,
    `${t.avg} ${fmtT(plan.avgPrice)}`,
    roundTxt,
  ].filter(Boolean).join("  ·  ");
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ idx: number; lo: number; hi: number } | null>(null);
  const startDrag = (sc: Scenario) => (e: React.PointerEvent) => {
    if (!onUpdateScenario || !barRef.current || !g) return;
    const idx = plan.scenarios.indexOf(sc);
    if (idx < 0) return;
    e.preventDefault();
    dragRef.current = { idx, lo: g.lo, hi: g.hi };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current; if (!d || !barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onUpdateScenario(plan.id, d.idx, { target: v });
    };
    const up = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const startDragLine = (key: "sl" | "tp") => (e: React.PointerEvent) => {
    if (!onPatchPlan || !barRef.current || !g) return;
    e.preventDefault(); e.stopPropagation();
    const d = { lo: g.lo, hi: g.hi };
    const move = (ev: PointerEvent) => {
      if (!barRef.current) return;
      const r = barRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      let v = d.lo + f * (d.hi - d.lo);
      v = plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 100) * 100;
      if (v > 0) onPatchPlan(plan.id, key === "sl" ? { slPrice: v } : { tpPrice: v });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="sc-range">
      <div className="sc-range-head">
        <span className="sc-range-title">{title || (lang === "ko" ? "시나리오 범위" : "Scenario range")}</span>
        <span className="sc-range-hint">{lang === "ko" ? "핀을 드래그해 목표가 수정" : "Drag pins to edit targets"}</span>
        <span className="sc-range-now">{t.now} · <b className="mono" style={{ color: "var(--fg)" }}>{fmtMoney(plan.currentPrice, plan.cur)}</b></span>
      </div>
      <div className="sc-bar" ref={barRef}>
        {g && <>
          {(() => { const atPos = (v: number) => Math.max(0, Math.min(100, (v - g.lo) / (g.hi - g.lo) * 100)); const lines = planActionLines(plan); return <>
            {lines.sl != null && <div className="sc-bar-tick sl draggable" onPointerDown={startDragLine("sl")} style={{ left: atPos(lines.sl) + "%" }} data-label={t.stopLoss + " " + fmtT(lines.sl)} title={t.tip_actionDrag} />}
            {lines.tp != null && <div className="sc-bar-tick tp draggable" onPointerDown={startDragLine("tp")} style={{ left: atPos(lines.tp) + "%" }} data-label={t.takeProfit + " " + fmtT(lines.tp)} title={t.tip_actionDrag} />}
            {g.avgPos != null && g.avgPrice != null && <div className="sc-bar-avg" style={{ left: g.avgPos + "%" }} data-label={t.avg + " " + fmtT(g.avgPrice)} data-tip={avgLabel} />}
          </>; })()}
          <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bear)} data-label={g.bear.label[lang] + " " + fmtT(g.bear.target)} style={{ left: g.bearPos + "%", background: "var(--r-bear)" }} />
          {g.base && <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.base)} data-label={g.base.label[lang] + " " + fmtT(g.base.target)} style={{ left: g.basePos + "%", background: "var(--r-base)" }} />}
          <div className="sc-bar-pin draggable" onPointerDown={startDrag(g.bull)} data-label={g.bull.label[lang] + " " + fmtT(g.bull.target)} style={{ left: g.bullPos + "%", background: "var(--r-bull)" }} />
          {plan.scenarios.map((s, i) => {
            if (["Bull", "Base", "Bear"].includes(s.label.en)) return null;
            const pos = Math.max(0, Math.min(100, (s.target - g.lo) / (g.hi - g.lo) * 100));
            return <div key={"cust" + i} className="sc-bar-pin custom draggable" onPointerDown={startDrag(s)} data-label={s.label[lang] + " " + fmtT(s.target)} style={{ left: pos + "%", background: s.color }} />;
          })}
          <div className="sc-bar-marker" data-label={fmtT(g.primary)} data-hover={(g.isExit ? (t.exitL || t.current) : t.current) + " " + fmtT(g.primary) + (g.avgPrice ? " · " + (lang === "ko" ? "평단 대비 " : "vs avg ") + ((g.primary / g.avgPrice - 1) >= 0 ? "+" : "") + ((g.primary / g.avgPrice - 1) * 100).toFixed(1) + "%" : "")} style={{ left: g.pos + "%" }} />
        </>}
      </div>
    </div>
  );
}

/* ---- 괴리(Gap) 탭 — 내재가치 vs 가격 시계열이 히어로 ---- */
type GapPrefs = {
  show: Record<string, boolean>;
  style: Record<string, string>;
};
const GAP_PREFS_DEFAULT: GapPrefs = { show: { bull: true, base: true, bear: true, fair: true, price: true, fills: true, notes: true, rules: true }, style: { bull: "dash", base: "solid", bear: "dash" } };
function gapPrefsLoad(): GapPrefs {
  try {
    const s = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem("keystone-gapchart-prefs")) || "{}");
    return { show: { ...GAP_PREFS_DEFAULT.show, ...(s.show || {}), bull: true, base: true, bear: true, fair: true, price: true }, style: { ...GAP_PREFS_DEFAULT.style, ...(s.style || {}) } };
  } catch { return { show: { ...GAP_PREFS_DEFAULT.show }, style: { ...GAP_PREFS_DEFAULT.style } }; }
}

export function GapTab({
  plan, t, lang, onPatchPlan, onUpdateScenario, part, onGotoValuation,
}: {
  plan: UIPlan; t: I18nDict; lang: Lang;
  part?: "track" | "head";
  onPatchPlan?: (id: string, patch: Record<string, unknown>) => void;
  onUpdateScenario?: (id: string, idx: number, patch: Record<string, unknown>) => void;
  onGotoValuation?: () => void;
}) {
  const [hov, setHov] = useState<{ i: number; left: number } | null>(null);
  const [fillHov, setFillHov] = useState<number | null>(null);
  const [evtHov, setEvtHov] = useState<number | null>(null);
  const [entryHov, setEntryHov] = useState(false);
  const [gapPrefs, setGapPrefs] = useState<GapPrefs>(gapPrefsLoad);
  const [gapDisp, setGapDisp] = useState(false);
  const setPref = (patch: Partial<GapPrefs>) => setGapPrefs((p) => { const nx = { show: { ...p.show, ...(patch.show || {}) }, style: { ...p.style, ...(patch.style || {}) } }; try { localStorage.setItem("keystone-gapchart-prefs", JSON.stringify(nx)); } catch { /* SSR/차단 환경 무시 */ } return nx; });
  const lineAttrs = (kind: string) => { const s = gapPrefs.style[kind] || "solid"; return { strokeDasharray: s === "dash" ? "4 3" : undefined, strokeWidth: s === "thick" ? (kind === "base" ? 3.4 : 2.4) : (kind === "base" ? 2.5 : 1.5) }; };
  const mode = "gap";
  const [range, setRange] = useState("all");
  const [gapRef, setGapRef] = useState("base");
  const fwModel = (STRATEGIES.find((s) => s.id === plan.strategyId) || ({} as { model?: string })).model || "PER";
  const FW_BAND: Record<string, string> = { PER: "PER", PBR: "PBR", PSR: "PSR", EV: "EV", DDM: "DIVY", DCF: "PER" };
  const [bandType, setBandType] = useState(FW_BAND[fwModel] || "PER");

  // ── mock 이음새: plan.priceHistory/ivHistory/scenarioHistory 대신 gapHistory(plan) 합성.
  const H = gapHistory(plan);
  const px = plan.currentPrice;
  const sc = plan.scenarios || [];
  const tOf = (en: string, fb: number) => { const s = sc.find((x) => x.label && x.label.en === en); return s ? s.target : fb; };
  const fallbackIV = plan.iv ?? H.iv;
  const baseT = tOf("Base", fallbackIV), bullT = tOf("Bull", fallbackIV * 1.25), bearT = tOf("Bear", fallbackIV * 0.75);
  const iv = baseT;
  const rBull = baseT ? bullT / baseT : 1.25, rBear = baseT ? bearT / baseT : 0.75;
  const NQ = H.priceHistory.length || 6;
  // ── B: '내 기준'선 = 내가 정한 시나리오 목표가의 스냅샷(계단식). 마지막 점은 현재 라이브 목표가.
  const sh = H.scenarioHistory.length ? H.scenarioHistory : [{ q: 0, base: iv, bull: bullT, bear: bearT }];
  const stepAt = (i: number, key: "base" | "bull" | "bear") => { let v = sh[0][key]; for (const s of sh) { if (s.q <= i) v = s[key]; } return v; };
  const basePtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? baseT : stepAt(i, "base"));
  const bullPtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? bullT : stepAt(i, "bull"));
  const bearPtsFull = Array.from({ length: NQ }, (_, i) => i === NQ - 1 ? bearT : stepAt(i, "bear"));
  const pxPtsFull = H.priceHistory.map((d, i, a) => i === a.length - 1 ? px : d.v);
  const lastSnapQ = sh[sh.length - 1].q;
  const monthsSinceReview = (NQ - 1 - lastSnapQ) * 3;
  // ── A: 펀더멘털 추정 띠. 중앙선=분기 가치 추정 흐름(ivHistory), 띠 너비=과거 멀티플 분포(fin).
  //    fin 데이터 없음(UIPlan 미보유) → 항상 ±15% 폴백(원본의 finD 분기 스킵).
  const fairBandFull = (() => {
    const mid = H.ivHistory.map((d, i, a) => i === a.length - 1 ? iv : d.v * (fallbackIV ? iv / fallbackIV : 1));
    const wLo = 0.85, wHi = 1.15;
    return { mid, lo: mid.map((v) => v * wLo), hi: mid.map((v) => v * wHi) };
  })();
  // 기간 토글: 마지막 N분기만. 1Y=4, 18M=6(전체)
  const keepN = range === "6m" ? 2 : range === "1y" ? 4 : 99;
  const sliceTail = (arr: number[]) => arr.length > keepN ? arr.slice(arr.length - keepN) : arr;
  const basePts = sliceTail(basePtsFull), bullPts = sliceTail(bullPtsFull), bearPts = sliceTail(bearPtsFull), pxPts = sliceTail(pxPtsFull);
  const fairMid = sliceTail(fairBandFull.mid), fairLo = sliceTail(fairBandFull.lo), fairHi = sliceTail(fairBandFull.hi);
  const n = basePts.length || 1;
  const ivBull = bullT, ivBear = bearT;          // 가치 범위 = 시나리오 상/하단 목표가 그대로
  const under = px < iv;
  const mosVsBear = (ivBear - px) / px * 100;               // 보수가 대비 안전마진
  // 노이즈 vs 논제 훼손 판정: 펀더멘털(추정 가치) 추세 vs 가격 추세
  const ivAgo = fairMid[0], ivNow = fairMid[fairMid.length - 1], pxAgo = pxPts[0];
  const ivTrend = ivAgo ? (ivNow - ivAgo) / ivAgo * 100 : 0;   // 펀더멘털 가치 추세
  const pxTrend = pxAgo ? (px - pxAgo) / pxAgo * 100 : 0;   // 가격 추세
  // 내 기준(목표가)이 펀더멘털과 벌어졌나 — 오래 미수정 시 검토 넛지
  const myVsFund = ivNow ? (iv - ivNow) / ivNow * 100 : 0;
  const staleReview = monthsSinceReview >= 9 && Math.abs(ivTrend) >= 7;
  let diag: { type: string; lab: string; tone: string; icon: string; msg: string };
  if (ivTrend < -5) diag = { type: "impair", lab: lang === "ko" ? "투자 논리 훼손" : "Thesis impaired", tone: "neg", icon: "alert-triangle", msg: lang === "ko" ? `펀더멘털 추정이 ${ivTrend.toFixed(0)}% 하락했습니다. 가격이 아니라 실적이 약해진 것 — 투자 논리를 재검토하세요.` : `The fundamental estimate fell ${ivTrend.toFixed(0)}%. Fundamentals — not just price — weakened. Re-examine the thesis.` };
  else if (under && pxTrend < -8 && ivTrend >= -5) diag = { type: "noise", lab: lang === "ko" ? "노이즈 · 기회" : "Noise · opportunity", tone: "pos", icon: "shield-check", msg: lang === "ko" ? `펀더멘털 추정은 ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%인데 가격만 ${pxTrend.toFixed(0)}% 빠졌습니다. 투자 논리가 유효하다면 저평가 매수 기회입니다.` : `Fundamentals held (${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%) while price dropped ${pxTrend.toFixed(0)}%. If the thesis holds, this is an opportunity.` };
  else diag = { type: "track", lab: lang === "ko" ? "동행 중" : "On track", tone: "neutral", icon: "activity", msg: lang === "ko" ? `펀더멘털 추정(${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%)과 가격(${pxTrend >= 0 ? "+" : ""}${pxTrend.toFixed(0)}%)이 함께 움직이고 있습니다.` : `Value and price are moving together.` };
  const all = bullPts.concat(bearPts, pxPts, fairHi, fairLo);
  const max = Math.max(...all) * 1.04, min = Math.min(...all) * 0.96;
  const W = 760, H2 = 285, PX = 10, TOP = 26, BOT = 30;
  const x = (i: number) => PX + (W - 2 * PX) * i / (n - 1);
  const y = (v: number) => TOP + (H2 - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const splineXY = (P: { X: number; Y: number }[]) => { if (P.length < 2) return ""; let d = `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; const c1x = p1.X + (p2.X - p0.X) / 6, c1y = p1.Y + (p2.Y - p0.Y) / 6, c2x = p2.X - (p3.X - p1.X) / 6, c2y = p2.Y - (p3.Y - p1.Y) / 6; d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.X.toFixed(1)} ${p2.Y.toFixed(1)}`; } return d; };
  const path = (pts: number[]) => splineXY(pts.map((v, i) => ({ X: x(i), Y: y(v) })));
  const stepPathFn = (pts: number[]) => { if (!pts.length) return ""; let d = `M${x(0).toFixed(1)} ${y(pts[0]).toFixed(1)}`; for (let i = 1; i < pts.length; i++) { d += ` L${x(i).toFixed(1)} ${y(pts[i - 1]).toFixed(1)} L${x(i).toFixed(1)} ${y(pts[i]).toFixed(1)}`; } return d; };
  const fairLoRev = fairLo.map((v, i) => ({ X: x(i), Y: y(v) })).reverse();
  const band = `${path(fairHi)} L${splineXY(fairLoRev).slice(1)} Z`;
  const qlab = (() => { const now = new Date(2026, 5, 1); const cy = now.getFullYear(), cm = now.getMonth(); const N = basePtsFull.length || 6; const out: string[] = []; for (let k = N - 1; k >= 0; k--) { const d = new Date(cy, cm - k * 3, 1); out.push(`${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}`); } return out; })();
  const gapColor = under ? "var(--pos)" : "var(--neg)";
  const pxRev = pxPts.map((v, i) => ({ X: x(i), Y: y(v) })).reverse();
  const gapArea = `${stepPathFn(basePts)} L${splineXY(pxRev).slice(1)} Z`;
  const bandLabel = (b: string) => (b === "EV" ? "EV/EBITDA" : b === "DIVY" ? (lang === "ko" ? "배당수익률" : "Div. yield") : b) + " " + (lang === "ko" ? "밴드" : "band");
  const gapNow = (px - iv) / iv * 100;
  const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  // 내 매수(진입) 시점 → 차트 x좌표 (computeLedger 없음 → hasCF=false, 첫 매수일 사용)
  const entryDate = (() => { if (!plan.avgPrice) return null; const buys = (plan.executions || []).filter((e) => e.side === "buy").slice().reverse(); const es = buys.length ? buys[0].date : plan.createdAt; if (!es) return null; const m = es.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null; const ref = new Date(2026, 5, 10); let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]); return d; })();
  const nowDate = new Date(2026, 5, 1), firstDate = new Date(2026, 5 - (n - 1) * 3, 1);
  const entryFrac = entryDate ? (entryDate.getTime() - firstDate.getTime()) / ((nowDate.getTime() - firstDate.getTime()) || 1) : null;
  const xEntry = entryFrac != null ? PX + (W - 2 * PX) * Math.max(0, Math.min(1, entryFrac)) : null;
  const showEntry = entryFrac != null && entryFrac >= -0.05 && entryFrac <= 1.05;
  const entryLab = entryDate ? `${String(entryDate.getFullYear()).slice(2)}.${String(entryDate.getMonth() + 1).padStart(2, "0")}.${String(entryDate.getDate()).padStart(2, "0")}` : "";
  const entryInfo = (() => { const buys = (plan.executions || []).filter((e) => e.side === "buy"); if (!buys.length || !(plan.avgPrice && plan.avgPrice > 0)) return null; const first = buys.slice().reverse()[0]; const ret = (px - plan.avgPrice) / plan.avgPrice * 100; const upToVal = (iv - plan.avgPrice) / plan.avgPrice * 100; return { entryPx: first.price, rounds: buys.length, avg: plan.avgPrice, ret, upToVal }; })();
  // 개별 체결(내 매수·매도)을 가격선 위 다이아몬드로 — "내 행동을 차트에" (date→x는 entryDate과 동일 매핑)
  const fillMarks = (() => {
    const ref = new Date(2026, 5, 10), ko = lang === "ko";
    return (plan.executions || []).map((e) => {
      if (!e.date || !(e.price > 0)) return null;
      const m = e.date.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null;
      let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]);
      const frac = (d.getTime() - firstDate.getTime()) / ((nowDate.getTime() - firstDate.getTime()) || 1);
      if (frac < -0.02 || frac > 1.04 || e.price < min || e.price > max) return null;
      const buy = e.side === "buy";
      const xp = PX + (W - 2 * PX) * Math.max(0, Math.min(1, frac));
      return { x: xp, cy: y(e.price), buy, price: e.price, qty: e.qty, leftPct: Math.max(2, Math.min(74, (xp / W) * 100)), dlab: `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`, title: (buy ? (ko ? "매수 " : "Buy ") : (ko ? "매도 " : "Sell ")) + e.qty + (ko ? "주 @ " : " @ ") + fmtMoney(e.price, plan.cur) + " · " + (MON[m[1]] + 1) + "/" + m[2] };
    }).filter(Boolean) as { x: number; cy: number; buy: boolean; price: number; qty: number; leftPct: number; dlab: string; title: string }[];
  })();
  // 논거 타임라인 이벤트 틱 — 일지 메모·룰 발동을 축 아래에 (date→x는 fillMarks와 동일)
  // notes 없음(UIPlan 미보유) → 일지 틱 없음. rules는 stubbed(last="") → 룰 틱 자연 제외.
  const eventTicks = (() => {
    const ref = new Date(2026, 5, 10), ko = lang === "ko";
    const parse = (s: string | undefined) => {
      if (!s) return null;
      if (/today|오늘/i.test(s)) return new Date(ref);
      const m = s.match(/([A-Za-z]{3})\s*(\d+)/); if (!m || MON[m[1]] == null) return null;
      let d = new Date(2026, MON[m[1]], +m[2]); if (d > ref) d = new Date(2025, MON[m[1]], +m[2]);
      return d;
    };
    const place = (d: Date) => { const frac = (d.getTime() - firstDate.getTime()) / ((nowDate.getTime() - firstDate.getTime()) || 1); if (frac < -0.02 || frac > 1.04) return null; const xp = PX + (W - 2 * PX) * Math.max(0, Math.min(1, frac)); return { x: xp, leftPct: Math.max(2, Math.min(80, (xp / W) * 100)), dlab: (d.getMonth() + 1) + "/" + d.getDate() }; };
    const out: { kind: string; x: number; leftPct: number; dlab: string; label: string; text: string }[] = [];
    (plan.notes || []).forEach((nt) => { const d = parse(nt.when && nt.when.en); if (!d) return; const p = place(d); if (!p) return; out.push({ kind: "note", ...p, label: ko ? "일지 메모" : "Journal note", text: nt.text }); });
    (plan.rules || []).filter((r) => r.last && !/never|없음/i.test(r.last)).forEach((r) => { const d = parse(r.last); if (!d) return; const p = place(d); if (!p) return; out.push({ kind: "rule", ...p, label: r.name[lang], text: r.when[lang] + " → " + r.then[lang] }); });
    return out;
  })();
  return (
    <div>
      {part !== "track" && <div className="gap-hero">
        <div className="gap-hero-head">
          <div className="gap-headline">
            {(() => { const ko = lang === "ko";
              const refOpts = [
                { value: "bull", target: bullT, name: ko ? "상단" : "bull", full: ko ? "상단 목표가" : "Bull target", color: "var(--r-bull)" },
                { value: "base", target: baseT, name: ko ? "중간" : "base", full: ko ? "중간 목표가" : "Base target", color: "var(--r-base)" },
                { value: "bear", target: bearT, name: ko ? "하단" : "bear", full: ko ? "하단 목표가" : "Bear target", color: "var(--r-bear)" },
              ];
              const RF = refOpts.find((o) => o.value === gapRef) || refOpts[0];
              const refT = RF.target; const gp = (refT - px) / px * 100;
              let tone: string, tag: string;
              if (gapRef === "base") { tone = gp >= 2 ? "pos" : gp <= -2 ? "neg" : "warn"; tag = ko ? (gp >= 2 ? "저평가" : gp <= -2 ? "고평가" : "적정") : (gp >= 2 ? "Undervalued" : gp <= -2 ? "Overvalued" : "Fair"); }
              else if (gapRef === "bull") { tone = (gp >= 3) ? "pos" : (gp <= -2 ? "pos" : "warn"); tag = ko ? (gp <= -2 ? "상단 돌파" : gp < 3 ? "상단 근접" : "상단 여력") : (gp <= -2 ? "Breakout" : gp < 3 ? "Near bull" : "Upside to bull"); }
              else { tone = gp >= 2 ? "neg" : gp >= -3 ? "warn" : "pos"; tag = ko ? (gp >= 2 ? "하단 이탈" : gp >= -3 ? "하단 근접" : "하단 위") : (gp >= 2 ? "Breaking bear" : gp >= -3 ? "Near bear" : "Above bear"); }
              const refIdx = sc.findIndex((x) => x.label && x.label.en === (gapRef === "base" ? "Base" : gapRef === "bull" ? "Bull" : "Bear"));
              const _above = px > refT, _absG = Math.abs(gp).toFixed(0), _near = Math.abs(gp) < 0.5;
              const gapPos = ko ? (_near ? ("현재가가 거의 " + RF.name + "에 닿아 있어요.") : ("현재가는 " + RF.name + "보다 " + _absG + "% " + (_above ? "위" : "아래") + "에 있어요. " + RF.name + "에 도달하려면 " + _absG + "% " + (_above ? "내려가야" : "올라가야") + " 합니다.")) : (_near ? ("Price is right at the " + RF.name + " line.") : ("Price is " + _absG + "% " + (_above ? "above" : "below") + " " + RF.name + ". It must move " + (_above ? "down" : "up") + " " + _absG + "% to reach it."));
              const gapMean = ko ? (gapRef === "bull" ? "상단은 가장 낙관적인 목표 가격입니다. 현재가가 상단보다 낮을수록 오를 여력이 큽니다." : gapRef === "base" ? "중간은 적정가 기준선입니다. 현재가가 중간보다 낮으면 저평가, 높으면 고평가입니다." : "하단은 가장 보수적인 바닥 가격입니다. 하단보다 위에 있을수록 안전합니다.") : (gapRef === "bull" ? "Bull is the most optimistic target. The further price sits below it, the more upside remains." : gapRef === "base" ? "Base is the fair-value line. Below it is undervalued, above it is overvalued." : "Bear is the conservative floor. The higher price sits above it, the safer.");
              return (
              <div className="gap-verdict-hero gap-stat">
                <div className="gap-iv-lab">{ko ? "괴리 · 현재가 vs " : "Gap · price vs "}
                  <MiniDropdown width={188} align="left"
                    trigger={<span className="gap-ref-pick"><span style={{ width: 7, height: 7, borderRadius: "50%", background: RF.color, display: "inline-block", flex: "none" }} />{RF.name}<Lic name="chevron-down" size={10} cls="icon-sm" /></span>}
                    items={refOpts.map((o) => ({ value: o.value, label: o.full + " · " + fmtMoney(o.target, plan.cur), on: o.value === gapRef, icon: <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.color, display: "inline-block", flex: "none" }} /> }))}
                    onPick={(v) => setGapRef(v ?? "base")} />
                  <span className="ind-q">?</span>
                </div>
                <div className={"gap-vh-num " + tone}>{(gp >= 0 ? "+" : "") + gp.toFixed(0) + "%"}<span className="gap-vh-tag">{tag}</span></div>
                <div className="gap-vh-iv">{RF.full}<EditableNum value={refT} cur={plan.cur} cls="gap-vh-iv-num" quickBase={px} lang={lang} onCommit={(nv) => { if (refIdx >= 0 && onUpdateScenario) onUpdateScenario(plan.id, refIdx, { target: nv }); else if (gapRef === "base" && onPatchPlan) onPatchPlan(plan.id, { iv: nv }); }} /></div>
                <span className="fin-tip"><b>{ko ? "괴리 (현재가 vs " + RF.name + ")" : "Gap (price vs " + RF.name + ")"}</b><span className="fin-tip-def">{gapPos}</span><span className="fin-tip-def" style={{ color: "var(--fg-3)", marginTop: 2 }}>{gapMean}</span><span className="fin-tip-f" style={{ color: tone === "neg" ? "var(--neg)" : tone === "warn" ? "var(--r-paused)" : "var(--pos)" }}>{ko ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{RF.name + " "}{fmtMoney(refT, plan.cur)}</span><span className="fin-tip-eg">{ko ? "비교선은 위에서 바꿀 수 있어요 — 하단·중간·상단." : "Switch the target above — bear / base / bull."}</span></span>
              </div>
              ); })()}
            <div className="gap-hl-div" />
            {(() => { const up = (bullT - px) / px * 100, dn = (ivBear - px) / px * 100, mine = plan.avgPrice && plan.avgPrice > 0 ? (bullT - plan.avgPrice) / plan.avgPrice * 100 : null; return (
              <div className="gap-rr">
                <div className={"gap-rr-item gap-stat gap-rr-clk" + (gapRef === "bull" ? " linked linked-up" : "")} onClick={() => setGapRef("bull")} role="button" tabIndex={0}>
                  <div className="gap-rr-lab"><Lic name="arrow-up-right" size={11} cls="icon-sm" color="var(--pos)" />{lang === "ko" ? "상승여력" : "Upside"}<span className="ind-q">?</span></div>
                  <div className="gap-rr-val up">{(up >= 0 ? "+" : "") + up.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "상승여력" : "Upside"}</b><span className="fin-tip-def">{lang === "ko" ? "지금 현재가에 매수해서 상단 목표가에 도달하면 기대되는 최대 상승 폭입니다." : "Max return if you buy now and price reaches the bull target."}</span><span className="fin-tip-f" style={{ color: "var(--pos)" }}>{lang === "ko" ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{lang === "ko" ? "상단 " : "bull "}{fmtMoney(bullT, plan.cur)}</span></span>
                </div>
                <div className={"gap-rr-item gap-stat gap-rr-clk" + (gapRef === "bear" ? " linked linked-dn" : "")} onClick={() => setGapRef("bear")} role="button" tabIndex={0}>
                  <div className="gap-rr-lab"><Lic name="arrow-down-right" size={11} cls="icon-sm" color="var(--neg)" />{lang === "ko" ? "하방위험" : "Downside"}<span className="ind-q">?</span></div>
                  <div className="gap-rr-val dn">{dn.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "하방위험" : "Downside"}</b><span className="fin-tip-def">{lang === "ko" ? "보수적인 하단 시나리오가 맞을 경우, 현재가에서 떨어질 수 있는 낙폭입니다." : "How far price could fall if the conservative bear scenario plays out."}</span><span className="fin-tip-f" style={{ color: "var(--neg)" }}>{lang === "ko" ? "현재가 " : "price "}{fmtMoney(px, plan.cur)}{" → "}{lang === "ko" ? "하단 " : "bear "}{fmtMoney(ivBear, plan.cur)}</span></span>
                </div>
                {mine != null && <div className="gap-rr-item gap-rr-mine gap-stat">
                  <div className="gap-rr-lab"><Lic name="user" size={11} cls="icon-sm" color="var(--fg-3)" />{lang === "ko" ? "내 평단 여력" : "My cost"}<span className="ind-q">?</span></div>
                  <div className={"gap-rr-val " + (mine >= 0 ? "up" : "dn")}>{(mine >= 0 ? "+" : "") + mine.toFixed(0)}%</div>
                  <span className="fin-tip"><b>{lang === "ko" ? "내 평단 여력" : "My cost headroom"}</b><span className="fin-tip-def">{lang === "ko" ? "내 평균 매수단가에서 상단 목표가까지 남은 여력입니다." : "Headroom from your average cost up to the bull target."}</span><span className="fin-tip-f" style={{ color: "var(--accent)" }}>{lang === "ko" ? "평단가 " : "avg "}{fmtMoney(plan.avgPrice as number, plan.cur)}{" → "}{lang === "ko" ? "상단 " : "bull "}{fmtMoney(bullT, plan.cur)}</span></span>
                </div>}
              </div>
            ); })()}
          </div>
          {plan.avgPrice && (() => {
            // 인사이트와 동일한 진입일 산정: 첫 매수 체결일(computeLedger 없음 → hasCF=false)
            const buys = (plan.executions || []).filter((e) => e.side === "buy").slice().reverse();
            const entryStr = buys.length ? buys[0].date : plan.createdAt;
            if (!entryStr) return null;
            const m = entryStr.match(/([A-Za-z]{3})\s*(\d+)/);
            if (!m || MON[m[1]] == null) return null;
            const now = new Date(2026, 5, 10);
            let yr = 2026; let d0 = new Date(yr, MON[m[1]], +m[2]); if (d0 > now) { yr = 2025; d0 = new Date(yr, MON[m[1]], +m[2]); }
            const days = Math.max(0, Math.round((now.getTime() - d0.getTime()) / 86400000));
            const dateLab = `${String(yr).slice(2)}.${String(MON[m[1]] + 1).padStart(2, "0")}.${String(+m[2]).padStart(2, "0")}`;
            return <div className="gap-dwell">
              <Lic name="calendar" size={13} cls="icon-sm" color="var(--fg-4)" />
              <span>{lang === "ko" ? `${dateLab} 매수 · ${days}일째 보유` : `Bought ${dateLab} · ${days}d held`}</span>
            </div>;
          })()}
        </div>
        <PlanValueBar plan={plan} t={t} lang={lang} onUpdateScenario={onUpdateScenario} onPatchPlan={onPatchPlan} />
      </div>}
      {part !== "head" && <Fragment>
      <div className="gap-hero">
        <div className="band-modebar">
          <span className="fcb-lab">{lang === "ko" ? "기간" : "Range"}</span>
          <div className="seg-toggle"><div className={"st" + (range === "6m" ? " active" : "")} onClick={() => setRange("6m")}>6{lang === "ko" ? "개월" : "M"}</div><div className={"st" + (range === "1y" ? " active" : "")} onClick={() => setRange("1y")}>1{lang === "ko" ? "년" : "Y"}</div><div className={"st" + (range === "all" ? " active" : "")} onClick={() => setRange("all")}>{lang === "ko" ? "전체" : "All"}</div></div>
          {(() => { const pHi = Math.max(...pxPts), pLo = Math.min(...pxPts); if (!isFinite(pHi) || pHi <= pLo) return null; const hiIdx = pxPts.indexOf(pHi), loIdx = pxPts.indexOf(pLo); const ql = qlab.slice(qlab.length - n); const rangeLbl = range === "6m" ? (lang === "ko" ? "6개월" : "6M") : range === "1y" ? (lang === "ko" ? "52주" : "52W") : (lang === "ko" ? "전체" : "All"); const ddHi = (plan.currentPrice - pHi) / pHi * 100; const upLo = (plan.currentPrice - pLo) / pLo * 100; return <span className="band-range-stat fin-term">{lang === "ko" ? "최근 범위" : "Range"} <b className="mono">{fmtCompact(pLo, plan.cur)}</b><span className="brs-dash">–</span><b className="mono">{fmtCompact(pHi, plan.cur)}</b><span className="ind-q" style={{ marginLeft: 4 }}>?</span><span className="fin-tip"><span className="gap-tip-q">{lang === "ko" ? `${rangeLbl} 범위 · 시장가` : `${rangeLbl} range`}</span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{lang === "ko" ? `${rangeLbl} 최고` : "High"} <b>{fmtMoney(pHi, plan.cur)}</b>{ql[hiIdx] && <span style={{ marginLeft: 6, color: "var(--fg-4)", fontWeight: 400 }}>{ql[hiIdx]}</span>}</span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{lang === "ko" ? `${rangeLbl} 최저` : "Low"} <b>{fmtMoney(pLo, plan.cur)}</b>{ql[loIdx] && <span style={{ marginLeft: 6, color: "var(--fg-4)", fontWeight: 400 }}>{ql[loIdx]}</span>}</span><span className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "현재가" : "Price"} <b>{fmtMoney(plan.currentPrice, plan.cur)}</b></span><span className="gap-tip-div" /><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: ddHi >= 0 ? "var(--pos)" : "var(--neg)" }} />{lang === "ko" ? "고점 대비" : "From high"} <b style={{ color: ddHi >= 0 ? "var(--pos)" : "var(--neg)" }}>{ddHi >= 0 ? "+" : ""}{ddHi.toFixed(1)}%</b></span><span className="gap-tip-row"><span className="gap-tip-dot" style={{ background: upLo >= 0 ? "var(--pos)" : "var(--neg)" }} />{lang === "ko" ? "저점 대비" : "From low"} <b style={{ color: upLo >= 0 ? "var(--pos)" : "var(--neg)" }}>{upLo >= 0 ? "+" : ""}{upLo.toFixed(1)}%</b></span></span></span>; })()}
          <span style={{ position: "relative", marginLeft: "auto" }}>
            <button className={"iconbtn" + (gapDisp ? " active" : "")} onClick={() => setGapDisp((v) => !v)} title={lang === "ko" ? "표시" : "Display"}><Lic name="sliders-horizontal" size={15} /></button>
            {gapDisp && <Fragment>
              <div className="overlay" onClick={() => setGapDisp(false)} />
              <div className="panel" style={{ position: "absolute", top: 32, right: 0, width: 248, padding: 8, zIndex: 45 }}>
                <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{lang === "ko" ? "마커" : "Markers"}</div>
                {([["fills", lang === "ko" ? "체결" : "Fills"], ["notes", lang === "ko" ? "일지" : "Notes"], ["rules", lang === "ko" ? "룰" : "Rules"]] as [string, string][]).map(([k, l]) => (
                  <div className="v-menu-item" key={k} onClick={() => setPref({ show: { [k]: !gapPrefs.show[k] } })}>
                    <span>{l}</span>
                    <span className={"toggle" + (gapPrefs.show[k] ? " on" : "")} style={{ marginLeft: "auto" }} />
                  </div>
                ))}
                <div className="v-menu-sep" style={{ margin: "6px 4px" }} />
                <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{lang === "ko" ? "목표선" : "Target lines"}</div>
                {([["bull", lang === "ko" ? "상단 선" : "Bull", "var(--r-bull)"], ["base", lang === "ko" ? "중간 선" : "Base", "var(--r-base)"], ["bear", lang === "ko" ? "하단 선" : "Bear", "var(--r-bear)"]] as [string, string, string][]).map(([k, l, col]) => (
                  <div className="disp-segrow" key={k}><span className="disp-segrow-lab" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 11, height: 3, borderRadius: 2, background: col, flex: "none" }} />{l}</span>
                    <div className="rb-modebar" style={{ margin: 0 }}>
                      {([["solid", lang === "ko" ? "실선" : "Solid"], ["dash", lang === "ko" ? "점선" : "Dash"], ["thick", lang === "ko" ? "굵게" : "Thick"]] as [string, string][]).map(([v, vl]) => <div key={v} className={"rb-mode" + (gapPrefs.style[k] === v ? " on" : "")} onClick={() => setPref({ style: { [k]: v } })}>{vl}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </Fragment>}
          </span>
        </div>
        {mode === "gap" && <Fragment>
        <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const rel = (e.clientX - r.left) / r.width * W;
          let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1)));
          i = Math.max(0, Math.min(n - 1, i));
          setHov({ i, left: (x(i) / W * 100) });
        }}>
        <svg viewBox={`0 0 ${W} ${H2}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
          <defs>
            <linearGradient id="gapBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
            </linearGradient>
            <filter id="gapGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H2 - TOP - BOT) * f} y2={TOP + (H2 - TOP - BOT) * f} stroke="var(--border)" />)}
          {[0, 0.5, 1].map((f, i) => <text key={"yl" + i} x={PX + 2} y={TOP + (H2 - TOP - BOT) * f - 4} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{fmtCompact(max - (max - min) * f, plan.cur)}</text>)}
          {gapPrefs.show.fair && <path d={band} fill="url(#gapBandGrad)" />}
          {gapPrefs.show.fair && <path d={band} fill="url(#gapBandGrad)" opacity="0.55" />}
          {gapPrefs.show.fair && <path d={path(fairMid)} fill="none" stroke="var(--fg-3)" strokeWidth="1.4" strokeDasharray="2 4" opacity="0.7" />}
          <path d={gapArea} fill={gapColor} opacity="0.13" />
          {showEntry && mode === "gap" && xEntry != null && <g>
            <line x1={xEntry} x2={xEntry} y1={TOP} y2={H2 - BOT} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="2 3" opacity="0.65" />
            <rect x={xEntry - 17} y={TOP - 15} width="34" height="13" rx="3" fill="var(--bg-elevated-2)" stroke="var(--border-strong)" strokeWidth="0.75" />
            <text x={xEntry} y={TOP - 5.5} textAnchor="middle" style={{ fill: entryHov ? "var(--fg)" : "var(--fg-2)", font: "var(--fw-semi) 9px var(--font-sans)" }}>{lang === "ko" ? "내 매수" : "Bought"}</text>
            <rect x={xEntry - 15} y={TOP - 15} width="30" height={H2 - BOT - TOP + 15} fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setEntryHov(true)} onMouseLeave={() => setEntryHov(false)} />
          </g>}
          {gapPrefs.show.bull && <path d={stepPathFn(bullPts)} fill="none" stroke="var(--r-bull)" {...lineAttrs("bull")} opacity="0.85" />}
          {gapPrefs.show.bear && <path d={stepPathFn(bearPts)} fill="none" stroke="var(--r-bear)" {...lineAttrs("bear")} opacity="0.85" />}
          {gapPrefs.show.base && <path d={stepPathFn(basePts)} fill="none" stroke="var(--r-base)" strokeWidth="3" strokeLinejoin="round" opacity="0.35" filter="url(#gapGlow)" />}
          {gapPrefs.show.base && <path d={stepPathFn(basePts)} fill="none" stroke="var(--r-base)" {...lineAttrs("base")} strokeLinejoin="round" />}
          {mode === "gap" && ([["bull", bullPts, "var(--r-bull)"], ["base", basePts, "var(--r-base)"], ["bear", bearPts, "var(--r-bear)"]] as [string, number[], string][]).filter(([k]) => gapPrefs.show[k]).map(([k, pts, col]) => pts.map((v, i) => (i > 0 && Math.abs(v - pts[i - 1]) > 0.5) ? <g key={k + "k" + i}><circle cx={x(i)} cy={y(v)} r="3.2" fill="var(--bg-app)" stroke={col} strokeWidth="1.6" /><title>{lang === "ko" ? "목표가 수정 지점" : "Target edited"}</title></g> : null))}
          {gapPrefs.show.price && <path d={path(pxPts)} fill="none" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" />}
          {mode === "gap" && gapPrefs.show.fills && fillMarks.map((fm, i) => { const on = fillHov === i; const col = fm.buy ? "var(--r-active)" : "var(--r-closing)"; return (
            <g key={"fm" + i}>
              <line x1={fm.x} x2={fm.x} y1={fm.cy} y2={H2 - BOT} stroke={col} strokeWidth="1" strokeDasharray="2 2" opacity={on ? 0.6 : 0.28} style={{ pointerEvents: "none" }} />
              <rect x={fm.x - (on ? 5 : 4.2)} y={fm.cy - (on ? 5 : 4.2)} width={on ? 10 : 8.4} height={on ? 10 : 8.4} rx="1.2" transform={`rotate(45 ${fm.x} ${fm.cy})`} fill={col} stroke="var(--bg-app)" strokeWidth="1.5" style={{ pointerEvents: "none" }} />
              <circle cx={fm.x} cy={fm.cy} r="11" fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setFillHov(i)} onMouseLeave={() => setFillHov((h) => h === i ? null : h)} />
            </g>
          ); })}
          {mode === "gap" && eventTicks.filter((ev) => gapPrefs.show[ev.kind === "rule" ? "rules" : "notes"]).map((ev, i) => { const on = evtHov === i; const col = ev.kind === "rule" ? "var(--accent)" : "var(--fg-3)"; return (
            <g key={"ev" + i}>
              <line x1={ev.x} x2={ev.x} y1={H2 - BOT} y2={H2 - BOT + 3} stroke={col} strokeWidth="1" opacity={on ? 0.9 : 0.45} style={{ pointerEvents: "none" }} />
              <foreignObject x={ev.x - 7} y={H2 - BOT + 3} width="14" height="14" style={{ overflow: "visible", pointerEvents: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, opacity: on ? 1 : 0.8 }}>
                  <Lic name={ev.kind === "rule" ? "zap" : "pencil-line"} size={on ? 13 : 11} cls="icon-sm" color={col} />
                </div>
              </foreignObject>
              <rect x={ev.x - 9} y={H2 - BOT} width="18" height={BOT} fill="transparent" style={{ pointerEvents: "all", cursor: "help" }} onMouseEnter={() => setEvtHov(i)} onMouseLeave={() => setEvtHov((h) => h === i ? null : h)} />
            </g>
          ); })}
          {showEntry && mode === "gap" && xEntry != null && plan.avgPrice != null && plan.avgPrice > 0 && plan.avgPrice >= min && plan.avgPrice <= max && <circle cx={xEntry} cy={y(plan.avgPrice)} r="3.5" fill="var(--bg-app)" stroke="var(--fg)" strokeWidth="1.5" />}
          {hov && !entryHov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H2 - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
          {hov && !entryHov && <circle cx={x(hov.i)} cy={y(basePts[hov.i])} r="4" fill="var(--r-base)" stroke="var(--bg-app)" strokeWidth="1.5" />}
          {hov && !entryHov && <circle cx={x(hov.i)} cy={y(pxPts[hov.i])} r="4" fill="var(--fg)" stroke="var(--bg-app)" strokeWidth="1.5" />}
          {!hov && <circle className="gap-pulse" cx={x(n - 1)} cy={y(basePts[basePts.length - 1])} r="4" fill="var(--r-base)" />}
          {!hov && <circle cx={x(n - 1)} cy={y(pxPts[pxPts.length - 1])} r="4" fill="var(--fg)" />}
          {!hov && (() => { const xe = x(n - 1), yv = y(basePts[n - 1]), yp = y(pxPts[n - 1]); return <g><line x1={xe} x2={xe} y1={Math.min(yv, yp)} y2={Math.max(yv, yp)} stroke={gapColor} strokeWidth="1.5" strokeDasharray="2 2" opacity="0.75" /><text x={xe - 6} y={(yv + yp) / 2 + 3} textAnchor="end" style={{ fill: gapColor, font: "var(--fw-semi) 10.5px var(--font-mono)" }}>{(gapNow >= 0 ? "+" : "") + gapNow.toFixed(0) + "%"}</text></g>; })()}
          {qlab.slice(qlab.length - n).map((q, i) => <text key={i} x={x(i)} y={H2 - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
        </svg>
        {entryHov && entryInfo && xEntry != null && (() => {
          const leftPct = Math.max(2, Math.min(74, (xEntry / W) * 100));
          return (
            <div className="gap-tip" style={{ left: leftPct + "%" }}>
              <div className="gap-tip-q">{lang === "ko" ? `내 매수 · ${entryLab} 진입` : `My entry · ${entryLab}`}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-3)" }} />{lang === "ko" ? "진입가 (첫 매수)" : "Entry (first buy)"} <b>{fmtMoney(entryInfo.entryPx, plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "평단가" : "Avg cost"} <b>{fmtMoney(entryInfo.avg, plan.cur)}</b></div>
              <div className="gap-tip-sub">{lang === "ko" ? `${entryInfo.rounds}회 분할 · 평단까지 가치여력 ${entryInfo.upToVal >= 0 ? "+" : ""}${entryInfo.upToVal.toFixed(0)}%` : `${entryInfo.rounds} buys · ${entryInfo.upToVal >= 0 ? "+" : ""}${entryInfo.upToVal.toFixed(0)}% to value`}</div>
              <div className="gap-tip-gap" style={{ color: entryInfo.ret >= 0 ? "var(--pos)" : "var(--neg)" }}>{lang === "ko" ? "평가손익 " : "P/L "}{entryInfo.ret >= 0 ? "+" : ""}{entryInfo.ret.toFixed(1)}%</div>
            </div>
          );
        })()}
        {fillHov != null && fillMarks[fillHov] && (() => { const fm = fillMarks[fillHov]; const fko = lang === "ko"; const vsPx = (px - fm.price) / fm.price * 100; return (
          <div className="gap-tip" style={{ left: fm.leftPct + "%" }}>
            <div className="gap-tip-q">{(fm.buy ? (fko ? "매수" : "Buy") : (fko ? "매도" : "Sell")) + " · " + fm.dlab}</div>
            <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: fm.buy ? "var(--r-active)" : "var(--r-closing)" }} />{fko ? "체결가" : "Fill"} <b>{fmtMoney(fm.price, plan.cur)}</b></div>
            <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{fko ? "수량" : "Qty"} <b>{fm.qty}{fko ? "주" : ""}</b></div>
            <div className="gap-tip-gap" style={{ color: vsPx >= 0 ? "var(--pos)" : "var(--neg)" }}>{fko ? "현재가 대비 " : "vs now "}{vsPx >= 0 ? "+" : ""}{vsPx.toFixed(1)}%</div>
          </div>
        ); })()}
        {evtHov != null && eventTicks[evtHov] && (() => { const ev = eventTicks[evtHov]; return (
          <div className="gap-tip" style={{ left: ev.leftPct + "%", top: "auto", bottom: "20px" }}>
            <div className="gap-tip-q"><span className="gap-tip-dot" style={{ background: ev.kind === "rule" ? "var(--r-base)" : "var(--fg-3)" }} />{ev.label} · {ev.dlab}</div>
            <div className="gap-tip-sub" style={{ maxWidth: 220, whiteSpace: "normal", lineHeight: 1.45 }}>{ev.text}</div>
          </div>
        ); })()}
        {hov && !entryHov && fillHov == null && evtHov == null && (() => {
          const ko = lang === "ko";
          const g = (basePts[hov.i] - pxPts[hov.i]) / pxPts[hov.i] * 100;
          const leftPct = Math.max(2, Math.min(78, hov.left));
          return (
            <div className="gap-tip" style={{ left: leftPct + "%" }}>
              <div className="gap-tip-q">{qlab[hov.i]}</div>
              <div className="gap-tip-cap">{ko ? "내 목표가 · 내가 정함" : "My targets"}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-bull)" }} />{ko ? "상단" : "Bull"} <b>{fmtMoney(bullPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-base)" }} />{ko ? "중간" : "Base"} <b>{fmtMoney(basePts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--r-bear)" }} />{ko ? "하단" : "Bear"} <b>{fmtMoney(bearPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-div" />
              <div className="gap-tip-cap">{ko ? "펀더멘털 추정 · 앱 계산" : "Fundamental est."}</div>
              <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-3)" }} />{ko ? "추정가" : "Est."} <b>{fairMid[hov.i] ? fmtMoney(fairMid[hov.i], plan.cur) : "—"}</b></div>
              <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{fmtMoney(pxPts[hov.i], plan.cur)}</b></div>
              <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "괴리 · 가격 vs 내 중간 " : "Gap "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
            </div>
          );
        })()}
        </div>
        <div className="gap-legend">
          <span className="gap-leg"><span style={{ display: "inline-flex", gap: 2, marginRight: 5 }}><span className="gap-leg-dot" style={{ background: "var(--r-bull)", margin: 0 }} /><span className="gap-leg-dot" style={{ background: "var(--r-base)", margin: 0 }} /><span className="gap-leg-dot" style={{ background: "var(--r-bear)", margin: 0 }} /></span>{lang === "ko" ? "내 기준 (상·중·하단)" : "My targets"}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "내 기준 · 내가 정함" : "My targets · you set them"}</b><span className="fin-tip-def">{lang === "ko" ? "시나리오 탭에서 정한 상단(초록)·중간(노랑)·하단(빨강) 목표가입니다. 계단이 진 곳은 목표가를 수정한 시점이에요." : "Bull / base / bear targets you set in Scenarios. Steps mark edits."}</span></span></span></span>
          <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-3)" }} />{lang === "ko" ? "펀더멘털 추정" : "Fundamental est."}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "펀더멘털 추정 · 앱이 계산" : "Fundamental est. · computed"}</b><span className="fin-tip-def">{lang === "ko" ? "실적(이익 등) × 과거 멀티플 분포로 계산한 참고용 가치입니다. 내 판단이 아니라 데이터가 말하는 값이에요." : "A reference value from fundamentals × historical multiples — data, not my opinion."}</span></span></span></span>
          <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{lang === "ko" ? "시장 가격" : "Market price"}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{lang === "ko" ? "시장 가격" : "Market price"}</b><span className="fin-tip-def">{lang === "ko" ? "실제 거래되는 현재 주가입니다." : "The live traded price."}</span></span></span></span>
          {gapPrefs.show.fills && fillMarks.length > 0 && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><rect x="2.2" y="2.2" width="6.6" height="6.6" rx="1.2" transform="rotate(45 5.5 5.5)" fill="var(--r-active)" stroke="var(--bg-app)" strokeWidth="1.2" /></svg></span>{lang === "ko" ? "내 체결" : "My fills"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "내 체결" : "My fills"}</b><span className="fin-tip-def">{lang === "ko" ? "내가 실제로 매수·매도한 지점. 가격선 위 다이아몬드(초록=매수·주황=매도). 점에 올리면 체결가·수량." : "Where you actually bought/sold — diamonds on the price line."}</span></span></span>}
          {gapPrefs.show.notes && eventTicks.some((e) => e.kind === "note") && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><Lic name="pencil-line" size={11} cls="icon-sm" color="var(--fg-3)" /></span>{lang === "ko" ? "일지" : "Notes"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "일지" : "Notes"}</b><span className="fin-tip-def">{lang === "ko" ? "일지에 메모를 남긴 시점. 축 아래 연필 아이콘. 올리면 그날 메모 내용." : "When you logged a journal note — pencil marks below the axis."}</span></span></span>}
          {gapPrefs.show.rules && eventTicks.some((e) => e.kind === "rule") && <span className="gap-leg fin-term"><span style={{ display: "inline-flex", marginRight: 5 }}><Lic name="zap" size={11} cls="icon-sm" color="var(--accent)" /></span>{lang === "ko" ? "룰" : "Rules"}<span className="ind-q" style={{ marginLeft: 3 }}>?</span><span className="fin-tip" style={{ left: "auto", right: 0 }}><b>{lang === "ko" ? "룰" : "Rules"}</b><span className="fin-tip-def">{lang === "ko" ? "설정한 규칙이 발동한 시점. 축 아래 번개 아이콘. 올리면 조건·동작." : "When a rule fired — lightning marks below the axis."}</span></span></span>}
        </div>
        <div className="gap-bandcap"><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{lang === "ko" ? "계단선 = 내가 정한 목표가 · 옅은 띠 = 실적이 말하는 가치(참고) · 흰선 = 시장가" : "Stepped = my target · band = value from fundamentals (ref.) · white = price"}</div>
        {(() => {
          const ko = lang === "ko";
          if (staleReview) return <div className="gap-review gr-warn"><Lic name="bell" size={13} cls="icon-sm" color="currentColor" />{ko ? `기준을 ${monthsSinceReview}개월째 안 바꿨는데, 그 사이 펀더멘털 추정은 ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}% 움직였어요. 목표가를 다시 볼 때일 수 있어요.` : `Base unchanged for ${monthsSinceReview}mo while the fundamental estimate moved ${ivTrend >= 0 ? "+" : ""}${ivTrend.toFixed(0)}%. Time to review targets?`}</div>;
          if (lastSnapQ === 0) return <div className="gap-review"><Lic name="check" size={13} cls="icon-sm" color="currentColor" />{ko ? `생성 이후 기준 변경 없음 — ${monthsSinceReview}개월째 같은 목표가를 유지 중입니다.` : `No change since creation — same target held for ${monthsSinceReview}mo.`}</div>;
          return <div className="gap-review"><Lic name="history" size={13} cls="icon-sm" color="currentColor" />{ko ? `최근 기준 수정: ${monthsSinceReview === 0 ? "이번 분기" : monthsSinceReview + "개월 전"}.` : `Last base edit: ${monthsSinceReview === 0 ? "this quarter" : monthsSinceReview + "mo ago"}.`}</div>;
        })()}
        <div className={"gap-verdict gv-" + diag.tone}>
          <Lic name={diag.icon} size={17} cls="icon-sm" color="currentColor" />
          <div><div className="gap-verdict-lab">{diag.lab}</div><div className="gap-verdict-msg">{diag.msg}</div></div>
        </div>
        </Fragment>}
        {(() => {
          const ko = lang === "ko";
          const MEMO_TYPES = [
            { key: "under", icon: "help-circle", color: "var(--fg-4)", label: { ko: "왜 저평가인가", en: "Why undervalued" }, ph: { ko: "시장이 왜 오해·무관심한지 적어두세요…", en: "Why is the market missing this…" } },
            { key: "catalyst", icon: "zap", color: "var(--r-bull)", label: { ko: "재평가 촉매", en: "Re-rating catalyst" }, ph: { ko: "무엇이 시장을 깨울지 적어두세요…", en: "What will wake the market…" } },
            { key: "over", icon: "alert-triangle", color: "var(--r-bear)", label: { ko: "왜 고평가인가", en: "Why overvalued" }, ph: { ko: "시장이 왜 과열됐는지 적어두세요…", en: "Why is the market overheating…" } },
            { key: "range", icon: "move-horizontal", color: "var(--fg-3)", label: { ko: "왜 횡보중인가", en: "Why range-bound" }, ph: { ko: "왜 방향을 못 잡고 있는지·무엇을 기다리는지 적어두세요…", en: "Why it's stuck — what the market is waiting for…" } },
            { key: "exit", icon: "log-out", color: "var(--r-closing)", label: { ko: "차익실현 근거", en: "Exit rationale" }, ph: { ko: "언제·왜 차익을 실현할지 적어두세요…", en: "When and why you'll take profit…" } },
            { key: "risk", icon: "shield-alert", color: "var(--neg)", label: { ko: "핵심 리스크", en: "Key risks" }, ph: { ko: "이 논리를 깨뜨릴 위험을 적어두세요…", en: "What could break this thesis…" } },
            { key: "assume", icon: "list-checks", color: "var(--accent)", label: { ko: "가정·체크포인트", en: "Assumptions" }, ph: { ko: "전제와 점검 항목을 적어두세요…", en: "Key assumptions to check…" } },
          ];
          const byKey = (k: string) => MEMO_TYPES.find((mm) => mm.key === k) || MEMO_TYPES[0];
          const LEFT = ["under", "over", "range"], RIGHT = ["catalyst", "exit", "risk", "assume"];
          const closing = plan.status === "closing";
          type MemoT = typeof MEMO_TYPES[number];
          const planField = (f: string): { en: string; ko: string } | undefined => (plan as unknown as Record<string, { en: string; ko: string } | undefined>)[f];
          const slot = (tp: MemoT, field: string, slotKey: string, groupKeys: string[]) => (
            <div className="gap-card">
              <div className="gap-card-h">
                <MiniDropdown width={184} trigger={<span className="gap-memo-pick"><Lic name={tp.icon} size={14} cls="icon-sm" color={tp.color} />{tp.label[lang]}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>}
                  items={groupKeys.map(byKey).map((mm) => ({ value: mm.key, label: mm.label[lang], icon: <Lic name={mm.icon} size={14} cls="icon-sm" color={mm.color} />, on: tp.key === mm.key }))}
                  onPick={(v) => onPatchPlan && onPatchPlan(plan.id, { [slotKey]: v })} />
              </div>
              <div className="gap-card-b gap-edit" contentEditable suppressContentEditableWarning data-ph={tp.ph[lang]}
                onBlur={(e) => { const v = (e.target as HTMLElement).textContent?.trim() || ""; if (onPatchPlan) onPatchPlan(plan.id, { [field]: { en: v, ko: v } }); }}>{(planField(field) || ({} as { en: string; ko: string }))[lang]}</div>
            </div>
          );
          const memo1Type = (plan as unknown as Record<string, string | undefined>).memo1Type;
          const memo2Type = (plan as unknown as Record<string, string | undefined>).memo2Type;
          return (
            <div className="gap-memos">
              <div className="gap-cards-cap"><Lic name="pencil-line" size={12} cls="icon-sm" color="var(--fg-4)" />{ko ? "내 논거 메모 — 왼쪽: 왜(진단) → 오른쪽: 그래서(전망)" : "My thesis — left: why → right: what next"}</div>
              <div className="gap-cards">
                {slot(byKey(memo1Type || (closing ? "over" : "under")), "gapReason", "memo1Type", LEFT)}
                {slot(byKey(memo2Type || (closing ? "exit" : "catalyst")), "catalyst", "memo2Type", RIGHT)}
              </div>
            </div>
          );
        })()}
      </div>
      </Fragment>}
    </div>
  );
}
