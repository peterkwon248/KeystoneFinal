// 11~13 스크리너 — source/P4Views.jsx:366-869 ScreenerView 이식(list + board + heatmap + quadrant).
// 범위: 렌즈(관점) 선택 + 요약바(pass/watch/fail) + 필터(스크리너 cats) + 필터칩 + verdict 필터
//       + 정렬/그룹(verdict/sector/none) + 레이아웃 4종(list/board/heatmap/quadrant) + heatMode(품질/등락/밸류)
//       + 그룹 행 + 탈락(fail) 접이식 섹션(quadrant 제외).
// 제외(후속): 저장된 스크린(saved screens, SAVE_LSK localStorage).
//
// 어댑테이션(faithful):
//  - SECURITIES → prop `securities`(서버 fetchAllSecurities). SEC_SEED로 eps/perLo/perHi 보강(screener-data).
//  - scored 파이프라인은 lib/screener-data.buildScored(컴포넌트 밖 순수) — SWC 안전.
//  - quadrant 물리시뮬(60-iter)은 useMemo로 hoist(JSX-inline IIFE 금지). 히트맵 색은 lib/screener-ref.
//  - localStorage 뷰 상태 저장은 이식(원본 LSK: fwId/filters/sortKey/groupBy/layout/heatMode), saved screens(SAVE_LSK)는 제외.
//  - onOpenSecurity = router.push(`/securities/${ticker}`). t/lang = usePrefs + I18N[lang].
//  - SWC≠tsc: JSX 안 제네릭 캐스트·IIFE 없음. 아이콘/라벨 맵·좌표 계산은 본문 헬퍼/const.
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSecurityPeek } from "@/components/securities/security-peek";
import type { I18nDict, Lang } from "@keystone/core/types";
import { I18N } from "@keystone/core/i18n";
import { STRATEGIES, MARKETS } from "@keystone/core/reference";
import { IND_THRESH, lensThreshOf } from "@keystone/core/screener";
import { fmtCompact, fmtMktCap } from "@keystone/core/format";
import { GICS_SECTORS } from "@/lib/gics";
import { Flag, Lic, StatusIcon } from "@/components/icons";
import { MiniDropdown } from "@/components/plan/mini-dropdown";
import { usePrefs } from "@/components/shell/prefs";
import type { UISecurity } from "@/lib/security-mapper";
import type { UIPlan } from "@/lib/plan-mapper";
import { buildScored, type ScoredRow } from "@/lib/screener-data";
import {
  SCV_VERDICT, SCV_ORDER, SCV_VAL, SCV_VAL_ORDER, SCV_INDLAB, SCV_INDLAB_SHORT,
  SCV_PCT_KEYS, SCV_TONE, scvToneCol, scvUnit, scvFmtV, scvHeatScore, scvHeatChange,
  FIN_FLAG_DEFS, numCats,
  type Verdict, type ValV,
} from "@/lib/screener-ref";

type SortKey = "score" | "value" | "change" | "name";
type GroupBy = "verdict" | "sector" | "none";
type Layout = "list" | "board" | "heatmap" | "quadrant";
type HeatMode = "score" | "change" | "value";
type ScvPanel = "filter" | "display" | null;
interface NumFilter { key: string; op: "lte" | "gte"; val: number | "" }
interface Filters {
  verdict: Verdict[]; market: string[]; sector: string[];
  universe: string[]; finflag: string[]; value: ValV[]; num: NumFilter[];
}

// source/securities.jsx:47 plansForTicker 인라인.
function plansForTicker(plans: UIPlan[], ticker: string): UIPlan[] {
  return plans.filter((p) => p.ticker === ticker);
}
function gicsEnOf(s: UISecurity): string { return (s.gics ?? s.sector).en; }

// source/P4Views.jsx:249 scvThreshTxt — verdict 설명 임계값 텍스트(렌즈 focus + IND_THRESH).
function scvThreshTxt(key: string, tone: string, ko: boolean, fwId: string | null): string {
  const th = lensThreshOf(fwId, key) || IND_THRESH[key] || null;
  if (!th) return "";
  const u = scvUnit(key, ko), lo = th.dir === "low";
  if (tone === "good") return (lo ? "≤" : "≥") + th.good + u;
  if (tone === "bad") return (lo ? "≥" : "≤") + th.warn + u;
  return (lo ? th.good + "~" + th.warn : th.warn + "~" + th.good) + u;
}

// source/P4Views.jsx:283 ScvPips — 점수 pip 미터.
function ScvPips({ r, cls, color }: { r: ScoredRow; cls?: string; color?: string }) {
  const col = color || SCV_VERDICT[r.verdict as Verdict]?.color || "var(--fg-4)";
  const n = r.max || 0, on = r.sc || 0;
  const cells = [];
  for (let i = 0; i < n; i++) cells.push(<span key={i} className={"scv-pip" + (i < on ? " on" : "")} style={i < on ? { background: col } : undefined} />);
  return <span className={"scv-pips" + (cls ? " " + cls : "")} aria-label={on + "/" + n}>{cells}</span>;
}

// source/P4Views.jsx:289 VerdictTip — 왜 이 등급인지(지표별 tone·임계값·점수).
function VerdictTip({ r, ko, cls, fwId }: { r: ScoredRow; ko: boolean; cls?: string; fwId: string | null }) {
  if (!r || !r.inds || !r.inds.length) return null;
  const vl = SCV_VERDICT[r.verdict as Verdict], pct = Math.round((r.ratio || 0) * 100);
  return (
    <span className={"fin-tip scv-vtip" + (cls ? " " + cls : "")}>
      <b className="scv-vtip-head">{ko ? "왜 " : ""}<span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span>{ko ? "인가" : ""} · {r.sc}/{r.max} ({pct}%)</b>
      <span className="scv-vtip-rows">
        {r.inds.map((m) => {
          const tn = SCV_TONE[m.tone] || SCV_TONE.bad, col = scvToneCol(m.tone);
          return (
            <span className="scv-vtip-row" key={m.key}>
              <span className="scv-vtip-k">{SCV_INDLAB(m.key, ko)}</span>
              <span className="scv-vtip-v mono" style={{ color: col }}>{scvFmtV(m, ko)}</span>
              <span className="scv-vtip-j" style={{ color: col }}>{tn[ko ? "ko" : "en"]} <span className="scv-vtip-th mono">{scvThreshTxt(m.key, m.tone, ko, fwId)}</span></span>
              <span className="scv-vtip-pt mono" style={{ color: col }}>+{tn.pt}</span>
            </span>
          );
        })}
      </span>
      <span className="scv-vtip-foot">{ko ? "합계 " + r.sc + "/" + r.max + " · 통과 ≥80% · 관찰 50~80% · 탈락 <50%" : "Total " + r.sc + "/" + r.max + " · Pass ≥80% · Watch 50–80% · Fail <50%"}</span>
    </span>
  );
}

