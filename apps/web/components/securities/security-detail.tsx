// source/SecurityView.jsx SecurityChart(4-75) · SeasonalityHeatmap(76-193) · SecurityDetail(194-314) 이식.
// 종목 상세 (screens/19·19b·21·22): 헤더+차트+지표행+4탭(overview/financials/indicators/valuation).
// financials/indicators/valuation 탭은 기존 컴포넌트를 합성 secPlan+fin으로 재사용(plans/[id]와 동일 prop 시그니처).
// overview 탭 = SeasonalityHeatmap + 이 종목의 플랜 목록 + 생성 버튼(defer no-op).
//
// 어댑테이션(faithful, 의도적):
//  - React.useState/useReducer/useMemo → named 훅 import. Object.assign(window,…) 제거.
//  - t/lang 은 usePrefs + I18N[lang]. spark/change 는 mock 이음새(security-mapper, 마일스톤6 실데이터 교체).
//  - 관심 토글: onToggleWatch → 서버액션 toggleWatch(ticker) + 낙관적 useState.
//  - defer(생략): 종목 메모 섹션(secNotes/addSecNote 등) — 전용 notes 테이블 없음(마일스톤 후속).
//    SecurityScenarios(266) — adhoc 시나리오 데이터모델 없음(시나리오 모니터와 동일 defer).
//    onCreatePlan — 버튼 렌더 유지, onClick no-op(defer). onAddScenario/peek/search — 미이식.
//  - SWC≠tsc 함정 회피: JSX 안 제네릭 앵글브래킷 캐스트 없음. SVG(SecurityChart/SeasonalityHeatmap 좌표)
//    계산은 전부 return 이전 함수 본문에서. cell/tone/withU 등 헬퍼는 hoist.
"use client";
import { Fragment, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import type { I18nDict, Lang } from "@keystone/core/types";
import type { Fin } from "@keystone/core/types";
import { STRATEGIES } from "@keystone/core/reference";
import { planReturn } from "@keystone/core/analytics";
import { I18N } from "@keystone/core/i18n";
import { fmtMoney, fmtMktCap, fmtShares, fmtCompact } from "@keystone/core/format";
import { Flag, Lic, StatusIcon } from "@/components/icons";
import { usePrefs } from "@/components/shell/prefs";
import type { UIPlan } from "@/lib/plan-mapper";
import type { UISecurity, SecNote } from "@/lib/security-mapper";
import { FinancialsTab } from "@/components/plan/financials-tab";
import { IndicatorsTab } from "@/components/plan/indicators-tab";
import { ValuationTab } from "@/components/plan/valuation-tab";
import { toggleWatch, addSecNote, editSecNote, deleteSecNote } from "@/app/(shell)/securities/[ticker]/actions";

/* ---- placeholder price chart (source/SecurityView.jsx 4-75) — mock spark, 실데이터 마일스톤6 ---- */
function SecurityChart({ security, height = 190 }: { security: UISecurity; height?: number }) {
  const sp = security.spark || [];
  const n = sp.length;
  const min = Math.min(...sp), max = Math.max(...sp);
  const W = 800, H = 200, pad = 12;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const line = sp.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const up = security.change >= 0;
  const col = up ? "var(--pos)" : "var(--neg)";
  return (
    <div className="sec-chart-wrap">
      <svg className="sec-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="secfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.20" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(g => <line key={g} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--border)" strokeWidth="1" />)}
        <path d={area} fill="url(#secfill)" />
        <path d={line} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(n - 1)} cy={y(sp[n - 1])} r="3.5" fill={col} stroke="var(--bg-app)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/* ---- 월별 히트맵 (source/SecurityView.jsx 76-193) — 연도×월, 지표 전환(계절성/밸류에이션 이력).
   티커 시드 deterministic mock. 실 이력은 마일스톤6에서 연동. ---- */
function seasMulberry(a: number) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seasHash(str: string) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }

