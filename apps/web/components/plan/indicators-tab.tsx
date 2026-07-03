// source/DetailView.jsx IndicatorsTab(1731~2230) 이식.
// 투자지표 탭 — 프레임워크(관점) 렌즈 + 뷰모드(카드/게이지/히트맵/표/차트) + 카테고리 그룹 +
// 핵심지표 카드 + 지표별 카드/게이지/히트맵(스파크라인·툴팁).
// (멀티플 밴드 차트 2종은 원본과 동일하게 밸류에이션 탭으로 이전 — valuation-tab.tsx.)
// 데이터: plan.fin 대신 props로 받은 fin(page.tsx가 buildPlanFin 으로 계산 — lib/fin-mapper).
// 카탈로그/임계값은 @keystone/core(screener·reference)에서 import(옛 typeof 가드 제거).
// priceHistory: 스파크라인 툴팁의 주가/배수 계산용 mock 이음새(lib/fin-history) — 마일스톤 6에서 실 히스토리로 교체.
// SVG/차트 계산/className/ko·en 문자열은 프로토타입 그대로. JSX→TSX(React.useState→named,
// style={null}→undefined, 이벤트/맵 콜백 타입 명시, "use client").
"use client";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import type { Fin, Indicator, Lang } from "@keystone/core/types";
import { IND_THRESH, gradeOf } from "@keystone/core/screener";
import { KS_METRIC_DICT, KS_METRIC_FORMULA, STRATEGIES } from "@keystone/core/reference";
import { fmtMoney } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { LensPicker } from "./financials-tab";
import { finPriceHistory } from "@/lib/fin-history";
import type { UIPlan } from "@/lib/plan-mapper";

// 프로토타입의 threshold 인라인 셰이프(good/warn/dir) — core Threshold 와 동형이나 marketTh 오버라이드가
// 부분(Partial) 병합이라 별도 타입으로 느슨하게 둔다.
type Th = { dir?: string; good?: number | string; warn?: number | string } | null | undefined;
// 프로토타입 tone 확장 grade 라벨 키 (core Grade + neutral).
type Tone = "good" | "mid" | "bad" | "neutral";
// STRATEGIES 항목 + 프로토타입이 옵션으로 참조하는 marketTh 슬롯(현 스키마엔 없음 — API 연동 시 채워짐).
type Framework = (typeof STRATEGIES)[number] & { marketTh?: Record<string, Record<string, Th>> };

// mini-막대/차트 호버 상태.
type MiniHov = { k: string; i: number } | null;