// source/P4Views.jsx:311 ValueTip — 밸류에이션 괴리 설명.
function ValueTip({ r, ko }: { r: ScoredRow; ko: boolean }) {
  if (r.valUp == null) return null;
  const vl = SCV_VAL[r.valV as ValV], cur = r.s.cur;
  const eps = r.fair != null && r.midPer ? r.fair / r.midPer : r.s.eps;
  const rows: [string, string, string | null][] = [
    [ko ? "현재가" : "Price", fmtCompact(r.s.price, cur), null],
    [ko ? "적정가" : "Fair", fmtCompact(Math.round(r.fair as number), cur), vl.color],
    [ko ? "괴리율" : "Gap", (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%", vl.color],
  ];
  return (
    <span className="fin-tip scv-vtip scv-valtip">
      <b className="scv-vtip-head">{ko ? "괴리 · " : "Value · "}<span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span></b>
      <span className="scv-vtip-rows">
        {rows.map((rw, i) => (
          <span className="scv-valtip-row" key={i}>
            <span className="scv-valtip-k">{rw[0]}</span>
            <span className="scv-valtip-v mono" style={rw[2] ? { color: rw[2] } : undefined}>{rw[1]}</span>
          </span>
        ))}
      </span>
      <span className="scv-vtip-foot">{ko
        ? `적정가 = EPS ${eps != null ? fmtCompact(eps, cur) : "—"} × 5년 PER 밴드 중앙값 ${r.midPer ? r.midPer.toFixed(1) + "배" : "—"}. +면 저평가 · −면 고평가.`
        : `Fair = EPS × mid of the 5yr P/E band. + = undervalued.`}</span>
    </span>
  );
}

// source/P4Views.jsx:336 SummaryTip — 요약바 항목 hover 설명.
function SummaryTip({ v, focus, ko }: { v: Verdict; focus: string[]; ko: boolean }) {
  const vl = SCV_VERDICT[v];
  const band = ({ pass: ko ? "80% 이상" : "≥80%", watch: ko ? "50~80%" : "50–80%", fail: ko ? "50% 미만" : "<50%" } as Record<Verdict, string>)[v];
  const metr = (focus || []).map((k) => SCV_INDLAB(k, ko)).join(" · ");
  return (
    <span className="fin-tip scv-stip">
      <b><span style={{ color: vl.color }}>{vl[ko ? "ko" : "en"]}</span></b>
      <span className="scv-stip-def">{ko ? `현재 관점의 등급 점수가 만점의 ${band}인 종목.` : `Securities scoring ${band} of the lens's grade points.`}</span>
      {metr && <span className="scv-stip-metr">{ko ? "채점 지표" : "Metrics"}: {metr}<span className="scv-stip-dim"> · {ko ? "각 우수 2·보통 1·미달 0점" : "each Strong2·Fair1·Weak0"}</span></span>}
      {v === "fail" && <span className="scv-stip-dim">{ko ? "클릭하면 제외 목록을 펼칩니다." : "Click to expand the excluded list."}</span>}
      <span className="scv-vtip-foot">{ko ? "통과 ≥80% · 관찰 50~80% · 탈락 <50%" : "Pass ≥80% · Watch 50–80% · Fail <50%"}</span>
    </span>
  );
}

// source/P4Views.jsx:214 ScvSpark — 브라우즈 행 추세 스파크.
function ScvSpark({ spark, up }: { spark: number[]; up: boolean }) {
  const sp = (spark || []).slice(-16);
  if (sp.length < 2) return null;
  const min = Math.min(...sp), max = Math.max(...sp), W = 54, H = 16;
  const pts = sp.map((v, i) => `${(i / (sp.length - 1) * W).toFixed(1)},${(H - (v - min) / (max - min || 1) * (H - 3) - 1.5).toFixed(1)}`).join(" ");
  return <svg className="scv-spark" width={W} height={H} aria-hidden="true"><polyline points={pts} fill="none" stroke={up ? "var(--pos)" : "var(--neg)"} strokeWidth="1.5" /></svg>;
}

// source/P4Views.jsx:222 NPlansBadge — 플랜 카운트 배지 + hover 리스트.
function NPlansBadge({ plans, ticker, lang, t }: { plans: UIPlan[]; ticker: string; lang: Lang; t: I18nDict }) {
  const list = plansForTicker(plans, ticker);
  if (!list.length) return null;
  const ko = lang === "ko";
  return (
    <span className="sec-nplans fin-term nplb">{list.length}
      <span className="fin-tip nplb-tip">
        <span className="nplb-tip-h">{ko ? "이 종목의 플랜" : "Plans on this security"}<span className="nplb-tip-n">{list.length}</span></span>
        {list.map((p) => (
          <span className="nplb-row" key={p.id}>
            <StatusIcon status={p.status} size={12} />
            <span className="nplb-nm">{p.name ? p.name[lang] : p.id}</span>
            <span className="nplb-st">{t["s_" + p.status] ?? p.status}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

// source/DetailView.jsx:3080 LensPicker(variant="toolbar") — 관점 드롭다운.
function LensPicker({ value, onPick, lang, width = 232 }: { value: string | null; onPick: (v: string | null | undefined) => void; lang: Lang; width?: number }) {
  const ko = lang === "ko";
  const fws = STRATEGIES.filter((s) => s.model);
  const isNone = !value || value === "none";
  const cur = isNone ? null : fws.find((s) => s.id === value);
  const noneLabel = ko ? "관점 없음" : "No lens";
  const items = [{ value: "none", label: noneLabel, icon: <Lic name="circle-off" size={13} cls="icon-sm" color="var(--fg-4)" />, on: isNone }]
    .concat(fws.map((s) => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: !isNone && value === s.id })));
  const trigger = (
    <span className={"scv-fw-pick" + (isNone ? " scv-fw-none" : "")}>
      {isNone || !cur ? <Lic name="circle-off" size={13} cls="icon-sm" color="var(--fg-4)" /> : <span className="strat-dot" style={{ background: cur.color }} />}
      {isNone || !cur ? noneLabel : cur.name[lang]}
      <Lic name="chevron-down" size={13} cls="icon-sm" color="var(--fg-4)" />
    </span>
  );
  return <MiniDropdown width={width} align="left" lang={lang} trigger={trigger} items={items} onPick={onPick} />;
}

// 뷰 상태 localStorage — source/P4Views.jsx:370/380(saved screens는 제외).
const LSK = "keystone-screener-v1";
function viewLoad(): { fwId?: string; sortKey?: SortKey; groupBy?: GroupBy; layout?: Layout; heatMode?: HeatMode; filters?: Partial<Filters> } {
  try { return JSON.parse(localStorage.getItem(LSK) || "{}"); } catch { return {}; }
}

export function ScreenerScreen({ securities, plans }: { securities: UISecurity[]; plans: UIPlan[] }) {
  const { lang }: { lang: Lang } = usePrefs();
  const t = I18N[lang];
  const ko = lang === "ko";
  const fws = STRATEGIES.filter((s) => s.model);

  const saved = useRef(viewLoad()).current;
  const [fwId, setFwId] = useState<string | null>(
    saved.fwId === "none" || (saved.fwId && fws.find((f) => f.id === saved.fwId)) ? (saved.fwId as string) : (fws[0] ? fws[0].id : null),
  );
  const [filters, setFilters] = useState<Filters>(() => {
    const sf = saved.filters || {};
    return {
      verdict: (sf.verdict || []).filter((v) => v !== "fail"),
      market: sf.market || [], sector: sf.sector || [], universe: sf.universe || [],
      finflag: sf.finflag || [], value: sf.value || [], num: sf.num || [],
    };
  });
  const [sortKey, setSortKey] = useState<SortKey>(saved.sortKey || "score");
  const [groupBy, setGroupBy] = useState<GroupBy>(saved.groupBy || "verdict");
  const [layout, setLayout] = useState<Layout>(saved.layout || "list");
  const [heatMode, setHeatMode] = useState<HeatMode>(saved.heatMode || "score");
  const [showExcl, setShowExcl] = useState(false);
  const [panel, setPanel] = useState<ScvPanel>(null);
  const [filterAnchor, setFilterAnchor] = useState<{ left: number; top: number } | null>(null);
  const [fltOpen, setFltOpen] = useState<string | null>(null);
  const [numQuery, setNumQuery] = useState("");

  useEffect(() => { try { localStorage.setItem(LSK, JSON.stringify({ fwId, filters, sortKey, groupBy, layout, heatMode })); } catch { /* ignore */ } }, [fwId, filters, sortKey, groupBy, layout, heatMode]);
  useEffect(() => { setNumQuery(""); }, [fltOpen]);

  const noLens = fwId === "none";
  const fw = noLens ? null : (fws.find((s) => s.id === fwId) || fws[0]);
  const focus = useMemo(() => (fw && fw.gradeFocus) || [], [fw]);

  // no-lens 모드 = raw 필터 스크리닝: 품질 전용 레이아웃/정렬/그룹/heatMode 폴백(원본 398-404).
  useEffect(() => {
    if (!noLens) return;
    setLayout((l) => (l === "quadrant" ? "list" : l));
    setSortKey((s) => (s === "score" ? "value" : s));
    setGroupBy((g) => (g === "verdict" ? "none" : g));
    setHeatMode((h) => (h === "score" ? "value" : h));
  }, [noLens]);

  // 섹터 목록(GICS 11 + 카운트) — 원본 406-410.
  const sectors = useMemo(() => {
    const cnt: Record<string, number> = {};
    securities.forEach((s) => { const k = gicsEnOf(s); cnt[k] = (cnt[k] || 0) + 1; });
    return GICS_SECTORS.map((g) => ({ value: g.en, label: g[lang], n: cnt[g.en] || 0 }));
  }, [securities, lang]);

  // scored — lib 순수 함수(원본 414-432). 렌즈/plans/focus 변화에만 재계산.
  const scored = useMemo(() => buildScored(securities, plans, fwId, focus), [securities, plans, fwId, focus]);

  // 필터 적용(원본 434-448).
  const fmatch = (r: ScoredRow): boolean => {
    if (filters.market.length && !filters.market.includes(r.s.market)) return false;
    if (filters.sector.length && !filters.sector.includes(gicsEnOf(r.s))) return false;
    if (filters.universe.includes("watched") && !r.s.watched) return false;
    if (filters.finflag.length && !filters.finflag.every((k) => r.flags[k])) return false;
    if (filters.value.length && !filters.value.includes(r.valV as ValV)) return false;
    for (const nf of filters.num) {
      if (nf.val === "" || nf.val == null) continue;
      const v = r.vals[nf.key];
      if (v == null || !isFinite(v)) return false;
      if (nf.op === "lte" && !(v <= nf.val)) return false;
      if (nf.op === "gte" && !(v >= nf.val)) return false;
    }
    return true;
  };
  const matched = scored.filter(fmatch);
  const counts: Record<Verdict, number> = { pass: 0, watch: 0, fail: 0 };
  matched.forEach((r) => { if (r.verdict) counts[r.verdict]++; });
  const vFocus: Verdict[] = filters.verdict.filter((v) => v !== "fail");
  const failRows = noLens ? [] : matched.filter((r) => r.verdict === "fail");
  let rows = noLens ? matched.slice() : matched.filter((r) => r.verdict !== "fail" && (!vFocus.length || vFocus.includes(r.verdict as Verdict)));

  const sorters: Record<SortKey, (a: ScoredRow, b: ScoredRow) => number> = {
    score: (a, b) => (b.ratio || 0) - (a.ratio || 0) || (b.sc || 0) - (a.sc || 0),
    value: (a, b) => (b.valUp == null ? -1e9 : b.valUp) - (a.valUp == null ? -1e9 : a.valUp),
    change: (a, b) => b.s.change - a.s.change,
    name: (a, b) => a.s.name[lang].localeCompare(b.s.name[lang]),
  };
  rows = rows.slice().sort(sorters[sortKey] || sorters.score);

  // 그룹핑(원본 468-476).
  interface Grp { key: string; head: { label: string; dot: string } | null; items: ScoredRow[] }
  let groups: Grp[];
  const gb: GroupBy = noLens && groupBy === "verdict" ? "none" : groupBy;
  if (gb === "sector") {
    groups = sectors.map((sec) => ({ key: sec.value, head: { label: sec.label, dot: "var(--fg-3)" }, items: rows.filter((r) => gicsEnOf(r.s) === sec.value) })).filter((g) => g.items.length);
  } else if (gb === "none") {
    groups = [{ key: "all", head: null, items: rows }];
  } else {
    groups = SCV_ORDER.map((v) => ({ key: v, head: { label: SCV_VERDICT[v][lang], dot: SCV_VERDICT[v].color }, items: rows.filter((r) => r.verdict === v) })).filter((g) => g.items.length);
  }

  // quadrant는 품질을 Y축으로 — 후보 전체(탈락 포함)를 뿌린다(원본 466).
  const quadRows = matched;
  // quadrant 물리시뮬(원본 660-663) — JSX 밖으로 hoist(SWC 안전, IIFE-in-JSX 금지).
  // 60-iteration 충돌 해소로 도트가 겹치지 않게 밀어낸다. quadrant+lens일 때만 계산(그 외 []).
  const laid = useMemo<{ r: ScoredRow; x: number; y: number }[]>(() => {
    if (layout !== "quadrant" || noLens) return [];
    const xOf = (v: number | null) => (v == null ? 0.5 : (40 - Math.max(-40, Math.min(40, v))) / 80);
    const arr = quadRows.map((r) => {
      const seed = r.s.ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      return {
        r,
        x: Math.max(5, Math.min(95, xOf(r.valUp) * 100 + ((seed % 7) - 3) * 1.1)),
        y: Math.max(5, Math.min(95, (1 - (r.ratio || 0)) * 100 + ((seed % 5) - 2) * 2.4)),
      };
    });
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i], b = arr[j];
          const dx = (b.x - a.x) * 1.05, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
          const minD = 7;
          if (d === 0) { a.x -= 0.6; a.y -= 0.6; b.x += 0.6; b.y += 0.6; moved = true; }
          else if (d < minD) { const p = (minD - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * p / 1.05; a.y -= uy * p; b.x += ux * p / 1.05; b.y += uy * p; moved = true; }
        }
      }
      arr.forEach((o) => { o.x = Math.max(5, Math.min(95, o.x)); o.y = Math.max(5, Math.min(95, o.y)); });
      if (!moved) break;
    }
    return arr;
  }, [quadRows, layout, noLens]);

  // 칩(원본 478-483).
  interface Chip { type: string; value: string; label: string; dot?: string }
  const chips: Chip[] = [];
  filters.market.forEach((v) => chips.push({ type: "market", value: v, label: v === "KR" ? (ko ? "한국" : "Korea") : v === "US" ? (ko ? "미국" : "US") : v }));
  filters.sector.forEach((v) => chips.push({ type: "sector", value: v, label: (sectors.find((x) => x.value === v) || { label: v }).label }));
  filters.finflag.forEach((v) => { const d = FIN_FLAG_DEFS.find((x) => x.key === v); if (d) chips.push({ type: "finflag", value: v, label: d[lang] }); });
  filters.value.forEach((v) => chips.push({ type: "value", value: v, label: SCV_VAL[v][lang], dot: SCV_VAL[v].color }));
  if (filters.universe.includes("watched")) chips.push({ type: "universe", value: "watched", label: ko ? "관심종목만" : "Watched only" });

  // 필터 토글(원본 485-509).
  const toggle = (type: keyof Filters, value: string) => setFilters((prev) => {
    const cur = (prev[type] as string[]) || [];
    return { ...prev, [type]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] } as Filters;
  });
  const clearAll = () => setFilters({ verdict: [], market: [], sector: [], universe: [], finflag: [], value: [], num: [] });

  const NUM_PCT = SCV_PCT_KEYS;
  const numUnit = (k: string) => (NUM_PCT.includes(k) ? "%" : ko ? "배" : "×");
  const cats = numCats(ko);
  const numConflict = (nf: NumFilter) => {
    if (noLens || !focus.includes(nf.key) || nf.val === "" || nf.val == null) return null;
    const th = lensThreshOf(fwId, nf.key);
    if (!th) return null;
    const v = +nf.val;
    if (th.dir === "low" && nf.op === "gte" && v > th.good) return th;
    if (th.dir === "high" && nf.op === "lte" && v < th.good) return th;
    return null;
  };
  const addNum = (key: string) => setFilters((p) => {
    if (p.num.some((n) => n.key === key)) return p;
    const th = lensThreshOf(fwId, key) || IND_THRESH[key] || null;
    const op: "lte" | "gte" = th && th.dir === "low" ? "lte" : "gte";
    const val = th ? th.good : 0;
    return { ...p, num: [...p.num, { key, op, val }] };
  });
  const setNum = (key: string, patch: Partial<NumFilter>) => setFilters((p) => ({ ...p, num: p.num.map((n) => (n.key === key ? { ...n, ...patch } : n)) }));
  const delNum = (key: string) => setFilters((p) => ({ ...p, num: p.num.filter((n) => n.key !== key) }));

  const fltGroupOn = (type: string, keys: string[]) => type === "num"
    ? keys.every((k) => filters.num.some((n) => n.key === k))
    : keys.every((v) => (filters[type as keyof Filters] as string[]).includes(v));
  const toggleFltGroup = (type: string, keys: string[]) => {
    if (type === "num") {
      setFilters((p) => {
        const num = p.num;
        const allOn = keys.every((k) => num.some((n) => n.key === k));
        if (allOn) return { ...p, num: num.filter((n) => !keys.includes(n.key)) };
        const have = new Set(num.map((n) => n.key));
        const add = keys.filter((k) => !have.has(k)).map((k) => {
          const th = lensThreshOf(fwId, k);
          const op: "lte" | "gte" = th && th.dir === "low" ? "lte" : "gte";
          return { key: k, op, val: th ? th.good : 0 };
        });
        return { ...p, num: [...num, ...add] };
      });
    } else {
      setFilters((p) => {
        const set = new Set((p[type as keyof Filters] as string[]) || []);
        const allOn = keys.every((v) => set.has(v));
        keys.forEach((v) => (allOn ? set.delete(v) : set.add(v)));
        return { ...p, [type]: [...set] } as Filters;
      });
    }
  };

  const ruleTxt = (k: string) => {
    const th = lensThreshOf(fwId, k) || IND_THRESH[k] || null;
    if (!th) return SCV_INDLAB(k, ko);
    return SCV_INDLAB(k, ko) + " " + (th.dir === "low" ? "≤" : "≥") + th.good + (SCV_PCT_KEYS.includes(k) ? "%" : "");
  };

  const { openPeek } = useSecurityPeek();
  const onOpenSecurity = openPeek;
  const openFilterAt = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFilterAnchor({ left: Math.max(8, Math.min(r.left, window.innerWidth - 470)), top: r.bottom + 6 });
    setPanel("filter");
  };

  // 필터 패널 cats(원본 768-775).
  const fltCats: FCat[] = [
    { type: "num", label: ko ? "지표 조건" : "Metrics", icon: "sliders-horizontal", groups: cats.map((g) => ({ label: g.label, options: g.keys.map((k) => ({ value: k, label: SCV_INDLAB(k, ko) })) })) },
    { type: "value", label: t.scv_value, icon: "tag", options: SCV_VAL_ORDER.map((v) => ({ value: v, label: SCV_VAL[v][lang], icon: <span className="scsum-dot" style={{ background: SCV_VAL[v].color }} /> })) },
    { type: "market", label: ko ? "시장" : "Market", icon: "globe", options: MARKETS.map((m) => ({ value: m.key, label: (m.label as { en: string; ko: string })[lang], icon: <Flag market={m.key as "KR" | "US"} size={12} /> })) },
    { type: "sector", label: ko ? "섹터" : "Sector", icon: "layers", options: sectors.map((s) => ({ value: s.value, label: s.label, dim: s.n === 0, count: s.n })) },
    { type: "finflag", label: ko ? "재무 조건" : "Financials", icon: "file-text", options: FIN_FLAG_DEFS.map((d) => ({ value: d.key, label: d[lang], tip: d.tip[lang] })) },
    { type: "universe", label: ko ? "관심" : "Universe", icon: "star", options: [{ value: "watched", label: ko ? "관심종목만" : "Watched only", icon: <Lic name="star" size={14} cls="icon-sm" color="var(--fg-3)" /> }] },
  ];
  const fSel = (type: string, value: string) => type === "num" ? filters.num.some((n) => n.key === value) : (filters[type as keyof Filters] as string[]).includes(value);
  const fClick = (type: string, value: string) => {
    if (type === "num") { fSel(type, value) ? delNum(value) : addNum(value); }
    else toggle(type as keyof Filters, value);
  };

  return (
    <div className="main" style={{ height: "100%" }}>
      <div className="viewheader">
        <div className="viewtitle">
          <Lic name="crosshair" size={16} color="var(--fg-2)" />
          <h1 className="vt-title">{t.screenerNav}</h1>
        </div>
        <span className="spacer" />
        <div className="toolbar-icons" style={{ marginLeft: 8 }}>
          <button className={"iconbtn" + (panel === "filter" ? " active" : "")} onClick={(e) => { if (panel === "filter") setPanel(null); else openFilterAt(e); }} title={t.filter}><Lic name="list-filter" size={16} /></button>
          <button className={"iconbtn" + (panel === "display" ? " active" : "")} onClick={() => setPanel(panel === "display" ? null : "display")} title={t.display}><Lic name="sliders-horizontal" size={16} /></button>
        </div>
      </div>

      <div className="body-row">
        <div className="body-main">
          <div className="scv-toolbar">
            <LensPicker value={fwId} onPick={(v) => setFwId(v ?? null)} lang={lang} width={232} />
            <span className="scv-tb-spacer" />
            {noLens && <span className="scv-nolens-note">{ko ? "숫자 필터로 거르는 중 · 품질 채점 없음" : "Raw filters only · no grading"}</span>}
            {!noLens && <span className="scv-summary">
              {SCV_ORDER.map((v) => {
                const on = v === "fail" ? showExcl : filters.verdict.includes(v);
                const zero = counts[v] === 0;
                return (
                  <span
                    className={"scv-sum scv-sum-tip" + (on ? " on" : "") + (v === "fail" ? " scv-sum-fail" : "") + (zero ? " scv-sum-zero" : "")}
                    key={v}
                    onClick={() => {
                      if (v === "fail") { setShowExcl((x) => !x); return; }
                      setFilters((prev) => {
                        const cur = prev.verdict.filter((x) => x !== "fail");
                        const only = cur.length === 1 && cur[0] === v;
                        return { ...prev, verdict: only ? [] : [v] };
                      });
                    }}
                  >
                    <span className="scsum-dot" style={{ background: SCV_VERDICT[v].color }} />{SCV_VERDICT[v][lang]} <b>{counts[v]}</b>
                    <SummaryTip v={v} focus={focus} ko={ko} />
                  </span>
                );
              })}
            </span>}
          </div>

          {fw && <div className="scv-rulebar">
            <span className="scv-rule-lab"><Lic name="sliders-horizontal" size={13} cls="icon-sm" color={fw.color} />{ko ? "등급 룰" : "Grade rule"}</span>
            <span className="scv-rule-chips">{focus.map((k) => <span className="scv-rule-chip mono" key={k}>{ruleTxt(k)}</span>)}</span>
          </div>}

          <div className="scv-filterbar">
            <span className="scv-fb-count"><b>{rows.length}</b> {ko ? "후보" : "candidates"}{failRows.length ? <span className="scv-fb-excl"> · {failRows.length} {ko ? "제외" : "excluded"}</span> : null}</span>
            {chips.map((c) => (
              <span className="scv-chip" key={c.type + ":" + c.value}>
                {c.dot && <span className="scsum-dot" style={{ background: c.dot }} />}
                <span className="scv-chip-lab">{c.label}</span>
                <span className="scv-chip-x" onClick={() => toggle(c.type as keyof Filters, c.value)}><Lic name="x" size={11} cls="icon-sm" color="currentColor" /></span>
              </span>
            ))}
            {filters.num.map((nf) => {
              const cf = numConflict(nf);
              return (
                <span className={"scv-numchip" + (cf ? " scv-numchip--warn" : "")} key={"num:" + nf.key}>
                  <span className="scv-numchip-k mono">{SCV_INDLAB(nf.key, ko)}</span>
                  <button className="scv-numchip-op mono" onClick={() => setNum(nf.key, { op: nf.op === "lte" ? "gte" : "lte" })} title={ko ? "이하/이상 전환" : "Toggle ≤/≥"}>{nf.op === "lte" ? "≤" : "≥"}</button>
                  <input className="scv-numchip-v mono" type="number" value={nf.val} onChange={(e) => setNum(nf.key, { val: e.target.value === "" ? "" : +e.target.value })} onClick={(e) => e.stopPropagation()} />
                  <span className="scv-numchip-u mono">{numUnit(nf.key)}</span>
                  {cf && <span className="scv-numchip-warn" tabIndex={0}><Lic name="triangle-alert" size={11} cls="icon-sm" color="currentColor" /><span className="fin-tip scv-warntip"><b>{ko ? "관점과 반대 방향" : "Opposite to lens"}</b><span className="fin-tip-def">{ko ? `‘${fw ? fw.name.ko : ""}’ 관점은 ${SCV_INDLAB(nf.key, ko)} ${cf.dir === "low" ? "낮을" : "높을"}수록 우수로 채점해요(우수 ${cf.dir === "low" ? "≤" : "≥"}${cf.good}${numUnit(nf.key)}). 지금 필터는 반대로 ${nf.op === "lte" ? "≤" : "≥"}${nf.val}${numUnit(nf.key)}를 요구해 관점이 선호하는 종목을 걸러낼 수 있어요.` : `'${fw ? fw.name.en : ""}' rewards ${cf.dir === "low" ? "lower" : "higher"} ${SCV_INDLAB(nf.key, ko)} (good ${cf.dir === "low" ? "≤" : "≥"}${cf.good}${numUnit(nf.key)}); this filter requires the opposite.`}</span></span></span>}
                  <span className="scv-chip-x" onClick={() => delNum(nf.key)}><Lic name="x" size={11} cls="icon-sm" color="currentColor" /></span>
                </span>
              );
            })}
            <button className="iconbtn" style={{ width: 24, height: 24 }} onClick={openFilterAt} title={ko ? "필터 추가" : "Add filter"}><Lic name="plus" size={14} /></button>
            {(chips.length > 0 || filters.num.length > 0) && <span className="scv-fb-right"><span className="linklike" onClick={clearAll}>{ko ? "전체 해제" : "Clear all"}</span></span>}
          </div>

          {!groups.length
            ? <div className="empty-state"><Lic name="filter" size={26} color="var(--fg-4)" /><div className="es-title">{ko ? "해당 조건의 종목이 없습니다" : "No securities match"}</div><div className="es-sub">{ko ? "필터를 넓혀보세요" : "Try widening the filter"}</div></div>
            : layout === "board"
            ? <div className="scv-board">{groups.map((g) => (
              <div className="scv-bcol" key={g.key}>
                <div className="scv-bcol-head">
                  {g.head ? <><span className="scsum-dot" style={{ background: g.head.dot }} /><span className="scv-bcol-lab">{g.head.label}</span></> : <span className="scv-bcol-lab">{ko ? "전체" : "All"}</span>}
                  <span className="scv-bcol-n">{g.items.length}</span>
                </div>
                <div className="scv-bcol-body">{g.items.map((r) => {
                  const up = r.s.change >= 0;
                  return (
                    <div className="scv-card" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}>
                      <div className="scv-card-top">
                        <Flag market={r.s.market} size={14} />
                        <span className="mono scv-card-tk">{r.s.ticker}</span>
                        {!noLens && r.verdict && <span className="mono scv-card-score" style={{ color: SCV_VERDICT[r.verdict].color }}>{r.sc}/{r.max}</span>}
                      </div>
                      <div className="scv-card-name">{r.s.name[lang]}</div>
                      {!noLens && r.verdict && <span className="scv-card-meterwrap">
                        <ScvPips r={r} />
                        <VerdictTip r={r} ko={ko} cls="scv-vtip-card" fwId={fwId} />
                      </span>}
                      {r.valUp != null && <div className="scv-card-val" style={{ color: SCV_VAL[r.valV as ValV].color }}>{SCV_VAL[r.valV as ValV][lang]} {(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0)}%</div>}
                      <div className="scv-card-foot">
                        <span className="scv-card-sec">{r.s.sector[lang]}</span>
                        <span className="mono scv-card-price">{fmtCompact(r.s.price, r.s.cur)}</span>
                        <span className={"mono scv-card-chg " + (up ? "pos" : "neg")}>{up ? "+" : ""}{r.s.change.toFixed(2)}%</span>
                      </div>
                    </div>
                  );
                })}</div>
              </div>
            ))}</div>
            : layout === "heatmap"
            ? <div className="scv-heat">
              <div className="scv-heat-legend">
                {heatMode === "change"
                  ? <><span>{ko ? "하락" : "Down"}</span><span className="scv-leg-bar scv-leg-chg" /><span>{ko ? "상승" : "Up"}</span><span className="scv-leg-note">{ko ? "· 당일 등락" : "· daily change"}</span></>
                  : heatMode === "value"
                  ? <><span>{ko ? "고평가" : "Pricey"}</span><span className="scv-leg-bar scv-leg-score" /><span>{ko ? "저평가" : "Cheap"}</span><span className="scv-leg-note">{ko ? "· 적정가 대비" : "· vs fair value"}</span></>
                  : <><span>{ko ? "낮음" : "Low"}</span><span className="scv-leg-bar scv-leg-score" /><span>{ko ? "높음" : "High"}</span><span className="scv-leg-note">{ko ? "· " + (fw ? fw.name[lang] : "") + " 품질점수" : "· quality score"}</span></>}
              </div>
              {groups.map((g) => (
                <div className="scv-heat-grp" key={g.key}>
                  {g.head && <div className="grp-head">
                    <span className="scsum-dot" style={{ background: g.head.dot }} />
                    <span className="grp-title">{g.head.label}</span><span className="grp-count">{g.items.length}</span>
                  </div>}
                  <div className="scv-heat-grid">{g.items.map((r) => {
                    const up = r.s.change >= 0;
                    const dark = heatMode !== "change";
                    const bg = heatMode === "change"
                      ? scvHeatChange(r.s.change)
                      : heatMode === "value"
                      ? (r.valUp == null ? "var(--bg-elevated-2)" : scvHeatScore(Math.max(0, Math.min(1, (r.valUp + 30) / 60))))
                      : scvHeatScore(r.ratio || 0);
                    return (
                      <div className="scv-tile" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}
                        style={{ background: bg, color: dark ? "#0B0C0D" : "var(--fg)" }}
                        title={r.s.name[lang] + " · " + r.sc + "/" + r.max + " · " + (up ? "+" : "") + r.s.change.toFixed(2) + "%"}>
                        <div className="scv-tile-top">
                          <span className="mono scv-tile-tk">{r.s.ticker}</span>
                          <Flag market={r.s.market} size={12} />
                        </div>
                        <div className="scv-tile-nm">{r.s.name[lang]}</div>
                        <div className="scv-tile-val mono">{heatMode === "value" ? (r.valUp == null ? "—" : (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%") : heatMode === "score" ? (r.sc == null ? "—" : r.sc + "/" + r.max) : (up ? "+" : "") + r.s.change.toFixed(2) + "%"}</div>
                      </div>
                    );
                  })}</div>
                </div>
              ))}</div>
            : layout === "quadrant" && !noLens
            ? <div className="scv-quad">
              <div className="scv-quad-yax"><span>{ko ? "좋음" : "Strong"}</span><span>{ko ? "약함" : "Weak"}</span></div>
              <div className="scv-quad-main">
                <div className="scv-quad-plot">
                  <div className="scv-quad-cell tl"><span className="scv-quad-tag pos">{t.scv_buyzone}</span></div>
                  <div className="scv-quad-cell tr"><span className="scv-quad-tag">{ko ? "좋지만 비쌈" : "Strong but pricey"}</span></div>
                  <div className="scv-quad-cell bl"><span className="scv-quad-tag">{ko ? "싸지만 약함" : "Cheap but weak"}</span></div>
                  <div className="scv-quad-cell br"><span className="scv-quad-tag neg">{ko ? "비싸고 약함" : "Pricey & weak"}</span></div>
                  <div className="scv-quad-vline" /><div className="scv-quad-hline" />
                  {laid.map(({ r, x, y }) => {
                    const tx: React.CSSProperties = x > 62 ? { right: 0, left: "auto" } : x < 38 ? { left: 0, right: "auto" } : { left: "50%", transform: "translateX(-50%)" };
                    const ty: React.CSSProperties = y < 45 ? { top: "calc(100% + 9px)" } : { bottom: "calc(100% + 9px)" };
                    const vTone = r.valUp == null ? "var(--fg)" : r.valUp >= 0 ? "var(--pos)" : "var(--neg)";
                    return (
                      <div className={"scv-dot" + (x > 55 ? " scv-dot--l" : "")} key={r.s.ticker} style={{ left: x + "%", top: y + "%" }}
                        onClick={() => onOpenSecurity(r.s.ticker)}>
                        <span className="scv-dot-pt" style={{ background: SCV_VERDICT[r.verdict as Verdict].color }} />
                        <span className="scv-dot-lab">{r.s.ticker}</span>
                        <div className="scv-dot-tip" style={{ ...tx, ...ty }}>
                          <div className="gap-tip-q" style={{ display: "flex", alignItems: "center", gap: 6 }}><Flag market={r.s.market} size={13} /><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.s.name[lang]}</span></div>
                          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: SCV_VERDICT[r.verdict as Verdict].color }} />{ko ? "등급" : "Verdict"} <b style={{ color: SCV_VERDICT[r.verdict as Verdict].color }}>{SCV_VERDICT[r.verdict as Verdict][lang]}</b></div>
                          <div className="gap-tip-row">{ko ? "품질" : "Quality"} <b>{r.sc}/{r.max}</b></div>
                          <div className="gap-tip-row">{ko ? "적정가 대비" : "vs fair"} <b style={{ color: vTone }}>{r.valUp == null ? "—" : (r.valUp >= 0 ? (ko ? "저평가 " : "") : (ko ? "고평가 " : "")) + (r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"}</b></div>
                          <div style={{ font: "var(--fw-medium) 10px var(--font-mono)", color: "var(--fg-4)", marginTop: 3, paddingTop: 5, borderTop: "1px solid var(--border)" }}>{r.s.ticker} · {(r.s.gics || r.s.sector)[lang]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="scv-quad-xax"><span>{ko ? "저평가" : "Cheap"}</span><span className="scv-quad-xmid">{ko ? "적정가" : "Fair"}</span><span>{ko ? "고평가" : "Pricey"}</span></div>
              </div>
            </div>
            : <div className="scv-list scv-list-row">
              {groups.map((g) => (
                <div key={g.key}>
                  {g.head && <div className="grp-head">
                    <span className="scsum-dot" style={{ background: g.head.dot }} />
                    <span className="grp-title">{g.head.label}</span><span className="grp-count">{g.items.length}</span>
                  </div>}
                  {g.items.map((r) => {
                    const up = r.s.change >= 0;
                    const vk = r.verdict, vlab = vk ? SCV_VERDICT[vk] : null;
                    const lensOn = !noLens && !!vlab;
                    const numKeys = [...new Set(filters.num.map((n) => n.key))];
                    const evalKeys = noLens ? numKeys : focus;
                    const mcap = r.s.price * (r.s.sharesOut || 0) * 1e6;
                    return (
                      <div className={"plan-row scv-frow" + (lensOn ? " scv-frow-graded" : "")} key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)} style={lensOn && vlab ? { boxShadow: "inset 3px 0 0 " + vlab.color } : undefined}>
                        <Flag market={r.s.market} size={15} />
                        <span className="scv-frow-name">{r.s.name[lang]}</span>
                        <span className="scv-frow-ident">
                          <span className="scv-ident-sec">{r.s.sector ? r.s.sector[lang] : "—"}</span>
                          <span className="scv-ident-dot">·</span>
                          <span className="scv-ident-cap mono">{fmtMktCap(mcap, r.s.cur)}</span>
                          <ScvSpark spark={r.s.spark} up={up} />
                        </span>
                        <span className="scv-frow-spacer" />
                        {evalKeys.length > 0 && <span className="scv-frow-eval">
                          {lensOn && <span className="scv-frow-pips"><ScvPips r={r} /><VerdictTip r={r} ko={ko} fwId={fwId} /></span>}
                          {evalKeys.map((k) => {
                            const m = noLens ? { key: k, v: r.vals[k], fmt: SCV_PCT_KEYS.includes(k) ? "%" : "x" } : r.inds.find((x) => x.key === k);
                            const col = noLens ? "var(--fg-2)" : (m ? scvToneCol((m as { tone?: string }).tone) : "var(--fg-4)");
                            return <span className="scv-fmet" key={k}>{SCV_INDLAB_SHORT(k, ko)}<b className="mono" style={{ color: col }}>{m && m.v != null ? scvFmtV(m, ko) : "—"}</b></span>;
                          })}
                        </span>}
                        {r.valUp != null && <span className="scv-frow-val mono" style={{ color: SCV_VAL[r.valV as ValV].color, position: "relative" }}>{(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"} <span className="scv-frow-valv">{SCV_VAL[r.valV as ValV][lang]}</span><ValueTip r={r} ko={ko} /></span>}
                        {r.n > 0 && <NPlansBadge plans={plans} ticker={r.s.ticker} lang={lang} t={t} />}
                        <span className="mono scv-frow-price">{fmtCompact(r.s.price, r.s.cur)}</span>
                        <span className={"mono scv-frow-chg " + (up ? "pos" : "neg")}>{up ? "▲" : "▼"}{Math.abs(r.s.change).toFixed(2)}%</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>}

          {layout !== "quadrant" && failRows.length > 0 && <div className="scv-excl">
            <button className={"scv-excl-head" + (showExcl ? " open" : "")} onClick={() => setShowExcl((x) => !x)}>
              <Lic name={showExcl ? "chevron-down" : "chevron-right"} size={15} cls="icon-sm" color="var(--fg-4)" />
              <span className="scv-excl-n mono">{failRows.length}</span>
              <span className="scv-excl-lab">{ko ? "제외됨" : "Excluded"}</span>
              <span className="scv-excl-why">{ko ? (fw ? fw.name[lang] : "") + " 기준 미달" : "below grade rule"}</span>
            </button>
            {showExcl && <div className="scv-excl-body">
              {failRows.slice().sort(sorters[sortKey] || sorters.score).slice(0, 60).map((r) => {
                const up = r.s.change >= 0;
                return (
                  <div className="scv-excl-row" key={r.s.ticker} onClick={() => onOpenSecurity(r.s.ticker)}>
                    <Flag market={r.s.market} size={13} />
                    <span className="mono scv-excl-tk">{r.s.ticker}</span>
                    <span className="scv-excl-nm">{r.s.name[lang]}</span>
                    <span className="scv-excl-meterwrap"><ScvPips r={r} color={SCV_VERDICT.fail.color} /><VerdictTip r={r} ko={ko} fwId={fwId} /></span>
                    {r.valUp != null && <span className="mono scv-excl-val" style={{ color: SCV_VAL[r.valV as ValV].color }}>{(r.valUp >= 0 ? "+" : "") + r.valUp.toFixed(0) + "%"}</span>}
                    <span className={"mono scv-excl-chg " + (up ? "pos" : "neg")}>{up ? "+" : ""}{r.s.change.toFixed(2)}%</span>
                  </div>
                );
              })}
              {failRows.length > 60 && <div className="scv-excl-more">{ko ? "+" + (failRows.length - 60) + "개 더 — 필터로 좁혀보세요" : "+" + (failRows.length - 60) + " more — narrow with filters"}</div>}
            </div>}
          </div>}
        </div>
      </div>

      {panel === "filter" && <>
        <div className="overlay" onClick={() => { setFltOpen(null); setPanel(null); }} />
        <div className={"panel flt-menu" + (filterAnchor ? " anchored" : "")} style={filterAnchor ? { position: "fixed", left: filterAnchor.left, top: filterAnchor.top, width: 230, zIndex: 45 } : { top: 84, right: 52, width: 230, zIndex: 45 }} onMouseLeave={() => setFltOpen(null)}>
          <div className="flt-head">{ko ? "필터 추가…" : "Add filter…"}<span className="flt-kbd">F</span></div>
          {fltCats.map((cat) => {
            const on = fltOpen === cat.type;
            const cnt = (filters[cat.type as keyof Filters] as unknown[] | undefined)?.length || 0;
            const totalOpts = cat.groups ? cat.groups.reduce((a, g) => a + g.options.length, 0) : (cat.options || []).length;
            const showSearch = totalOpts >= 8;
            const q = showSearch ? numQuery.trim().toLowerCase() : "";
            const match = (o: FOpt) => !q || o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
            const searchRow = showSearch ? <div className="flt-search" onClick={(e) => e.stopPropagation()}><Lic name="search" size={13} cls="icon-sm" color="var(--fg-4)" /><input autoFocus value={numQuery} onChange={(e) => setNumQuery(e.target.value)} placeholder={ko ? "검색…" : "Search…"} /></div> : null;
            return (
              <div className={"v-menu-item flt-axis" + (on ? " hot" : "")} key={cat.type} onMouseEnter={() => setFltOpen(cat.type)}>
                <Lic name={cat.icon} size={14} cls="icon-sm" color="var(--fg-3)" />
                <span>{cat.label}</span>
                {cnt > 0 && <span className="flt-count">{cnt}</span>}
                <Lic name="chevron-right" size={14} cls="icon-sm" color="var(--fg-4)" />
                {on && <div className="flt-flyout" onMouseEnter={() => setFltOpen(cat.type)}>
                  <FltFlyoutBody
                    cat={cat} ko={ko} searchRow={searchRow} match={match}
                    fSel={fSel} fClick={fClick} fltGroupOn={fltGroupOn} toggleFltGroup={toggleFltGroup}
                  />
                </div>}
              </div>
            );
          })}
          <div className="scv-flt-foot"><span className="linklike" onClick={clearAll}>{ko ? "전체 해제" : "Clear all"}</span></div>
        </div>
      </>}

      {panel === "display" && <>
        <div className="overlay" onClick={() => setPanel(null)} />
        <div className="panel" style={{ position: "fixed", top: 84, right: 52, width: 300, zIndex: 45, padding: 8 }}>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "레이아웃" : "Layout"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {([["list", ko ? "리스트" : "List"], ["board", ko ? "보드" : "Board"], ["heatmap", ko ? "히트맵" : "Heatmap"], ...(noLens ? [] : [["quadrant", t.scv_quadrant]])] as [Layout, string][]).map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (layout === v ? " on" : "")} onClick={() => setLayout(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "정렬" : "Sort"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {([...(noLens ? [] : [["score", ko ? "점수" : "Score"]]), ["value", t.scv_value], ["change", ko ? "등락" : "Change"], ["name", ko ? "이름" : "Name"]] as [SortKey, string][]).map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (sortKey === v ? " on" : "")} onClick={() => setSortKey(v)}>{lab}</div>)}
            </div>
          </div>
          <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "묶음" : "Group"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {([...(noLens ? [] : [["verdict", ko ? "등급" : "Verdict"]]), ["sector", ko ? "섹터" : "Sector"], ["none", ko ? "없음" : "None"]] as [GroupBy, string][]).map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (groupBy === v ? " on" : "")} onClick={() => setGroupBy(v)}>{lab}</div>)}
            </div>
          </div>
          {layout === "heatmap" && <div className="disp-segrow"><span className="disp-segrow-lab">{ko ? "색상" : "Color"}</span>
            <div className="rb-modebar" style={{ margin: 0 }}>
              {([...(noLens ? [] : [["score", ko ? "품질" : "Quality"]]), ["value", t.scv_value], ["change", ko ? "등락" : "Change"]] as [HeatMode, string][]).map(([v, lab]) =>
                <div key={v} className={"rb-mode" + (heatMode === v ? " on" : "")} onClick={() => setHeatMode(v)}>{lab}</div>)}
            </div>
          </div>}
          <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />
          {layout === "list"
            ? (noLens
              ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)" }}>{ko ? "관점 없음 — 숫자 필터로 거릅니다" : "No lens — screen by metrics"}</div>
              : <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "리스트는 관점의 채점 지표를 컬럼으로 보여줍니다" : "List shows the lens's grade metrics as columns"}</div>)
            : layout === "board"
            ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "보드는 묶음 기준으로 컬럼을 나눕니다" : "Board splits columns by group"}</div>
            : layout === "quadrant"
            ? <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "세로=품질 · 가로=밸류(적정가 대비). 등급 필터는 무시됩니다." : "Y = quality · X = value. Verdict filter ignored."}</div>
            : <div className="side-cap" style={{ padding: "4px 8px", margin: 0, color: "var(--fg-4)", whiteSpace: "normal" }}>{ko ? "타일 색은 위 기준, 구획은 묶음 기준을 따릅니다" : "Tile color follows the metric above; sections follow Group"}</div>}
        </div>
      </>}
    </div>
  );
}

// 필터 패널 옵션/그룹/카테고리 타입 (원본 768-775 fltCats 형태). SWC 안전 위해 모듈 스코프.
interface FOpt { value: string; label: string; icon?: React.ReactNode; dim?: boolean; count?: number; tip?: string }
interface FGrp { label: string; options: FOpt[] }
interface FCat { type: string; label: string; icon: string; options?: FOpt[]; groups?: FGrp[] }

// 필터 옵션 행 — source/P4Views.jsx:776 FItem.
function FltItem({ type, o, sel, onClick }: { type: string; o: FOpt; sel: boolean; onClick: (type: string, value: string) => void }) {
  return (
    <div className={"v-menu-item" + (o.dim ? " flt-dim" : "")} title={o.tip || ""} onClick={(e) => { e.stopPropagation(); onClick(type, o.value); }}>
      {o.icon}<span>{o.label}</span>
      {o.count != null && !sel && <span className="flt-opt-n">{o.count}</span>}
      {sel && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
    </div>
  );
}

// 필터 flyout 본문 — source/P4Views.jsx:804-813(groups/options 분기). JSX-inline IIFE 회피용 본문 헬퍼(SWC 안전).
function FltFlyoutBody({ cat, ko, searchRow, match, fSel, fClick, fltGroupOn, toggleFltGroup }: {
  cat: FCat;
  ko: boolean;
  searchRow: React.ReactNode;
  match: (o: FOpt) => boolean;
  fSel: (type: string, value: string) => boolean;
  fClick: (type: string, value: string) => void;
  fltGroupOn: (type: string, keys: string[]) => boolean;
  toggleFltGroup: (type: string, keys: string[]) => void;
}) {
  if (cat.groups) {
    const grps = cat.groups.map((g) => ({ label: g.label, options: g.options.filter(match) })).filter((g) => g.options.length);
    return (
      <>
        {searchRow}
        {grps.length ? grps.map((g) => (
          <div className="flt-group" key={g.label}>
            <div className="flt-group-head" onClick={(e) => { e.stopPropagation(); toggleFltGroup(cat.type, g.options.map((o) => o.value)); }}>
              <span>{g.label}</span><span className="flt-group-hint">{ko ? "묶음" : "all"}</span>
              {fltGroupOn(cat.type, g.options.map((o) => o.value)) && <span className="check"><Lic name="check" size={14} cls="icon-sm" color="var(--accent)" /></span>}
            </div>
            {g.options.map((o) => <FltItem key={o.value} type={cat.type} o={o} sel={fSel(cat.type, o.value)} onClick={fClick} />)}
          </div>
        )) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}
      </>
    );
  }
  const opts = (cat.options || []).filter(match);
  return (
    <>
      {searchRow}
      {opts.length ? opts.map((o) => <FltItem key={o.value} type={cat.type} o={o} sel={fSel(cat.type, o.value)} onClick={fClick} />) : <div className="flt-empty">{ko ? "일치하는 항목 없음" : "No match"}</div>}
    </>
  );
}