interface SeasMetric { id: string; lab: { ko: string; en: string }; fam: "flow" | "level"; kind: "div" | "mono" | "pct"; unit: string; cap?: number; }
const SEAS_METRICS: SeasMetric[] = [
  { id: "return", lab: { ko: "수익률", en: "Return" }, fam: "flow", kind: "div", unit: "%", cap: 12 },
  { id: "relative", lab: { ko: "상대강도", en: "Rel. strength" }, fam: "flow", kind: "div", unit: "%", cap: 9 },
  { id: "vol", lab: { ko: "변동성", en: "Volatility" }, fam: "flow", kind: "mono", unit: "%" },
  { id: "per", lab: { ko: "PER", en: "PER" }, fam: "level", kind: "pct", unit: "×" },
  { id: "pbr", lab: { ko: "PBR", en: "PBR" }, fam: "level", kind: "pct", unit: "×" },
  { id: "psr", lab: { ko: "PSR", en: "PSR" }, fam: "level", kind: "pct", unit: "×" },
];

type Grid = (number | null)[][];
function seasBuild(security: UISecurity, curYear: number, curMonth: number): { years: number[]; grids: Record<string, Grid> } {
  const ticker = security.ticker || "X";
  const years = [curYear - 4, curYear - 3, curYear - 2, curYear - 1, curYear];
  const N = years.length, M = 12;
  const active = (yi: number, m: number) => !(years[yi] === curYear && m > curMonth);
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const rr = seasMulberry(seasHash(ticker + "ret"));
  const rBias = Array.from({ length: M }, () => (rr() - 0.5) * 9);
  const retGrid: Grid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? round1(rBias[m] + (rr() * 2 - 1) * 3) : null));
  const mr = seasMulberry(seasHash((security.market || "MKT") + "mkt"));
  const mBias = Array.from({ length: M }, () => (mr() - 0.5) * 4);
  const mktGrid: Grid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? mBias[m] + (mr() * 2 - 1) * 2.2 : null));
  const relGrid: Grid = retGrid.map((row, yi) => row.map((v, m) => v == null ? null : round1(v - (mktGrid[yi][m] as number))));
  const vr = seasMulberry(seasHash(ticker + "vol"));
  const vBias = Array.from({ length: M }, () => 14 + vr() * 22);
  const volGrid: Grid = years.map((yr, yi) => Array.from({ length: M }, (_, m) => active(yi, m) ? Math.max(6, Math.round(vBias[m] + (vr() * 2 - 1) * 7)) : null));
  const eps = security.eps ?? 0;
  const perBase = (eps > 0 && security.price > 0) ? Math.max(5, Math.min(60, security.price / eps)) : 15;
  const lr = seasMulberry(seasHash(ticker + "lvl"));
  const roe = 0.08 + lr() * 0.10, mgn = 0.05 + lr() * 0.12;
  const mkLevel = (base: number): Grid => {
    const freq = 1 + lr() * 1.4, phase = lr() * Math.PI * 2, amp = 0.16 + lr() * 0.16, noise = 0.05 + lr() * 0.05;
    return years.map((yr, yi) => Array.from({ length: M }, (_, m) => { if (!active(yi, m)) return null; const t = yi * M + m; return Math.round(base * (1 + amp * Math.sin(t / (N * M) * Math.PI * 2 * freq + phase) + noise * (lr() - 0.5) * 2) * 100) / 100; }));
  };
  const perGrid = mkLevel(perBase), pbrGrid = mkLevel(Math.max(0.4, perBase * roe)), psrGrid = mkLevel(Math.max(0.3, perBase * mgn));
  return { years, grids: { return: retGrid, relative: relGrid, vol: volGrid, per: perGrid, pbr: pbrGrid, psr: psrGrid } };
}