export function IndicatorsTab({ plan, fin: finRaw, t: _t, lang }: {
  plan: UIPlan; fin: Fin | null; t: unknown; lang: Lang;
}) {
  const [imode, setImode] = useState("card");
  const [trend, setTrend] = useState(true);
  const [indCat, setIndCat] = useState("all");
  const [miniHov, setMiniHov] = useState<MiniHov>(null);
  const [pinned, setPinned] = useState<Record<string, number | undefined>>({});
  const [chartSel, setChartSel] = useState<string[] | null>(null);
  const [chartBasis, setChartBasis] = useState("index");
  const [chartHov, setChartHov] = useState<number | null>(null);
  const [fwSel, setFwSel] = useState<string | null>(null);
  const fwId = fwSel === "none" ? null : (fwSel || plan.strategyId);
  const _fwObj = (STRATEGIES.find((s) => s.id === fwId) || {}) as Partial<Framework>;
  const _mkt = plan.cur === "USD" ? "US" : "KR";
  const _mktTh = (_fwObj.marketTh && _fwObj.marketTh[_mkt]) || {};
  const _commonTh = (_fwObj.thresholds || {}) as Record<string, Th>;
  const _fwTh: Record<string, Th> = {};
  Object.keys(_commonTh).forEach((k) => { _fwTh[k] = _commonTh[k]; });
  Object.keys(_mktTh).forEach((k) => { _fwTh[k] = { ...(_commonTh[k] as object), ...(_mktTh[k] as object) }; });
  const _gradeWith = (th: Th, v: number | null): Tone => { if (!th || v == null || !isFinite(v)) return "neutral"; const g = parseFloat(String(th.good)), w = parseFloat(String(th.warn)); if (isNaN(g) || isNaN(w)) return "neutral"; if (th.dir === "low") return v <= g ? "good" : v >= w ? "bad" : "mid"; return v >= g ? "good" : v <= w ? "bad" : "mid"; };
  const fin: Fin | null = (finRaw && finRaw.indicators) ? { ...finRaw, indicators: finRaw.indicators.map((m) => _fwTh[m.key] ? { ...m, tone: _gradeWith(_fwTh[m.key], m.v) } : m) } : finRaw;
  const fwModel = (STRATEGIES.find((s) => s.id === fwId) || ({} as Partial<Framework>)).model;
  const MODEL_LENS: Record<string, string> = { PER: "quality", DCF: "growth", PBR: "value", DDM: "dividend", EV: "quality", PSR: "growth" };
  const lens = (fwModel && MODEL_LENS[fwModel]) || null;

  // mock priceHistory 이음새 — PER/PBR/PSR 스파크라인 툴팁이 읽는 plan.priceHistory 를 fin 연도축에
  // 맞춰 합성해 붙인다(indMetricAt·metricSpark 의 주가/배수 계산용).
  // (마일스톤 6에서 lib/fin-history 를 실 히스토리로 교체하면 자동 승계.)
  const planWithHist: UIPlan = { ...plan, priceHistory: plan.priceHistory ?? finPriceHistory(plan, finRaw) };

  // fwKeys 는 useEffect 의존이라 조기 선언(원본은 클로저 hoist에 의존).
  const _fwObjForKeys = (STRATEGIES.find((s) => s.id === fwId) || {}) as Partial<Framework>;
  const _dictForKeys = KS_METRIC_DICT(lang === "ko");
  const fwKeys = ((_fwObjForKeys.gradeFocus || []) as string[]).filter((k) => _dictForKeys[k] && (fin?.indicators || []).some((m) => m.key === k));

  useEffect(() => { setChartSel(null); setChartHov(null); setIndCat((c) => (c === "focus" && !fwKeys.length) ? "all" : c); }, [fwId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setChartSel(null); setChartHov(null); }, [indCat]);
  if (!fin) return <div className="empty-tab">{lang === "ko" ? "지표 데이터 없음" : "No indicators"}</div>;
  const ko = lang === "ko";
  // 이름 + 한 줄 정의 (No-AI 고정 사전)
  const DICT = KS_METRIC_DICT(ko);
  const FORMULA = KS_METRIC_FORMULA;
  const GLAB: Record<string, string> = { good: ko ? "우수" : "Good", mid: ko ? "보통" : "Fair", bad: ko ? "주의" : "Watch", neutral: "—" };
  const dirTxt = (m: Indicator) => { const th = IND_THRESH[m.key]; if (!th) return ""; return th.dir === "high" ? (ko ? " 높을수록 좋아요." : " Higher is better.") : (ko ? " 낮을수록 좋아요." : " Lower is better."); };
  const CATS: [string, string][] = [["value", ko ? "밸류에이션" : "Valuation"], ["profit", ko ? "수익성" : "Profitability"], ["growth", ko ? "성장성" : "Growth"], ["stability", ko ? "안정성" : "Stability"], ["dividend", ko ? "배당" : "Dividend"]];
  const CAT_DESC: Record<string, string> = ko ? { value: "주가가 이익·자산·매출에 비해 비싼지 싼지 봐요. 저평가·고평가를 판단하는 지표 묶음이에요.", profit: "매출과 자본으로 얼마나 효율적으로 이익을 내는지 봐요. 돈 버는 힘을 보여줘요.", growth: "매출·이익이 작년보다 얼마나 빠르게 늘고 있는지 봐요.", stability: "빚 부담과 단기 지급 능력을 봐요. 재무가 얼마나 안전한지 보여줘요.", dividend: "배당을 얼마나, 또 얼마나 꾸준히 주는지 봐요." } : { value: "Is the price cheap or rich vs earnings/assets/sales", profit: "How efficiently the firm turns sales & capital into profit", growth: "How fast sales and profit grow vs last year", stability: "Debt burden and short-term solvency (financial safety)", dividend: "How much and how steadily it pays dividends" };
  const catLabel = (cat: string, label: string) => <span className="fin-term">{label}<span className="ind-q">?</span><span className="fin-tip"><b>{label}</b><span className="fin-tip-def">{CAT_DESC[cat] || ""}</span></span></span>;
  const fmt = (m: { v: number | null; fmt: string }) => m.v == null || !isFinite(m.v) ? "—" : m.fmt === "x" ? m.v.toFixed(1) + (ko ? "배" : "×") : m.v.toFixed(1) + "%";
  // why-this-grade: the threshold band that produced the tone badge (data-driven from IND_THRESH; works for every metric)
  const gradeBand = (m: Indicator) => {
    const th = IND_THRESH[m.key];
    if (!th || m.v == null || !isFinite(m.v)) return null;
    const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%";
    const goodTxt = (th.dir === "low" ? "≤" : "≥") + th.good + unit;
    const warnTxt = (th.dir === "low" ? "≥" : "≤") + th.warn + unit;
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : "var(--r-base)";
    const zone = m.tone === "good" ? (ko ? "우수 구간" : "Good zone") : m.tone === "bad" ? (ko ? "주의 구간" : "Watch zone") : (ko ? "보통 구간" : "Fair zone");
    return <span className="fin-tip-grade"><span className="fin-tip-grade-now">{ko ? "현재 " : ""}<b>{fmt(m)}</b> · <b style={{ color: col }}>{zone}</b></span><span className="fin-tip-grade-sc"><span className="ftg-good">{ko ? "우수" : "Good"} {goodTxt}</span><span className="ftg-sep">·</span><span className="ftg-bad">{ko ? "주의" : "Watch"} {warnTxt}</span></span></span>;
  };
  // 투자 스타일 렌즈 — 누르면 그 관점 지표가 위로
  const LENSES: [string, string, string[]][] = [["value", ko ? "가치" : "Value", ["PER", "PBR", "PSR", "PCR"]], ["growth", ko ? "성장" : "Growth", ["REVG", "OPG", "NPG", "PEG"]], ["dividend", ko ? "배당" : "Dividend", ["DIVY", "PAYOUT", "DIVG"]], ["quality", ko ? "퀄리티" : "Quality", ["ROE", "ROA", "OPM", "GPM"]]];
  const activeLens = LENSES.find((l) => l[0] === lens);
  const _lensItems = activeLens ? activeLens[2].map((k) => fin.indicators.find((m) => m.key === k)).filter(Boolean) : [];
  void _lensItems;
  const card = (m: Indicator, scope?: string) => {
    const d = DICT[m.key] || [m.key, ""];
    const spark = trend ? metricSpark(m.key, scope, true) : null;
    const hk = (scope || "") + ":" + m.key, curRaw = (fin.is || []).length - 1;
    let pi = pinned[hk]; if (pi != null && pi === curRaw) pi = undefined;
    let dv = m.v, dt: Tone = m.tone, pinYear: string | null = null;
    if (pi != null) { const pv = indMetricAt(m.key, pi); if (pv != null && isFinite(pv)) { dv = pv; dt = gradeOf(m.key, pv); pinYear = (fin.is[pi] || ({} as { y?: string })).y ?? null; } }
    return (
      <div className="ind-card" key={m.key}>
        <div className="ind-card-top"><span className="ind-name fin-term">{d[0]}<span className="ind-q">?</span><span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span></span><span className="ind-card-tr">{pinYear != null && <span className="ind-pin" onClick={() => setPinned((pp) => ({ ...pp, [hk]: undefined }))}>{pinYear}<span className="ind-pin-x">✕</span></span>}<span className={"ind-grade ind-" + dt}><span className="ind-dot" />{GLAB[dt]}</span></span></div>
        <div className={"ind-val ind-v-" + dt}>{fmt({ v: dv, fmt: m.fmt })}</div>
        {spark && <div className="ind-spark">{spark}</div>}
      </div>
    );
  };
  // 게이지: 값을 우수↔주의 구간 위 위치로
  const gauge = (m: Indicator, scope?: string) => {
    const d = DICT[m.key] || [m.key, ""];
    const th = IND_THRESH[m.key];
    let pct = 50;
    if (th && m.v != null && isFinite(m.v)) {
      const lo = Math.min(th.good, th.warn), hi = Math.max(th.good, th.warn), span = (hi - lo) || 1;
      let p = (m.v - lo) / span; p = Math.max(-0.25, Math.min(1.25, p));
      pct = th.dir === "low" ? (1 - (p + 0.25) / 1.5) * 100 : ((p + 0.25) / 1.5) * 100;
      pct = Math.max(3, Math.min(97, pct));
    }
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : "var(--r-base)";
    const spark = trend ? metricSpark(m.key, scope) : null;
    const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%";
    let interp = "";
    if (th) {
      const goodTxt = (th.dir === "low" ? "≤" : "≥") + th.good + unit, warnTxt = (th.dir === "low" ? "≥" : "≤") + th.warn + unit;
      const gword = m.tone === "good" ? (ko ? "우수 구간" : "good zone") : m.tone === "bad" ? (ko ? "주의 구간" : "watch zone") : (ko ? "보통 구간" : "fair zone");
      interp = ko ? `현재 ${fmt(m)} — ${gword}. 우수 ${goodTxt} · 주의 ${warnTxt} 기준.` : `${fmt(m)} — ${gword}. Good ${goodTxt} · Watch ${warnTxt}.`;
    }
    return (
      <div className="ind-gauge" key={m.key}>
        <div className="ind-g-top"><span className="ind-name fin-term">{d[0]}<span className="ind-q">?</span><span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span></span><span className={"ind-grade ind-" + m.tone} style={{ marginLeft: "auto" }}><span className="ind-dot" />{GLAB[m.tone]}</span><span className="ind-g-val" style={{ marginLeft: 8 }}>{fmt(m)}</span></div>
        <div className="ind-g-track ind-g-hov"><div className="ind-g-mark" style={{ left: pct + "%", background: col }} />{interp && <span className="fin-tip" style={{ left: pct + "%", transform: "translateX(-50%)" }}><b style={{ color: col }}>{d[0]} · {GLAB[m.tone]}</b><span className="fin-tip-def">{interp}</span><span className="fin-tip-def" style={{ color: "var(--fg-4)" }}>{d[1]}</span></span>}</div>
        <div className="ind-g-scale"><span>{ko ? "주의" : "Watch"}</span><span>{ko ? "우수" : "Good"}</span></div>
        {spark && <div className="ind-spark">{spark}</div>}
      </div>
    );
  };
  // 히트맵 셀
  const heat = (m: Indicator) => {
    const d = DICT[m.key] || [m.key, ""];
    const col = m.tone === "good" ? "var(--pos)" : m.tone === "bad" ? "var(--neg)" : m.tone === "mid" ? "var(--r-base)" : "var(--fg-4)";
    return (
      <div className="ind-heat fin-term" key={m.key} style={{ background: "color-mix(in srgb, " + col + " 18%, transparent)", borderColor: "color-mix(in srgb, " + col + " 40%, transparent)" }}>
        <div className="ind-heat-top"><span className="ind-heat-k">{d[0]}</span><span className="ind-heat-g" style={{ color: col }}><span className="ind-dot" />{GLAB[m.tone]}</span></div><span className="ind-heat-v">{fmt(m)}</span>
        <span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span>
      </div>
    );
  };
  const renderItems = (items: Indicator[], scope?: string) => imode === "gauge" ? <div className="ind-gauge-grid">{items.map((m) => gauge(m, scope))}</div> : imode === "heat" ? <div className="ind-heat-grid">{items.map(heat)}</div> : <div className="ind-grid">{items.map((m) => card(m, scope))}</div>;
  // 미니 막대 (5년 추세) — 지표 색 + 최근값 강조 + 막대 호버(연도·값)
  function metricSpark(key: string, scope?: string, pinnable?: boolean) {
    const pts = (fin!.is || []).map((r, i) => ({ y: r.y, v: indMetricAt(key, i), i })).filter((p) => p.v != null && isFinite(p.v)) as { y: string; v: number; i: number }[];
    if (pts.length < 2) return null;
    const series = pts.map((p) => p.v);
    const max = Math.max(...series), min = Math.min(...series), span = (max - min) || 1;
    const W = 64, H = 22, n = series.length, gap = 2, bw = (W - gap * (n - 1)) / n;
    const mm = fin!.indicators.find((x) => x.key === key) || ({} as Partial<Indicator>);
    const gcol = (v: number) => { const tn = gradeOf(key, v); return tn === "good" ? "var(--pos)" : tn === "bad" ? "var(--neg)" : tn === "mid" ? "var(--r-base)" : "var(--fg-4)"; };
    const th2 = IND_THRESH[key];
    const dirHint = th2 ? (th2.dir === "low" ? (ko ? "낮을수록 좋아요" : "Lower is better") : (ko ? "높을수록 좋아요" : "Higher is better")) : null;
    const unit = mm.fmt === "x" ? (ko ? "배" : "×") : "%";
    const hk = (scope || "") + ":" + key, hov = miniHov && miniHov.k === hk ? miniHov.i : null;
    const pinI = (pinnable && pinned[hk] != null && pinned[hk] !== ((fin!.is || []).length - 1)) ? (pinned[hk] as number) : null;
    const activeF = pinI != null ? pts.findIndex((p) => p.i === pinI) : (n - 1);
    const dname = (DICT[key] || [key])[0];
    let tipEl = null;
    if (hov != null && pts[hov]) {
      const p = pts[hov], gtone = gradeOf(key, p.v);
      const prev = hov > 0 ? pts[hov - 1].v : null, yoy = (prev != null && prev !== 0) ? (p.v - prev) / Math.abs(prev) * 100 : null;
      let bd: { pxv: number; dl: string; den: number } | null = null;
      if (["PER", "PBR", "PSR", "PCR"].indexOf(key) >= 0) {
        const fis = fin!.is[p.i], fbs = (fin!.bs || [])[p.i], fcf = (fin!.cf || [])[p.i];
        if (fis) {
          const sh = (planWithHist.sharesOut || 1) * 1e6, ph = planWithHist.priceHistory || [];
          const pxv = ph.length ? ((ph[Math.min(p.i, ph.length - 1)] || ({} as { v?: number })).v || planWithHist.currentPrice) : planWithHist.currentPrice;
          let den: number | null = null, dl = "";
          if (key === "PER") { den = fis.net / sh; dl = "EPS"; }
          else if (key === "PBR") { den = fbs ? fbs.equity / sh : null; dl = "BPS"; }
          else if (key === "PSR") { den = fis.rev / sh; dl = "SPS"; }
          else { den = fcf ? fcf.ocf / sh : null; dl = "CFPS"; }
          if (den != null && isFinite(den)) bd = { pxv, dl, den };
        }
      }
      tipEl = (
        <div className="ind-spark-tip">
          <div className="ist-yr">{p.y}</div>
          <div className="ist-main"><span className="ist-name">{dname}</span><span className="ist-val" style={{ color: gcol(p.v) }}>{p.v.toFixed(1)}{unit}</span></div>
          <div className="ist-rows">
            {yoy != null && <div className="ist-row"><span className="ist-lab">{ko ? "전년대비" : "YoY"}</span><span className="ist-chg">{(yoy >= 0 ? "▲ +" : "▼ ") + yoy.toFixed(0)}%</span></div>}
            {bd && <div className="ist-row"><span className="ist-lab">{ko ? "주가" : "Price"}</span><span className="ist-num">{fmtMoney(bd.pxv, planWithHist.cur)}</span></div>}
            {bd && <div className="ist-row"><span className="ist-lab">{bd.dl}</span><span className="ist-num">{fmtMoney(bd.den, planWithHist.cur)}</span></div>}
            <div className="ist-row"><span className="ist-lab">{ko ? "등급" : "Grade"}</span><span className={"ist-grade ind-" + gtone}><span className="ind-dot" />{GLAB[gtone]}</span></div>
            {dirHint && <div className="ist-row"><span className="ist-lab">{ko ? "방향" : "Goal"}</span><span style={{ font: "var(--fw-medium) 11px var(--font-sans)", color: "var(--fg-3)" }}>{dirHint}</span></div>}
          </div>
        </div>
      );
    }
    return (
      <div className="ind-spark-wrap">
        <svg width={W} height={H} style={{ display: "block" }}>
          {series.map((v, i) => { const h = 3 + (v - min) / span * (H - 4); const act = i === activeF; return <rect key={i} x={(i * (bw + gap)).toFixed(1)} y={(H - h).toFixed(1)} width={bw.toFixed(1)} height={h.toFixed(1)} rx="1" fill={gcol(v)} opacity={hov == null ? (act ? 1 : 0.5) : (hov === i ? 1 : 0.25)} stroke={pinI != null && act ? "var(--fg)" : "none"} strokeWidth={pinI != null && act ? 1.4 : 0} />; })}
          {pts.map((p, i) => <rect key={"h" + i} x={(i * (bw + gap) - gap / 2).toFixed(1)} y="0" width={(bw + gap).toFixed(1)} height={H} fill="transparent" style={{ pointerEvents: "all", cursor: pinnable ? "pointer" : "default" }} onMouseEnter={() => setMiniHov({ k: hk, i })} onMouseLeave={() => setMiniHov((h) => h && h.k === hk && h.i === i ? null : h)} onClick={pinnable ? (() => setPinned((pp) => ({ ...pp, [hk]: pp[hk] === p.i ? undefined : p.i }))) : undefined} />)}
        </svg>
        {tipEl}
      </div>
    );
  }
  function indMetricAt(key: string, i: number): number | null {
    const is = fin!.is[i], bs = fin!.bs[i], cf = fin!.cf[i]; if (!is) return null;
    const shares = (planWithHist.sharesOut || 1) * 1e6;
    const ph = planWithHist.priceHistory || [];
    const px = ph.length ? (ph[Math.min(i, ph.length - 1)] || ({} as { v?: number })).v || planWithHist.currentPrice : planWithHist.currentPrice;
    const eps = is.net / shares, bps = bs ? bs.equity / shares : null, sps = is.rev / shares, cfps = cf ? cf.ocf / shares : null;
    switch (key) {
      case "OPM": return is.opm; case "NPM": return is.net / is.rev * 100; case "GPM": return is.gross / is.rev * 100;
      case "ROE": return bs && bs.equity ? is.net / bs.equity * 100 : null;
      case "ROA": return bs && bs.assets ? is.net / bs.assets * 100 : null;
      case "DEBT": return bs && bs.equity ? bs.liab / bs.equity * 100 : null;
      case "CURR": return bs && bs.curLiab ? bs.curAssets / bs.curLiab * 100 : null;
      case "PER": return eps > 0 ? px / eps : null;
      case "PBR": return bps != null && bps > 0 ? px / bps : null;
      case "PSR": return sps > 0 ? px / sps : null;
      case "PCR": return cfps != null && cfps > 0 ? px / cfps : null;
      case "EVEB": { const ebitda = is.op * 1.18; return ebitda > 0 ? (px * shares + (bs ? bs.liab * 0.4 : 0)) / ebitda : null; }
      case "PEG": { if (!(eps > 0)) return null; const g = indMetricAt("REVG", i); return (g != null && g > 0) ? (px / eps) / g : null; }
      case "REVG": return i > 0 && fin!.is[i - 1].rev ? (is.rev - fin!.is[i - 1].rev) / fin!.is[i - 1].rev * 100 : null;
      case "OPG": return i > 0 && fin!.is[i - 1].op ? (is.op - fin!.is[i - 1].op) / Math.abs(fin!.is[i - 1].op) * 100 : null;
      case "NPG": return i > 0 && fin!.is[i - 1].net ? (is.net - fin!.is[i - 1].net) / Math.abs(fin!.is[i - 1].net) * 100 : null;
      default: return null;
    }
  }
  // 공통 툴팁 + 5년 시계열
  const tip = (m: Indicator, d: [string, string] | string[]) => <span className="fin-tip"><b>{d[0]}</b><span className="fin-tip-def">{d[1]}<span className="fin-tip-dir">{dirTxt(m)}</span></span>{FORMULA[m.key] && <span className="fin-tip-f">{FORMULA[m.key]}</span>}{gradeBand(m)}{trendNote(m.key)}</span>;
  const indSeries = (key: string) => (fin!.is || []).map((r, i) => ({ y: r.y, v: indMetricAt(key, i) })).filter((p) => p.v != null && isFinite(p.v as number)) as { y: string; v: number }[];
  // 추세 해석: 최근 5년 방향(증가/감소/유지) + 변화폭 + 방향이 유리한지
  const trendNote = (key: string) => {
    const ps = (fin!.is || []).map((r, i) => indMetricAt(key, i)).filter((v) => v != null && isFinite(v as number)) as number[];
    if (ps.length < 2) return null;
    const first = ps[0], last = ps[ps.length - 1], chg = last - first;
    const pct = first !== 0 ? chg / Math.abs(first) * 100 : (chg > 0 ? 100 : chg < 0 ? -100 : 0);
    let up = 0, dn = 0; for (let i = 1; i < ps.length; i++) { const dd = ps[i] - ps[i - 1]; if (dd > 1e-9) up++; else if (dd < -1e-9) dn++; }
    const steps = ps.length - 1, steady = up === steps || dn === steps, absPct = Math.abs(pct);
    const dir = absPct < 4 ? 0 : (chg > 0 ? 1 : -1);
    const th = IND_THRESH[key], lowBetter = th && th.dir === "low";
    let word;
    if (dir === 0) word = ko ? "최근 5년 거의 변동 없이 비슷한 수준" : "broadly flat over the last 5y";
    else { const udw = dir > 0 ? (ko ? "늘어나는" : "rising") : (ko ? "줄어드는" : "falling"); const pace = steady ? (ko ? "꾸준히 " : "steadily ") : (ko ? "전반적으로 " : ""); word = ko ? ("최근 5년 " + pace + udw + " 추세") : (pace + udw + " over 5y"); }
    let fav = ""; if (dir !== 0 && th) { const good = (dir > 0 && !lowBetter) || (dir < 0 && lowBetter); fav = ko ? (good ? " · 방향은 긍정적" : " · 방향은 부담") : (good ? " · favorable" : " · a headwind"); }
    const pctTxt = dir === 0 ? "" : (" (" + (pct > 0 ? "+" : "") + pct.toFixed(0) + "%)");
    return <span className="fin-tip-trend">{word}{pctTxt}{fav}</span>;
  };
  const grouped = CATS.map(([cat, label]) => ({ cat, label, items: fin.indicators.filter((m) => m.cat === cat) })).filter((g) => g.items.length);
  // 현재 프레임워크 + 핵심 지표 (gradeFocus → 실제 지표 키)
  const fwObj = (STRATEGIES.find((s) => s.id === fwId) || {}) as Partial<Framework>;
  const fwColor = fwObj.color || "var(--accent)";
  const PALETTE = ["var(--accent)", "#4CB782", "#F2994A", "#BB6BD9", "#E0A93E", "#2BB3A3", "#EB5757", "#4C8DFF"];
  // ---- 프레임워크 핵심 지표 카드 (모든 뷰 상단) ----
  const keyCards = () => {
    if (!fwKeys.length) return null;
    return (
      <div className="fin-keycards" style={{ "--fw-c": fwColor } as CSSProperties}>
        <div className="fin-keycards-cap"><Lic name="star" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 지표` : `${fwObj.name.en} key metrics`) : (ko ? "핵심 지표" : "Key metrics")}</div>
        <div className="fin-keycard-grid">
          {fwKeys.map((k) => { const m = fin.indicators.find((x) => x.key === k)!; const d = DICT[k] || [k, ""]; const s = indSeries(k); const lv = s.length ? s[s.length - 1].v : null, pv = s.length > 1 ? s[s.length - 2].v : null; const chg = (lv != null && pv != null) ? lv - pv : null; const unit = m.fmt === "x" ? (ko ? "배" : "×") : "%p"; return (
            <div className="fin-keycard" key={k}>
              <div className="fin-keycard-top"><span className="fin-keycard-lab fin-term">{d[0]}<span className="ind-q">?</span>{tip(m, d)}</span><span className={"ind-grade ind-" + m.tone}><span className="ind-dot" />{GLAB[m.tone]}</span></div>
              <div className="fin-keycard-val">{fmt(m)}</div>
              {chg != null && <div className={"fin-keycard-yoy " + (chg >= 0 ? "pos" : "neg")}>{(chg >= 0 ? "+" : "") + chg.toFixed(1) + unit + " " + (ko ? "전년" : "YoY")}</div>}
            </div>
          ); })}
        </div>
      </div>
    );
  };
  // ---- 1C: 슬림 렌즈 스트립 — 카테고리 scope에서 관점 핵심지표를 한 줄로 (전체엔 keyCards 히어로) ----
  const lensStrip = () => {
    if (!fwKeys.length) return null;
    return (
      <div className="lens-strip" style={{ "--fw-c": fwColor } as CSSProperties}>
        <span className="ls-title"><Lic name="scan-search" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? fwObj.name[lang] : (ko ? "관점" : "Lens")}</span>
        <span className="ls-sep" />
        {fwKeys.map((k) => { const m = fin.indicators.find((x) => x.key === k); if (!m) return null; const d = DICT[k] || [k, ""]; return (
          <span className="ls-item fin-term" key={k}>{d[0]} <b>{fmt(m)}</b> <span className={"ind-grade ind-" + m.tone}><span className="ind-dot" />{GLAB[m.tone]}</span>{tip(m, d)}</span>
        ); })}
      </div>
    );
  };
  // ---- 다계열 시계열 차트 (지수 rebase 또는 실제값) — 단일 선택 시 등급 구간 음영 ----
  const renderIndChart = (selKeys: string[], opts?: { compact?: boolean }) => {
    opts = opts || {}; const compact = !!opts.compact, interactive = !compact;
    const single = selKeys.length === 1;
    const W = 760, H = compact ? 152 : 256, padL = 46, padR = 14, padT = 14, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const years = (fin.is || []).map((r) => r.y), n = years.length;
    const ser = selKeys.map((k, si) => { const m = fin.indicators.find((x) => x.key === k) || ({} as Partial<Indicator>); return { k, lab: (DICT[k] || [k])[0], color: PALETTE[si % PALETTE.length], raw: (fin.is || []).map((r, i) => indMetricAt(k, i)), fmtx: m.fmt, tone: m.tone, vals: [] as (number | null)[] }; });
    const units = new Set(ser.map((s) => s.fmtx === "x" ? "x" : "pct"));
    const useIndex = !single && (chartBasis === "index" || units.size > 1);
    ser.forEach((s) => { const fv0 = s.raw.find((v) => v != null && isFinite(v)); const base = (fv0 != null && fv0 !== 0) ? fv0 : 1; s.vals = s.raw.map((v) => v == null || !isFinite(v) ? null : useIndex ? v / base * 100 : v); });
    const all = ser.flatMap((s) => s.vals).filter((v) => v != null) as number[];
    const th = single ? IND_THRESH[selKeys[0]] : null;
    // 다지표일 때 이상치(폭증/폭락 지표)가 축을 망가뜨리지 않게 5~95 퍼센타일로 범위 산출
    const sortedAll = all.slice().sort((a, b) => a - b);
    const pctl = (q: number) => { if (!sortedAll.length) return 0; const idx = (sortedAll.length - 1) * q; const l = Math.floor(idx), h2 = Math.ceil(idx); return sortedAll[l] + (sortedAll[h2] - sortedAll[l]) * (idx - l); };
    const robust = !single && ser.length > 3;
    let lo = all.length ? (robust ? pctl(0.05) : Math.min(...all)) : 0, hi = all.length ? (robust ? pctl(0.95) : Math.max(...all)) : 1;
    if (th) { lo = Math.min(lo, th.good, th.warn); hi = Math.max(hi, th.good, th.warn); }
    if (useIndex) { lo = Math.min(lo, 100); hi = Math.max(hi, 100); }
    if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
    const padv = (hi - lo) * 0.14 || Math.abs(hi) * 0.14 || 1; lo -= padv; hi += padv;
    const span = (hi - lo) || 1;
    const X = (i: number) => padL + (n <= 1 ? iw / 2 : i / (n - 1) * iw);
    const Y = (v: number) => padT + (1 - (v - lo) / span) * ih;
    const Yc = (v: number) => Math.max(padT, Math.min(padT + ih, Y(v)));  // 축 밖 이상치는 가장자리로 클램프(선·점은 계속 보이게)
    const outOfRange = (v: number | null) => v != null && (Y(v) < padT - 0.5 || Y(v) > padT + ih + 0.5);
    let zones: { y: number; h: number; c: string }[] = [];
    if (th) { const yg = Math.max(padT, Math.min(padT + ih, Y(th.good))), yw = Math.max(padT, Math.min(padT + ih, Y(th.warn))); if (th.dir === "high") zones = [{ y: padT, h: yg - padT, c: "var(--pos)" }, { y: yw, h: padT + ih - yw, c: "var(--neg)" }]; else zones = [{ y: yg, h: padT + ih - yg, c: "var(--pos)" }, { y: padT, h: yw - padT, c: "var(--neg)" }]; zones = zones.filter((z) => z.h > 0.5); }
    const grid = [0, 0.5, 1].map((f) => ({ v: lo + (hi - lo) * (1 - f), y: padT + f * ih }));
    const axFmt = (v: number) => useIndex ? v.toFixed(0) : (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    return (
      <div className="ind-chart-svgwrap">
        <svg className="ind-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
          {zones.map((z, i) => <rect key={"z" + i} x={padL} y={z.y} width={iw} height={z.h} fill={z.c} opacity="0.07" />)}
          {grid.map((g, i) => <g key={"g" + i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 7} y={g.y + 3.5} textAnchor="end" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{axFmt(g.v)}</text>
          </g>)}
          {useIndex && Y(100) > padT && Y(100) < padT + ih && <line x1={padL} x2={W - padR} y1={Y(100)} y2={Y(100)} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {ser.map((s) => <g key={s.k}>
            <path d={s.vals.map((v, i) => v == null ? null : `${s.vals.slice(0, i).every((x) => x == null) ? "M" : "L"}${X(i).toFixed(1)} ${Yc(v).toFixed(1)}`).filter(Boolean).join(" ")} fill="none" stroke={s.color} strokeWidth={single ? 2.2 : 2} strokeLinejoin="round" strokeLinecap="round" opacity={robust ? 0.92 : 1} />
            {s.vals.map((v, i) => v == null ? null : <circle key={i} cx={X(i)} cy={Yc(v)} r={(interactive && chartHov === i) ? 3.8 : (ser.length > 8 ? 2 : 2.6)} fill={outOfRange(v) ? "var(--bg-app)" : s.color} stroke={s.color} strokeWidth={outOfRange(v) ? 1.4 : 0} />)}
          </g>)}
          {years.map((yr, i) => <text key={"x" + i} x={X(i)} y={H - 8} textAnchor="middle" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{("" + yr).slice(-2)}</text>)}
          {interactive && chartHov != null && <line x1={X(chartHov)} x2={X(chartHov)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {interactive && years.map((yr, i) => <rect key={"hz" + i} x={X(i) - iw / (2 * (n - 1 || 1))} y={padT} width={iw / (n - 1 || 1)} height={ih} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setChartHov(i)} onMouseLeave={() => setChartHov((h) => h === i ? null : h)} />)}
        </svg>
        {interactive && chartHov != null && (() => { const frac = (n <= 1 ? 0.5 : chartHov / (n - 1)); const tx = frac < 0.18 ? "-8%" : frac > 0.82 ? "-92%" : "-50%"; const cols = ser.length > 14 ? 3 : ser.length > 7 ? 2 : 1; return (
        <div className={"fcb-tip cols" + cols} style={{ left: (X(chartHov) / W * 100) + "%", transform: "translateX(" + tx + ")" }}>
          <div className="fcb-tip-yr">{years[chartHov]}</div>
          <div className="fcb-tip-rows">{ser.map((s) => <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{s.vals[chartHov] == null ? "—" : useIndex ? s.vals[chartHov]!.toFixed(0) : s.vals[chartHov]!.toFixed(1) + (s.fmtx === "x" ? (ko ? "배" : "×") : "%")}</span></div>)}</div>
        </div>
        ); })()}
      </div>
    );
  };
  // 같은 단위 영역: 연도별 묶음 막대 (실제값, 0 기준) + 연도 호버 툴팁
  const renderIndBars = (selKeys: string[], opts?: { index?: boolean }) => {
    opts = opts || {}; const idx = !!opts.index;
    const W = 760, H = 178, padL = 44, padR = 12, padT = 14, padB = 24;
    const iw = W - padL - padR, ih = H - padT - padB;
    const years = (fin.is || []).map((r) => r.y), n = years.length || 1;
    const ser = selKeys.map((k, si) => { const m = fin.indicators.find((x) => x.key === k) || ({} as Partial<Indicator>); const real = (fin.is || []).map((r, i) => indMetricAt(k, i)); const base = real.find((v) => v != null && isFinite(v) && v !== 0); const raw = (idx && base) ? real.map((v) => (v == null || !isFinite(v)) ? null : v / base * 100) : real; return { k, lab: (DICT[k] || [k])[0], color: PALETTE[si % PALETTE.length], raw, real, x: m.fmt === "x" }; });
    const all = ser.flatMap((s) => s.raw).filter((v) => v != null && isFinite(v)) as number[];
    let hi = all.length ? Math.max(...all, 0) : 1; const lo = all.length ? Math.min(...all, 0) : 0;
    if (hi - lo < 1e-6) hi += 1;
    hi += (hi - lo) * 0.12;
    const span = (hi - lo) || 1;
    const Y = (v: number) => padT + (1 - (v - lo) / span) * ih, y0 = Y(0);
    const gw = iw / n, ip = gw * 0.16, bw = (gw - ip * 2) / ser.length;
    const grid = [0, 0.5, 1].map((f) => ({ v: lo + (hi - lo) * (1 - f), y: padT + f * ih }));
    const ax = (v: number) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
    const unit = (s: { x: boolean }) => s.x ? (ko ? "배" : "×") : "%";
    return (
      <div className="ind-chart-svgwrap">
        <svg className="ind-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H }}>
          {grid.map((g, i) => <g key={"g" + i}><line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" /><text x={padL - 6} y={g.y + 3.5} textAnchor="end" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{ax(g.v)}</text></g>)}
          {lo < 0 && <line x1={padL} x2={W - padR} y1={y0} y2={y0} stroke="var(--border-strong)" />}
          {years.map((yr, gi) => { const gx = padL + gi * gw + ip; return <g key={gi}>{ser.map((s, si) => { const v = s.raw[gi]; if (v == null || !isFinite(v)) return null; const yv = Y(v), top = Math.min(yv, y0), hgt = Math.max(0.8, Math.abs(yv - y0)); return <rect key={s.k} x={(gx + si * bw + 0.8).toFixed(1)} y={top.toFixed(1)} width={Math.max(1, bw - 1.6).toFixed(1)} height={hgt.toFixed(1)} rx="1.5" fill={s.color} opacity={chartHov == null || chartHov === gi ? 1 : 0.32} />; })}</g>; })}
          {years.map((yr, i) => <text key={"x" + i} x={padL + i * gw + gw / 2} y={H - 7} textAnchor="middle" fill="var(--fg-4)" style={{ font: "var(--fw-medium) 9.5px var(--font-mono)" }}>{("" + yr).slice(-2)}</text>)}
          {years.map((yr, i) => <rect key={"hz" + i} x={padL + i * gw} y={padT} width={gw} height={ih} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setChartHov(i)} onMouseLeave={() => setChartHov((h) => h === i ? null : h)} />)}
        </svg>
        {chartHov != null && (() => { const frac = (n <= 1 ? 0.5 : chartHov / (n - 1)); const tx = frac < 0.2 ? "-6%" : frac > 0.8 ? "-94%" : "-50%"; const cx = padL + chartHov * gw + gw / 2; const cols = ser.length > 6 ? 2 : 1; return (
          <div className={"fcb-tip cols" + cols} style={{ left: (cx / W * 100) + "%", transform: "translateX(" + tx + ")" }}>
            <div className="fcb-tip-yr">{years[chartHov]}</div>
            <div className="fcb-tip-rows">{ser.map((s) => { const v = s.real[chartHov]; return <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{v == null || !isFinite(v) ? "—" : v.toFixed(1) + unit(s)}</span></div>; })}</div>
          </div>
        ); })()}
      </div>
    );
  };
  // 영역 묶음차트: 단위 같으면 묶음 막대, 섞이면 지표별 미니 막대
  const catKeysOf = (cat: string) => fin.indicators.filter((m) => m.cat === cat).map((m) => m.key).filter((k) => indSeries(k).length >= 2);
  const sectionChart = (keys: string[], capColor: string, capText: string) => {
    if (!keys || keys.length < 1) return null;
    const valid = keys.filter((k) => indSeries(k).length >= 2);
    if (!valid.length) return null;
    const sameUnit = new Set(valid.map((k) => ((fin.indicators.find((m) => m.key === k) || ({} as Partial<Indicator>)).fmt === "x" ? "x" : "pct"))).size <= 1;
    const baseYr = (fin.is && fin.is[0]) ? fin.is[0].y : "";
    return (
      <div className="ind-tbl-chart ind-sec-chart">
        <div className="ind-tbl-chart-cap"><Lic name="trending-up" size={13} cls="icon-sm" color={capColor} />{capText}{!sameUnit && <span className="ind-tbl-chart-sub">{ko ? `지수 ${baseYr}=100 · 호버 시 실제값` : `index ${baseYr}=100 · hover = actual`}</span>}</div>
        <div className="fin-legend ind-tbl-legend">{valid.map((k, si) => <span className="fin-leg" key={k}><span className="fin-leg-sw" style={{ background: PALETTE[si % PALETTE.length] }} />{(DICT[k] || [k])[0]}</span>)}</div>
        {renderIndBars(valid, { index: !sameUnit })}
      </div>
    );
  };
  // ---- 표 뷰: 재무제표식 연도 컬럼 테이블 (지표 × 연도 + YoY), 등급은 셀 틴트 ----
  const tableView = () => {
    const years = fin.is.map((r) => r.y);
    const lastI = years.length - 1;
    const FW = new Set(fwKeys);
    const META: Record<string, { ic: string; c: string }> = { value: { ic: "gauge", c: "var(--accent)" }, profit: { ic: "trending-up", c: "var(--pos)" }, growth: { ic: "activity", c: "#BB6BD9" }, stability: { ic: "layers", c: "#4C8DFF" }, dividend: { ic: "banknote", c: "#E0A93E" } };
    const tintFor = (tn: string) => tn === "good" ? "var(--pos)" : tn === "bad" ? "var(--neg)" : null;
    const groups = indCat === "focus" ? [{ cat: "_focus", label: (fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 지표` : `${fwObj.name.en} key metrics`) : (ko ? "핵심 지표" : "Key metrics")), items: fwKeys.map((k) => fin.indicators.find((m) => m.key === k)).filter(Boolean) as Indicator[] }] : grouped.filter((g) => indCat === "all" || g.cat === indCat);
    return (
      <div className="ind-table-wrap">
        {(() => {
          if (indCat === "all") return null;
          if (indCat === "focus") return null;
          const lab = (CATS.find((c) => c[0] === indCat) || ["", ""])[1];
          return sectionChart(catKeysOf(indCat), "var(--accent)", lab + (ko ? " 추세" : " trend"));
        })()}
        <table className="fin-table ind-fintbl">
          <thead><tr><th>{ko ? "단위: 지표별 (배·%)" : "Unit: per metric"}</th>{years.map((y) => <th key={y}>{y}</th>)}<th>YoY</th></tr></thead>
          <tbody>
            {groups.map(({ cat, label, items }) => { const meta = cat === "_focus" ? { ic: "star", c: fwColor } : (META[cat] || { ic: "activity", c: "var(--accent)" }); return (
              <Fragment key={cat}>
                <tr className="fin-section" style={{ "--secc": meta.c } as CSSProperties}><td colSpan={years.length + 2}><span className="fin-sec-inner fin-term"><Lic name={meta.ic} size={14} cls="icon-sm" color={meta.c} /><span>{label}</span><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: meta.c }}>{label}</b><span className="fin-tip-def">{CAT_DESC[cat] || ""}</span></span></span></td></tr>
                {items.map((m) => { const d = DICT[m.key] || [m.key, ""]; const isFw = FW.has(m.key); const isPct = m.fmt !== "x"; const lv = indMetricAt(m.key, lastI), pv = indMetricAt(m.key, lastI - 1); let yoy = "—"; if (lv != null && isFinite(lv) && pv != null && isFinite(pv)) { const dd = lv - pv; yoy = (dd >= 0 ? "+" : "") + dd.toFixed(1) + (isPct ? "%p" : (ko ? "배" : "×")); } return (
                  <tr key={m.key} className={isFw ? "fin-bold fin-hilite" : ""} style={isFw ? { "--fw-c": fwColor } as CSSProperties : undefined}>
                    <td className="fin-rowlab"><span className="fin-term">{d[0]}<span className="ind-q">?</span>{tip(m, d)}</span>{isFw && fwObj.name && <span className="fin-fwtag fin-term" style={{ color: fwColor }}><span className="fin-fwtag-dot" style={{ background: fwColor }} />{fwObj.name[lang]}<span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{ko ? `${fwObj.name.ko} 프레임워크가 이 지표를 핵심으로 봅니다.` : `Key metric for the ${fwObj.name.en} framework.`}</span></span></span>}</td>
                    {years.map((y, ci) => { const v = indMetricAt(m.key, ci); const tnt = (v != null && isFinite(v)) ? tintFor(gradeOf(m.key, v)) : null; return <td key={ci} className="mono" style={{ color: tnt || undefined, fontWeight: ci === lastI ? 600 : undefined }}>{fmt({ v, fmt: m.fmt })}</td>; })}
                    <td className="mono" style={{ color: "var(--fg-3)" }}>{yoy}</td>
                  </tr>
                ); })}
              </Fragment>
            ); })}
          </tbody>
        </table>
      </div>
    );
  };
  // ---- 차트 뷰: 다지표 동시 비교 빌더 (프레임워크 핵심 지표 기본 선택) ----
  const chartView = () => {
    const fallbackKeys = fwKeys.length ? fwKeys : [(fin.indicators[0] || ({} as Partial<Indicator>)).key].filter(Boolean) as string[];
    const catDefault = indCat !== "all" ? catKeysOf(indCat) : fallbackKeys;
    const sel = (chartSel && chartSel.length) ? chartSel : (catDefault.length ? catDefault : fallbackKeys);
    const single = sel.length === 1;
    const toggle = (k: string) => setChartSel((prev) => { const cur = prev && prev.length ? prev : sel; return cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]; });
    const units = new Set(sel.map((k) => (fin.indicators.find((m) => m.key === k) || ({} as Partial<Indicator>)).fmt === "x" ? "x" : "pct"));
    const indexed = chartBasis === "index" || units.size > 1;
    return (
      <div className="ind-chart-card">
        <div className="fcb-bar">
          <span className="fcb-lab">{ko ? "지표" : "Metrics"}</span>
          {fin.indicators.map((it) => { const on = sel.includes(it.key); const col = PALETTE[sel.indexOf(it.key) % PALETTE.length]; const dd = DICT[it.key] || [it.key, ""]; const gcol = it.tone === "good" ? "var(--pos)" : it.tone === "bad" ? "var(--neg)" : it.tone === "mid" ? "var(--r-base)" : "var(--fg-4)"; return (
            <span key={it.key} className={"fcb-chip" + (on ? " on" : "")} onClick={() => toggle(it.key)} style={on ? { borderColor: col, color: col } : undefined}><span className="fcb-dot" style={{ background: on ? col : gcol }} />{dd[0]}</span>
          ); })}
          <span className="fcb-spacer" />
          {!single && <Fragment><span className="fcb-lab">{ko ? "기준" : "Basis"}</span>
          <div className="seg-toggle">
            <div className={"st" + (indexed ? " active" : "")} onClick={() => setChartBasis("index")}>{ko ? "지수" : "Index"}</div>
            <div className={"st" + (!indexed ? " active" : "")} onClick={() => units.size <= 1 && setChartBasis("real")} style={units.size > 1 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}>{ko ? "실제값" : "Real"}</div>
          </div></Fragment>}
        </div>
        {single && (() => { const m = fin.indicators.find((x) => x.key === sel[0]) || ({} as Partial<Indicator>); const d = DICT[sel[0]] || [sel[0], ""]; return (
          <div className="ind-chart-single">
            <div className="ind-chart-head"><span className="ind-chart-name">{d[0]}</span><span className="ind-chart-cur">{fmt(m as Indicator)}</span><span className={"ind-grade ind-" + (m.tone || "neutral")}><span className="ind-dot" />{GLAB[m.tone || "neutral"]}</span></div>
            <div className="ind-chart-def">{d[1]}{dirTxt(m as Indicator)}</div>
          </div>
        ); })()}
        {sel.length ? renderIndChart(sel, {}) : <div className="empty-tab">{ko ? "지표를 1개 이상 선택하세요" : "Pick at least one"}</div>}
        <div className="ind-chart-foot">
          {single ? <Fragment><span className="ind-chart-unit">{ko ? "단위" : "Unit"}: {(fin.indicators.find((x) => x.key === sel[0]) || ({} as Partial<Indicator>)).fmt === "x" ? (ko ? "배" : "×") : "%"}</span>{FORMULA[sel[0]] && <span className="ind-chart-formula">{FORMULA[sel[0]]}</span>}</Fragment>
            : <span className="ind-chart-unit">{indexed ? (ko ? "지수 = 각 지표의 첫 해를 100으로 놓은 상대 추세 (단위 다른 지표 비교용)" : "Index — each metric rebased to 100 at its first year") + (sel.length > 3 ? (ko ? " · 범위를 크게 벗어난 값은 위/아래 끝에 빈 점으로 표시" : " · out-of-range points pinned to edges") : "") : (ko ? "실제값 (동일 단위)" : "Real values")}</span>}
        </div>
      </div>
    );
  };
  // scope×mode 격자 (재무제표 탭과 동일): 카테고리 seg(전체+분류) + 렌즈 드롭다운(관점=직교축, seg에 없음) + 모드토글. 렌즈가 전체 scope에서 핵심지표 헤더(keyCards) 구동.
  const lensDropdown = (
    <Fragment>
      <LensPicker value={fwObj && fwObj.id ? fwObj.id : "none"} onPick={(v) => setFwSel(v ?? null)} lang={lang} width={200} />
      {fwObj.name && <span className="fin-term" style={{ marginLeft: 6 }}><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{fwObj.desc ? fwObj.desc[lang] : ""}</span><span className="fin-tip-def" style={{ color: "var(--fg-2)" }}>{(fwObj.model ? ({ PER: ko ? "이익의 크기와 질이 평가 근거라 수익성 지표를 봅니다." : "", DCF: ko ? "미래 현금흐름이 핵심이라 성장·현금 지표를 봅니다." : "", PBR: ko ? "순자산 대비 가치가 기준이라 자본효율 지표를 봅니다." : "", DDM: ko ? "배당 지속성이 핵심이라 배당·현금 지표를 봅니다." : "", EV: ko ? "자본구조 중립 평가라 마진·부채 지표를 봅니다." : "", PSR: ko ? "고성장 단계라 성장·마진 지표를 봅니다." : "" }[fwObj.model]) : "") || ""}</span><span className="fin-tip-f" style={{ color: fwColor }}>{ko ? "핵심 지표" : "Key metrics"}: {((fwObj.gradeFocus || []) as string[]).join(" · ")}</span></span></span>}
    </Fragment>
  );
  return (
    <div className="ind-wrap">
      <div className="fin-subbar ind-subbar">
        <div className="seg-toggle fin-subtabs ind-catseg">
          {([["all", ko ? "전체" : "All"]] as [string, string][]).concat(CATS.filter(([c]) => fin.indicators.some((m) => m.cat === c))).map(([k, lab]) => <div key={k} className={"st" + (indCat === k ? " active" : "")} onClick={() => setIndCat(k)}>{({ value: ko ? "밸류" : "Value", profit: ko ? "수익" : "Profit", growth: ko ? "성장" : "Growth", stability: ko ? "안정" : "Stable", dividend: ko ? "배당" : "Div" } as Record<string, string>)[k] || lab}</div>)}
        </div>
        {lensDropdown}
        <span className="fcb-spacer" />
        <div className="seg-toggle modes">
          {([["card", "layout-grid", ko ? "카드" : "Cards"], ["gauge", "gauge", ko ? "게이지" : "Gauge"], ["heat", "grid-3x3", ko ? "히트맵" : "Heatmap"], ["table", "table", ko ? "표" : "Table"], ["chart", "trending-up", ko ? "차트" : "Chart"]] as [string, string, string][]).map(([k, ic, lab]) => <div key={k} className={"st mode-st" + (imode === k ? " active" : "")} onClick={() => setImode(k)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="currentColor" />{imode === k && <span>{lab}</span>}</div>)}
        </div>
        {(imode === "card" || imode === "gauge") && <span className={"ind-trend-ico" + (trend ? " on" : "")} onClick={() => setTrend((v) => !v)} title={ko ? "추세선 표시" : "Trend"}><Lic name="activity" size={15} cls="icon-sm" color="currentColor" /></span>}
      </div>
      {indCat === "all" ? keyCards() : lensStrip()}
      {imode === "table" ? tableView()
        : imode === "chart" ? chartView()
        : <Fragment>
            {CATS.map(([cat, label]) => {
              if (indCat !== "all" && cat !== indCat) return null;
              const items = fin.indicators.filter((m) => m.cat === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="ind-group">
                  <div className="ind-cat">{catLabel(cat, label)}</div>
                  {renderItems(items, cat)}
                </div>
              );
            })}
          </Fragment>}
    </div>
  );
}