function SeasonalityHeatmap({ security, lang }: { security: UISecurity; lang: Lang }) {
  const ko = lang === "ko";
  const [hotCol, setHotCol] = useState<number | null>(null);
  const [metricId, setMetricId] = useState("return");
  const [pick, setPick] = useState(false);
  const curYear = 2026, curMonth = 5; // 앱 'now' ≈ 2026-06 (KS_REF 기준)
  const { years, grids } = useMemo(() => seasBuild(security, curYear, curMonth), [security.ticker, security.price, security.eps]);
  const metric = SEAS_METRICS.find(m => m.id === metricId) || SEAS_METRICS[0];
  const grid = grids[metricId];
  const isFlow = metric.fam === "flow", isDiv = metric.kind === "div", isMono = metric.kind === "mono", isPct = metric.kind === "pct";
  const monLab = ko ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monFull = ko ? monLab.map(m => m + "월") : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const cols = Array.from({ length: 12 }, (_, m) => grid.map(r => r[m]).filter((v): v is number => v != null));
  const allVals: number[] = []; grid.forEach(r => r.forEach(v => { if (v != null) allVals.push(v); }));
  const gmin = allVals.length ? Math.min(...allVals) : 0, gmax = allVals.length ? Math.max(...allVals) : 1;
  const sorted = allVals.slice().sort((a, b) => a - b);
  const pctRank = (v: number) => { if (!sorted.length) return 0.5; let c = 0; for (const x of sorted) { if (x < v) c++; else break; } return c / sorted.length; };
  const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const avgRow = cols.map(mean), medRow = cols.map(median);
  const NY = years.length;
  const latest = grid[NY - 1] ? grid[NY - 1][curMonth] : null;
  const cell = (v: number | null) => v == null ? "" : isDiv ? ((v >= 0 ? "+" : "") + (Math.abs(v) >= 10 ? Math.round(v) : v.toFixed(1))) : isMono ? Math.round(v) : v.toFixed(1);
  const withU = (v: number | null) => v == null ? "—" : (isDiv ? ((v >= 0 ? "+" : "") + (Math.abs(v) >= 10 ? Math.round(v) : v.toFixed(1))) : isMono ? Math.round(v) : v.toFixed(1)) + metric.unit;
  const tone = (v: number | null) => {
    if (v == null) return "transparent";
    if (isDiv) { const cap = metric.cap as number; const a = Math.max(-cap, Math.min(cap, v)); const c = v >= 0 ? "var(--pos)" : "var(--neg)"; return "color-mix(in srgb, " + c + " " + (Math.abs(a) / cap * 40 + 4).toFixed(0) + "%, transparent)"; }
    if (isMono) { const f = gmax > gmin ? (v - gmin) / (gmax - gmin) : 0.5; return "color-mix(in srgb, var(--accent) " + (f * 42 + 4).toFixed(0) + "%, transparent)"; }
    const dev = pctRank(v) - 0.5; const c = dev <= 0 ? "var(--pos)" : "var(--neg)"; return "color-mix(in srgb, " + c + " " + (Math.abs(dev) * 84 + 5).toFixed(0) + "%, transparent)";
  };
  const posTone = (v: number | null) => (isDiv ? (v != null && v >= 0 ? "pos" : "neg") : "");
  const gridCols = "42px repeat(12, minmax(0, 1fr))";
  const swatch = (col: string, f: number) => "color-mix(in srgb, " + col + " " + (f * 74 + 20).toFixed(0) + "%, var(--bg-elevated-2))";
  return (
    <div className="seas-wrap">
      <div className="seas-head">
        <span className="seas-title"><Lic name="calendar-range" size={14} cls="icon-sm" color="var(--accent)" />{ko ? "월별 " : "Monthly "}
          <span style={{ position: "relative" }}>
            <button className="seas-metricpick" onClick={() => setPick(v => !v)}>{metric.lab[lang]}<Lic name="chevron-down" size={12} color="currentColor" /></button>
            {pick && <Fragment>
              <div className="overlay" onClick={() => setPick(false)} />
              <div className="v-menu" style={{ position: "absolute", top: 27, left: 0, zIndex: 50, minWidth: 176 }}>
                <div className="side-cap" style={{ padding: "2px 8px 5px" }}>{ko ? "흐름 · 계절성" : "Flow · seasonal"}</div>
                {SEAS_METRICS.filter(m => m.fam === "flow").map(m => (
                  <div className="v-menu-item" key={m.id} onClick={() => { setMetricId(m.id); setPick(false); setHotCol(null); }}><span>{m.lab[lang]}</span>{metricId === m.id && <span className="check"><Lic name="check" size={14} color="currentColor" /></span>}</div>
                ))}
                <div className="v-menu-sep" />
                <div className="side-cap" style={{ padding: "2px 8px 5px" }}>{ko ? "밸류에이션 · 이력" : "Valuation · history"}</div>
                {SEAS_METRICS.filter(m => m.fam === "level").map(m => (
                  <div className="v-menu-item" key={m.id} onClick={() => { setMetricId(m.id); setPick(false); setHotCol(null); }}><span>{m.lab[lang]}</span>{metricId === m.id && <span className="check"><Lic name="check" size={14} color="currentColor" /></span>}</div>
                ))}
              </div>
            </Fragment>}
          </span>
        </span>
        <span className="seas-sub">{isFlow ? (ko ? "최근 5년 · 월간" : "5y · monthly") : (ko ? "자기 과거 대비 · 최근 5년" : "vs own history · 5y")}</span>
      </div>
      <div className="seas-grid" style={{ gridTemplateColumns: gridCols }}>
        <div className="seas-corner" />
        {monLab.map((m, i) => (
          <div key={i} className={"seas-colh" + (hotCol === i ? " hot" : "")} onMouseEnter={() => setHotCol(i)} onMouseLeave={() => setHotCol(h => h === i ? null : h)}>
            {m}
            {hotCol === i && (() => {
              const c = cols[i]; const av = mean(c), md = median(c); const pos = c.filter(v => v >= 0).length;
              const best = c.length ? Math.max(...c) : null, worst = c.length ? Math.min(...c) : null;
              const bestYr = best != null ? years[grid.findIndex(r => r[i] === best)] : null;
              const worstYr = worst != null ? years[grid.findIndex(r => r[i] === worst)] : null;
              const cls = i <= 1 ? " edge-l" : i >= 10 ? " edge-r" : "";
              return (
                <div className={"seas-tip" + cls} onMouseEnter={() => setHotCol(i)}>
                  <span className="seas-tip-h">{monFull[i]}</span>
                  <span className="seas-tip-row"><span>{ko ? "평균" : "Avg"}</span><b className={posTone(av)}>{withU(av)}</b></span>
                  <span className="seas-tip-row"><span>{ko ? "중앙값" : "Median"}</span><b className={posTone(md)}>{withU(md)}</b></span>
                  {isDiv && <span className="seas-tip-row"><span>{ko ? "상승" : "Positive"}</span><b>{pos}/{c.length}{ko ? "년" : ""}</b></span>}
                  <span className="seas-tip-row"><span>{isPct ? (ko ? "최고(비쌈)" : "High") : (ko ? "최고" : "Best")}</span><b className={isDiv ? "pos" : ""}>{withU(best)} <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>{("" + bestYr).slice(2)}</span></b></span>
                  <span className="seas-tip-row"><span>{isPct ? (ko ? "최저(저렴함)" : "Low") : (ko ? "최저" : "Worst")}</span><b className={isDiv ? "neg" : ""}>{withU(worst)} <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>{("" + worstYr).slice(2)}</span></b></span>
                </div>
              );
            })()}
          </div>
        ))}
        {grid.map((r, ri) => (
          <Fragment key={ri}>
            <div className="seas-rowh">{years[ri]}</div>
            {r.map((v, ci) => (
              <div key={ci} className={"seas-cell" + (v == null ? " empty" : "") + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>
            ))}
          </Fragment>
        ))}
      </div>
      {isFlow && <div className="seas-grid seas-aggrow" style={{ gridTemplateColumns: gridCols }}>
        <div className="seas-agg-lab">{ko ? "평균" : "Avg"}</div>
        {avgRow.map((v, ci) => <div key={"a" + ci} className={"seas-cell" + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>)}
        <div className="seas-agg-lab">{ko ? "중앙" : "Med"}</div>
        {medRow.map((v, ci) => <div key={"m" + ci} className={"seas-cell" + (hotCol === ci ? " hotcol" : "")} style={{ background: tone(v) }}>{cell(v)}</div>)}
      </div>}
      {isFlow ? (
        <div className="seas-legend">
          {isMono
            ? <span className="seas-leg">{ko ? "낮음" : "Low"}<span className="seas-leg-scale">{[0.15, 0.4, 0.65, 0.9].map(f => <span key={f} className="seas-leg-box" style={{ background: swatch("var(--accent)", f) }} />)}</span>{ko ? "높음" : "High"}</span>
            : <span className="seas-leg">{ko ? "약세" : "Weak"}<span className="seas-leg-scale">{[0.9, 0.5, 0.2].map(f => <span key={"n" + f} className="seas-leg-box" style={{ background: swatch("var(--neg)", f) }} />)}<span className="seas-leg-box" style={{ background: "var(--bg-elevated-2)" }} />{[0.2, 0.5, 0.9].map(f => <span key={"p" + f} className="seas-leg-box" style={{ background: swatch("var(--pos)", f) }} />)}</span>{ko ? "강세" : "Strong"}</span>}
          <span className="seas-leg" style={{ marginLeft: "auto", color: "var(--fg-4)" }}><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "예시 데이터 · 실제 이력 연동 예정" : "Illustrative · real history"}</span>
        </div>
      ) : (
        <div className="seas-foot">
          <span className="seas-leg">{ko ? "저렴함" : "Cheap"}<span className="seas-leg-scale">{[0.9, 0.5, 0.2].map(f => <span key={"c" + f} className="seas-leg-box" style={{ background: swatch("var(--pos)", f) }} />)}<span className="seas-leg-box" style={{ background: "var(--bg-elevated-2)" }} />{[0.2, 0.5, 0.9].map(f => <span key={"r" + f} className="seas-leg-box" style={{ background: swatch("var(--neg)", f) }} />)}</span>{ko ? "비쌈" : "Rich"}</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 16, alignItems: "center" }}>
            <span>{ko ? "현재 " : "Now "}<b className="seas-foot-val">{withU(latest)}</b></span>
            <span>{ko ? "5년 범위 " : "5y "}<b className="seas-foot-val">{gmin.toFixed(1)}~{gmax.toFixed(1)}{metric.unit}</b></span>
            <span style={{ color: "var(--fg-4)", display: "inline-flex", alignItems: "center", gap: 4 }}><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "예시" : "Illustrative"}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ---- security detail (source/SecurityView.jsx 194-314) ---- */
export function SecurityDetailScreen({ security, secPlan, fin, plans, secNotes }: {
  security: UISecurity;
  secPlan: UIPlan;
  fin: Fin | null;
  plans: UIPlan[];
  secNotes: SecNote[];
}) {
  const { lang }: { lang: Lang } = usePrefs();
  const t: I18nDict = I18N[lang];
  const router = useRouter();
  const s = security;

  const [planLimit, setPlanLimit] = useState(40);
  const [watched, setWatched] = useState(s.watched);
  const [, watchForce] = useReducer((x: number) => x + 1, 0);

  const linked = plans.filter(p => p.ticker === s.ticker);
  // 이 종목의 (플랜) 시나리오 — 새 fetch 없이 linked 재사용. adhoc 시나리오는 defer(미이식).
  const planScens: { sc: UIPlan["scenarios"][number]; plan: UIPlan }[] = [];
  linked.forEach(p => p.scenarios.forEach(sc => planScens.push({ sc, plan: p })));
  const eps = s.eps ?? 0;
  const per = eps > 0 ? s.price / eps : 0;
  const capStr = fmtMktCap(s.price * s.sharesOut * 1e6, s.cur);
  const up = s.change >= 0;
  const [secTab, setSecTab] = useState("overview");
  const secTabs: [string, string][] = [
    ["overview", lang === "ko" ? "개요" : "Overview"],
    ["financials", lang === "ko" ? "재무제표" : "Financials"],
    ["indicators", lang === "ko" ? "투자지표" : "Metrics"],
    ["valuation", lang === "ko" ? "밸류에이션" : "Valuation"],
  ];

  // 관심 토글: 낙관적 UI 후 서버액션. 실패 시 롤백.
  const onToggleWatch = async () => {
    const next = !watched;
    setWatched(next);
    try {
      const server = await toggleWatch(s.ticker);
      setWatched(server);
    } catch {
      setWatched(!next); // 롤백
    }
    watchForce();
  };

  const epsStr = s.cur === "USD" ? "$" + eps.toFixed(2) : "₩" + eps.toLocaleString();

  // ---- 종목 메모(journal_entries 공유) compose/edit/delete. 서버액션 후 router.refresh()로 재fetch. ----
  const [secDraft, setSecDraft] = useState("");
  const [secEditId, setSecEditId] = useState<string | null>(null);
  const [secEditText, setSecEditText] = useState("");
  const [secBusy, setSecBusy] = useState(false);

  const submitSecNote = async () => {
    const body = secDraft.trim();
    if (!body || secBusy) return;
    setSecBusy(true);
    try {
      await addSecNote(s.ticker, body);
      setSecDraft("");
      router.refresh();
    } finally {
      setSecBusy(false);
    }
  };
  const startSecEdit = (n: SecNote) => { setSecEditId(n.id); setSecEditText(n.body); };
  const cancelSecEdit = () => { setSecEditId(null); setSecEditText(""); };
  const commitSecEdit = async () => {
    if (secEditId == null) return;
    const body = secEditText.trim();
    if (!body || secBusy) return;
    setSecBusy(true);
    try {
      await editSecNote(secEditId, body);
      cancelSecEdit();
      router.refresh();
    } finally {
      setSecBusy(false);
    }
  };
  const removeSecNote = async (id: string) => {
    if (secBusy) return;
    setSecBusy(true);
    try {
      await deleteSecNote(id);
      if (secEditId === id) cancelSecEdit();
      router.refresh();
    } finally {
      setSecBusy(false);
    }
  };
  // created_at → 표시 문자열(간단): 오늘이면 시:분, 아니면 로컬 날짜(ko/en). 원본 n.when stamp 대체.
  const noteWhen = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = Date.now();
    const diffMs = now - d.getTime();
    const oneDay = 86400000;
    if (diffMs >= 0 && diffMs < oneDay && d.getDate() === new Date(now).getDate()) {
      return d.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="detail-main">
      <div className="detail-inner">
        <div className="dt-crumb">
          <span className="c-link" onClick={() => router.back()}><Lic name="chevron-left" size={13} cls="icon-sm" color="inherit" /></span>
          <span className="c-link" onClick={() => router.push("/insights")}>{t.securities}</span>
          <Lic name="chevron-right" size={12} cls="icon-sm" color="var(--fg-4)" />
          <span className="mono">{s.ticker}</span>
        </div>

        <div className="sec-head">
          <div className="sec-head-l">
            <div className="sec-ticker-row">
              <Flag market={s.market} size={20} />
              <span className="sec-mkt-badge">{s.market === "KR" ? "KRX" : "NASDAQ"}</span>
              <span className="mono" style={{ color: "var(--fg-3)", fontSize: 13 }}>{s.ticker}</span>
              <span className="sec-sector">{s.sector[lang]}</span>
            </div>
            <h1 className="dt-title" style={{ margin: "8px 0 6px" }}>{s.name[lang]}</h1>
            <div className="sec-price-row">
              <span className="sec-price mono">{fmtMoney(s.price, s.cur)}</span>
              <span className={"sec-change mono " + (up ? "pos" : "neg")}>{up ? "▲" : "▼"} {Math.abs(s.change).toFixed(2)}%</span>
            </div>
          </div>
          <button className={"watch-btn" + (watched ? " on" : "")} onClick={onToggleWatch}>
            <Lic name="star" size={14} cls="icon-sm" color={watched ? "var(--r-base)" : "var(--fg-3)"} />{watched ? t.watching : t.watch}
          </button>
        </div>

        <SecurityChart security={s} />
        <div className="sec-chart-cap"><Lic name="info" size={12} cls="icon-sm" color="var(--fg-4)" />{t.chartNote}</div>

        <div className="metric-row" style={{ marginTop: 18 }}>
          <div className="metric"><div className="metric-lab">{t.current}</div><div className="metric-val">{fmtMoney(s.price, s.cur)}</div></div>
          <div className="metric"><div className="metric-lab">{t.change}</div><div className={"metric-val sm " + (up ? "pos" : "neg")}>{up ? "+" : ""}{s.change.toFixed(2)}%</div></div>
          <div className="metric"><div className="metric-lab">PER</div><div className="metric-val sm">{per.toFixed(1)}×</div></div>
          <div className="metric"><div className="metric-lab">{t.mktCap}</div><div className="metric-val sm">{capStr}</div></div>
          <div className="metric"><div className="metric-lab">{t.val_shares}</div><div className="metric-val sm mono">{fmtShares(s.sharesOut, lang)}</div></div>
          <div className="metric"><div className="metric-lab">EPS</div><div className="metric-val sm mono">{epsStr}</div></div>
        </div>

        <div className="dt-tabs sec-tabs">{secTabs.map(([k, lab]) => <div key={k} className={"dt-tab" + (secTab === k ? " active" : "")} onClick={() => setSecTab(k)}>{lab}</div>)}</div>

        {secTab === "financials" && <FinancialsTab plan={secPlan} fin={fin} t={t} lang={lang} />}
        {secTab === "indicators" && <IndicatorsTab plan={secPlan} fin={fin} t={t} lang={lang} />}
        {secTab === "valuation" && <ValuationTab plan={secPlan} fin={fin} t={t} lang={lang} />}
        {secTab === "overview" && <Fragment>
          <SeasonalityHeatmap security={s} lang={lang} />
          <div style={{ display: "flex", gap: 8, marginBottom: 24, marginTop: 24 }}>
            {/* onCreatePlan defer — 버튼 렌더 유지, onClick no-op(마일스톤 후속). */}
            <button className="v-btn v-btn--primary" onClick={() => { /* defer: 플랜 생성 플로우 */ }}><Lic name="plus" size={15} cls="icon-sm" color="var(--fg-on-accent)" />{t.createPlanHere}</button>
          </div>

          {/* 이 종목의 시나리오(source/P5Scenarios.jsx 108-145 SecurityScenarios의 플랜 시나리오 부분).
              adhoc 시나리오는 defer(데이터모델 없음) — linked(플랜) 재사용, 새 fetch 0.
              행 클릭 → 해당 플랜 시나리오 탭 딥링크. "+시나리오 추가"는 adhoc 작성 모달 defer(no-op). */}
          {planScens.length === 0 ? (
            <div style={{ marginTop: 24 }}>
              <div className="se-section-h">{t.scenarioOn}</div>
              <div className="sc-add" style={{ minHeight: 72 }} onClick={() => { /* defer: adhoc 시나리오 작성 */ }}>
                <Lic name="plus" size={16} color="var(--fg-4)" />{t.addScenarioHere}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24 }}>
              <div className="se-section-h" style={{ display: "flex", alignItems: "center" }}>{t.scenarioOn} <span className="grp-count" style={{ marginLeft: 6 }}>{planScens.length}</span>
                <button className="v-btn" style={{ marginLeft: "auto", height: 26, padding: "0 9px" }} onClick={() => { /* defer: adhoc 시나리오 작성 */ }}><Lic name="plus" size={13} cls="icon-sm" color="inherit" />{t.addScenarioHere}</button>
              </div>
              {planScens.map(({ sc, plan }, i) => {
                const ret = (sc.target / s.price - 1) * 100;
                return (
                  <div className="scn-row scn-row-click" key={plan.id + ":" + i} onClick={() => router.push(`/plans/${plan.dbId}?tab=scenarios`)} title={lang === "ko" ? plan.id + " 시나리오 열기" : "Open " + plan.id + " scenarios"}>
                    <span className="scsum-dot" style={{ background: sc.color }} />
                    <span style={{ font: "var(--fw-semi) 13px var(--font-sans)", color: "var(--fg)", width: 46 }}>{sc.label[lang]}</span>
                    <span className="scn-thesis">{sc.thesis?.[lang] ?? ""}</span>
                    <span className="scn-tag"><span className="fl-auto">{plan.id}</span></span>
                    <span className="mono" style={{ width: 92, textAlign: "right", color: "var(--fg-2)" }}>{fmtCompact(sc.target, s.cur)}</span>
                    <span className={"mono " + (ret >= 0 ? "pos" : "neg")} style={{ width: 56, textAlign: "right", fontWeight: 600 }}>{ret >= 0 ? "+" : ""}{ret.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="se-section-h" style={{ marginTop: 24 }}>{t.plansOn} <span className="grp-count">{linked.length}</span></div>
          {linked.length ? <Fragment>{linked.slice(0, planLimit).map(p => {
            const ret = planReturn(p);
            const strat = STRATEGIES.find(x => x.id === p.strategyId);
            return (
              <div className="sec-planrow" key={p.id} onClick={() => router.push(`/plans/${p.dbId}`)}>
                <StatusIcon status={p.status} size={14} />
                <span className="mono" style={{ color: "var(--fg-4)", fontSize: 12, width: 58 }}>{p.id}</span>
                <span style={{ flex: 1, font: "var(--fw-medium) 13px var(--font-sans)", color: "var(--fg)" }}>{p.name[lang]}</span>
                {strat && <span className="strat-dot" style={{ background: strat.color }} />}
                <span className={"mono " + (ret ? (ret.rate >= 0 ? "pos" : "neg") : "")} style={{ fontSize: 13, width: 60, textAlign: "right" }}>{ret ? (ret.rate >= 0 ? "+" : "") + ret.rate.toFixed(1) + "%" : "—"}</span>
              </div>
            );
          })}{linked.length > planLimit && <button className="note-more" style={{ margin: "4px 0 8px" }} onClick={() => setPlanLimit(l => l + 40)}>{lang === "ko" ? `더 보기 (${linked.length - planLimit}개 남음)` : `Show more (${linked.length - planLimit} left)`}</button>}</Fragment> : <div style={{ padding: "16px 0", color: "var(--fg-4)", font: "var(--fw-medium) 13px var(--font-sans)" }}>{t.noPlansYet}</div>}
          {/* 종목 메모(source/SecurityView.jsx 282-310) — journal_entries 공유(plan_id=null·ticker).
              compose textarea(⌘/Ctrl+Enter) + edit/delete. "일지에도 함께 모입니다"(같은 테이블). */}
          <div className="sec-memo">
            <div className="se-section-h" style={{ marginTop: 24 }}>{lang === "ko" ? "종목 메모" : "Security notes"} <span className="grp-count">{secNotes.length}</span></div>
            <div className="note-compose">
              <textarea className="note-input" rows={2} placeholder={lang === "ko" ? "이 종목을 왜 보는지·리서치를 기록하세요… (⌘/Ctrl+Enter)" : "Why you're watching this… (⌘/Ctrl+Enter)"} value={secDraft}
                onChange={e => setSecDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitSecNote(); }} />
              {secDraft.trim() && <button className="v-btn v-btn--primary note-save" onClick={submitSecNote} disabled={secBusy}>{lang === "ko" ? "기록" : "Log"}</button>}
            </div>
            {secNotes.length === 0 ? <div className="note-empty">{lang === "ko" ? "아직 메모가 없습니다. 일지에도 함께 모입니다." : "No notes yet. These also collect in the Journal."}</div>
              : secNotes.map(n => (
                <div className="note-item" key={n.id}>
                  <div className="note-meta"><span className="note-when">{noteWhen(n.createdAt)}</span>
                    {secEditId !== n.id && <span className="note-acts">
                      <button className="note-edit" title={lang === "ko" ? "수정" : "Edit"} onClick={() => startSecEdit(n)}><Lic name="pencil" size={11} color="currentColor" /></button>
                      <button className="note-del" title={t.delete} onClick={() => removeSecNote(n.id)} disabled={secBusy}><Lic name="x" size={12} color="currentColor" /></button>
                    </span>}
                  </div>
                  {secEditId === n.id
                    ? <div className="note-edit-box">
                        <textarea className="note-input" autoFocus rows={3} value={secEditText} onChange={e => setSecEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitSecEdit(); if (e.key === "Escape") cancelSecEdit(); }} />
                        <div className="note-edit-acts">
                          <button className="note-cancel" onClick={cancelSecEdit}>{lang === "ko" ? "취소" : "Cancel"}</button>
                          <button className="v-btn v-btn--primary note-save" onClick={commitSecEdit} disabled={secBusy}>{lang === "ko" ? "저장" : "Save"}</button>
                        </div>
                      </div>
                    : <div className="note-text">{n.body}</div>}
                </div>
              ))}
          </div>
        </Fragment>}
      </div>
    </div>
  );
}
