// source/valuation_view.jsx ValuationView(117~530) + 서브컴포넌트(ValField/ValMetric/ValPresetPick/
// ValSlotPick/ValUnitPick/ValFair/ValDistribution/ValAnchors/ValSensitivity) 이식.
// 밸류에이션 탭 — 순수 클라이언트 "what-if" 적정가 계산기. 재무 입력 필드 · 표시단위 변환(cap/fin) ·
// 방법 슬롯(seedSlots) · 역산 계산기 · 목표주가 골시크 · 적정가 카드/분포/앵커/민감도/판정 +
// 멀티플 밴드 차트 2종(MultipleBandChart/ValFairBandChart, source valuation_view.jsx 355~370과 동일 위치).
// 입력은 ephemeral(plan 바뀌면 reseed), DB 미영속. 유일한 mutation = "시나리오에 적용"(onApplyTargets).
// 모든 계산은 @keystone/core/valuation (재정의 금지). 계산기 데이터는 plan 만 사용 —
// seedFinancials 가 plan.cur/sharesOut/eps 에서 합성 재무모델을 파생. i18n 은 t 프롭(val_* 키 core I18N).
// 밴드차트 2종은 props fin(재무제표) + planWithHist(mock priceHistory 이음새, lib/fin-history)로 렌더 —
// fin.is.length >= 2 게이팅(원본 plan.fin && plan.fin.is.length >= 2 와 동치). 마일스톤 6에서 실 히스토리로 교체.
// 옛 typeof STRATEGIES 가드 제거 → 직접 import.
// ⚠ SWC 파서: JSX 안 제네릭 캐스트(as Record<>/Partial<> 등) 금지 — 모두 본문 const 로 hoist.
"use client";
import { Fragment, useEffect, useState } from "react";
import type { Fin, I18nDict, Indicator, Lang, ValuationInput } from "@keystone/core/types";
import { seedFinancials, calcValuation, seedSlots } from "@keystone/core/valuation";
import { STRATEGIES } from "@keystone/core/reference";
import { fmtMoney, toDispCur, sharesDisp } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";
import { finPriceHistory } from "@/lib/fin-history";

/* STRATEGIES 항목 + 프로토타입이 옵션으로 참조하는 marketTh 슬롯(현 스키마엔 없음) — 밴드 model 파생용. */
type Framework = (typeof STRATEGIES)[number] & { marketTh?: Record<string, Record<string, unknown>> };

/* 슬롯/역산 항목 — 방법(m)은 core BandKind + divy/cap 확장, cap 은 단위 인덱스 u 를 가진다. */
type Slot = { m: string; v: number; u?: number };
/* 표시 단위 정의 (cap: 소↔대 페어, fin: 표시 배율) */
type CapUnit = { suf: string; base: number };
type FinUnit = { suf: string; scale: number };
/* 방법 레지스트리 항목 */
type MDefEntry = { lab: string; short: string; suf: string; fair: (v: number) => number };
/* 티어(하단/기준/상단) 라벨 */
type Tier = { lab: string; c: string };

function ValField({ label, value, onChange, suffix, readOnly }: {
  label: React.ReactNode; value: number; onChange?: (v: number) => void;
  suffix?: React.ReactNode; readOnly?: boolean;
}) {
  return (
    <label className="val-field">
      <span className="val-field-lab">{label}</span>
      <span className={"val-field-in" + (readOnly ? " ro" : "")}>
        <input type="number" value={value} onChange={readOnly ? undefined : ((e) => onChange && onChange(Number(e.target.value) || 0))} readOnly={readOnly} className="mono" />
        {suffix != null && <span className="val-field-suf">{suffix}</span>}
      </span>
    </label>
  );
}

function ValMetric({ lab, cur, fwd, tone, suffix, tip, delta }: {
  lab: React.ReactNode; cur: string; fwd: string; tone?: string; suffix?: string;
  tip?: { expl?: string; formula?: string } | null; delta?: number | null;
}) {
  const [hv, setHv] = useState(false);
  const showD = delta != null && isFinite(delta) && Math.abs(delta) >= 0.5;
  return (
    <div className="val-metric" onMouseEnter={() => tip && setHv(true)} onMouseLeave={() => setHv(false)}>
      {hv && tip && <span className="val-card-tip val-mtip"><b>{lab}</b>{tip.expl ? <span className="fin-tip-def">{tip.expl}</span> : null}{tip.formula ? <span className="fin-tip-f">{tip.formula}</span> : null}<span className="fin-tip-eg">{cur + " → " + fwd + (suffix || "") + (showD ? " (" + (delta! >= 0 ? "+" : "") + delta!.toFixed(0) + "%)" : "")}</span></span>}
      <span className="val-metric-lab">{lab}</span>
      <span className="val-metric-vals">
        <span className="val-metric-cur mono">{cur}</span>
        <Lic name="arrow-right" size={11} cls="icon-sm" color="var(--fg-4)" />
        <span className={"val-metric-fwd mono" + (tone ? " " + tone : "")}>{fwd}{suffix || ""}</span>
        {showD && <span className={"val-metric-delta " + (tone || "flat")}>{(delta! >= 0 ? "▲" : "▼") + Math.abs(delta!).toFixed(0) + "%"}</span>}
      </span>
    </div>
  );
}

/* preset pill (top-right): just initial slot configs */
function ValPresetPick({ label, onPick, t }: { label: string; onPick: (k: string) => void; t: I18nDict }) {
  const [open, setOpen] = useState(false);
  const items: [string, string][] = [["per", t.val_mode_per], ["pbr", t.val_mode_pbr], ["psr", t.val_mode_psr], ["ev", t.val_mode_ev], ["fcf", t.val_mode_fcf], ["por", t.val_mode_por]];
  return (
    <span className="val-mode-wrap">
      <span className="val-mode-pick" onClick={() => setOpen((o) => !o)}>{label}<Lic name="chevron-down" size={12} cls="icon-sm" color="var(--fg-4)" /></span>
      {open && <>
        <div className="val-mode-scrim" onClick={() => setOpen(false)}></div>
        <div className="v-menu val-mode-menu">
          {items.map(([k, lab]) => (
            <div key={k} className="v-menu-item" onClick={() => { setOpen(false); onPick(k); }}>{lab}</div>
          ))}
          <div className="val-mode-hint">{t.val_presetHint}</div>
        </div>
      </>}
    </span>
  );
}

/* per-slot method dropdown: grouped, described, shows this stock's current multiple */
type SlotMeta = { name: string; desc: string; cur: string | null; grp: string };
function ValSlotPick({ m, mDef, onPick, meta, groups }: {
  m: string; mDef: Record<string, MDefEntry>; onPick: (k: string) => void;
  meta?: Record<string, SlotMeta>; groups?: { mult: string; single: string };
}) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(mDef);
  const mult = meta ? keys.filter((k) => meta[k] && meta[k].grp === "mult") : keys;
  const single = meta ? keys.filter((k) => meta[k] && meta[k].grp === "single") : [];
  const item = (k: string) => (
    <div key={k} className={"val-slot-item" + (k === m ? " on" : "")} onClick={() => { setOpen(false); if (k !== m) onPick(k); }}>
      <span className="val-slot-item-main">
        <span className="val-slot-item-name">{meta ? meta[k].name : mDef[k].lab}</span>
        {meta && meta[k].desc && <span className="val-slot-item-desc">{meta[k].desc}</span>}
      </span>
      {meta && meta[k].cur && <span className="val-slot-item-cur">{meta[k].cur}</span>}
      <span className="val-slot-item-chk">{k === m && <Lic name="check" size={13} cls="icon-sm" color="var(--accent)" />}</span>
    </div>
  );
  return (
    <span className="val-mode-wrap">
      <span className="val-slot-pick" onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}>{mDef[m].lab}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>
      {open && <>
        <div className="val-mode-scrim" onClick={() => setOpen(false)}></div>
        <div className="v-menu val-mode-menu left val-slot-menu">
          {meta && groups && <div className="val-slot-grp">{groups.mult}</div>}
          {mult.map(item)}
          {single.length > 0 && <><div className="menu-sep" />{groups && <div className="val-slot-grp">{groups.single}</div>}{single.map(item)}</>}
        </div>
      </>}
    </span>
  );
}

/* market-cap units as a SMALL→LARGE pair (억/조, B/T, $B/$T). Switching units CONVERTS the value. */
function capUnits(cur: string, lang: Lang): CapUnit[] {
  if (cur === "USD") return [{ suf: "$B", base: 1e9 }, { suf: "$T", base: 1e12 }];
  return lang === "ko"
    ? [{ suf: "억", base: 1e8 }, { suf: "조", base: 1e12 }, { suf: "경", base: 1e16 }]
    : [{ suf: "B", base: 1e9 }, { suf: "T", base: 1e12 }];
}
/* financials display units. Stored values stay in calc base; a larger unit only rescales DISPLAY. */
function finUnits(cur: string): FinUnit[] {
  if (cur === "USD") return [{ suf: "$M", scale: 1 }, { suf: "$B", scale: 1e3 }];
  return [{ suf: "억원", scale: 1 }, { suf: "조원", scale: 1e4 }];
}
const capRound = (v: number) => v >= 10 ? Math.round(v) : Math.max(0.1, Math.round(v * 10) / 10);

/* inline unit segment — both options shown, click to switch. onPick(newIdx) — caller converts. */
function ValUnitPick({ units, idx, onPick }: {
  units: { suf: string }[]; idx: number; onPick: (i: number) => void;
}) {
  return (
    <span className="val-unit-seg">
      {units.map((u, i) => (
        <button type="button" key={i} className={"val-unit-seg-btn" + (i === idx ? " on" : "")} onClick={(e) => { e.preventDefault(); if (i !== idx) onPick(i); }}>{u.suf}</button>
      ))}
    </span>
  );
}

export function ValuationTab({ plan, fin, t, lang, onApplyTargets }: {
  plan: UIPlan; fin: Fin | null; t: I18nDict; lang: Lang;
  onApplyTargets?: (targets: { bull: number; base: number; bear: number }) => void;
}) {
  const dispCur = toDispCur(1, plan.cur).cur;
  const fxRate = toDispCur(1, plan.cur).v;          // display units per 1 native unit
  const isUs = dispCur === "USD";
  const cap = plan.currentPrice * plan.sharesOut * 1e6;   // native
  const capDisp = cap * fxRate;                     // display currency
  const capList = capUnits(dispCur, lang);
  const capDefIdx = capDisp >= 1e12 ? 1 : 0;
  const capU = capList[capDefIdx];
  const capDef = capRound(capDisp / capU.base);
  const [inp, setInp] = useState<ValuationInput>(() => seedFinancials(plan));
  const [applied, setApplied] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  // plan 전략 model → 초기 슬롯 방법. 옛 typeof 가드 제거(STRATEGIES 직접 import).
  const MODEL_KIND: Record<string, string> = { PER: "per", PBR: "pbr", PSR: "psr", DDM: "per", EV: "ev", DCF: "fcf" };
  const fwKind = (() => { const m = (STRATEGIES.find((s) => s.id === plan.strategyId) || {}).model; return MODEL_KIND[m || ""] || "per"; })();
  const [slots, setSlots] = useState<Slot[]>(() => seedSlots(plan, fwKind));
  // reverse calculators: same slot pattern — method dropdown → implied price
  const [revs, setRevs] = useState<Slot[]>(() => [{ m: "per", v: 12 }, { m: "cap", v: capDef, u: capDefIdx }]);
  const [goalPx, setGoalPx] = useState(() => { const r0 = plan.cur === "USD" ? 5 : 1000; return Math.max(r0, Math.round(plan.currentPrice * 1.3 / r0) * r0); });
  const [gsPath, setGsPath] = useState("earn"); // earn = fundamentals path, mult = re-rate path
  // financials display unit (CONVERT-only) — default to 조원/$B when the seed is large
  const finList = finUnits(plan.cur);
  const [finU, setFinU] = useState(() => seedFinancials(plan).revenue >= 1e4 ? 1 : 0);
  useEffect(() => {
    const sf = seedFinancials(plan);
    setInp(sf); setSlots(seedSlots(plan, fwKind));
    setRevs([{ m: "per", v: 12 }, { m: "cap", v: capDef, u: capDefIdx }]);
    const r0 = plan.cur === "USD" ? 5 : 1000;
    setGoalPx(Math.max(r0, Math.round(plan.currentPrice * 1.3 / r0) * r0));
    setFinU(sf.revenue >= 1e4 ? 1 : 0); setApplied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, lang]);

  const set = (k: string, v: number) => { setInp((p) => ({ ...p, [k]: v })); setApplied(false); };
  const fScale = finList[finU].scale;
  const finShow = (v: number) => finU === 0 ? Math.round(v) : Math.round(v / fScale * 10) / 10;
  const finParse = (tv: number) => tv * fScale;
  const r = calcValuation(plan, inp);
  const money = (v: number) => fmtMoney(plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v), plan.cur);
  const capLabel = (capDisp / capU.base).toFixed(1) + capU.suf;
  const fmtX = (v: number) => v > 0 ? v.toFixed(1) + "×" : "—";
  const fmtPct1 = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  const fmtRatio = (v: number) => v.toFixed(1) + "%";
  const up2 = (v: number) => plan.currentPrice > 0 ? (v / plan.currentPrice - 1) * 100 : 0;

  // method registry: label, short card label, unit suffix, fair-value math (forward basis)
  const mDef: Record<string, MDefEntry> = {
    per: { lab: t.val_tPer, short: "PER", suf: "×", fair: (v) => r.fEps * v },
    pbr: { lab: t.val_tPbr, short: "PBR", suf: "×", fair: (v) => r.fBps * v },
    psr: { lab: t.val_tPsr, short: "PSR", suf: "×", fair: (v) => r.fSps * v },
    ev: { lab: t.val_tEv, short: "EV/EBITDA", suf: "×", fair: (v) => Math.max(0, r.fEbitdaPs * v - r.netDebtPs) },
    fcf: { lab: t.val_tFcf, short: "EV/FCF", suf: "×", fair: (v) => Math.max(0, r.fFcfPs * v - r.netDebtPs) },
    por: { lab: t.val_tPor, short: "POR", suf: "×", fair: (v) => r.fOps * v },
    divy: { lab: t.val_tDivy, short: lang === "ko" ? "배당" : "Yield", suf: "%", fair: (v) => v > 0 ? r.fDps / (v / 100) : 0 },
    cap: { lab: lang === "ko" ? "목표 시총" : "Target cap", short: lang === "ko" ? "시총" : "Cap", suf: capU.suf, fair: (v) => plan.sharesOut > 0 ? (v * capU.base) / (plan.sharesOut * 1e6) : 0 },
  };
  // cap slots carry their own unit index `u`; fair/suffix resolve through it.
  const capBaseOf = (s: Slot) => capList[(s.u != null ? s.u : capDefIdx)].base;
  const sFair = (s: Slot) => s.m === "cap" ? (plan.sharesOut > 0 ? ((s.v * capBaseOf(s)) / fxRate) / (plan.sharesOut * 1e6) : 0) : mDef[s.m].fair(s.v);
  const sSuf = (s: Slot): string => s.m === "cap" ? capList[(s.u != null ? s.u : capDefIdx)].suf : mDef[s.m].suf;
  const pickU = (_list: Slot[], setList: React.Dispatch<React.SetStateAction<Slot[]>>, i: number, newIdx: number) => {
    setList((arr) => arr.map((sl, j) => {
      if (j !== i || sl.m !== "cap") return sl;
      const oldBase = capList[sl.u != null ? sl.u : capDefIdx].base;
      return { ...sl, u: newIdx, v: capRound(sl.v * oldBase / capList[newIdx].base) };
    }));
    setApplied(false);
  };
  const sufNode = (s: Slot, onPickU: (ni: number) => void): React.ReactNode => s.m === "cap"
    ? <ValUnitPick units={capList} idx={s.u != null ? s.u : capDefIdx} onPick={onPickU} />
    : mDef[s.m].suf;
  const defSlotV = (m: string) => m === "per" ? 12 : m === "pbr" ? 1.2 : m === "psr" ? 1.5 : m === "ev" ? 8 : m === "fcf" ? 15 : m === "por" ? 10 : m === "divy" ? 3 : capDef;
  const setSlotV = (i: number, v: number) => { setSlots((s) => s.map((sl, j) => j === i ? { ...sl, v } : sl)); setApplied(false); };
  const preset = (k: string) => { setSlots(seedSlots(plan, k)); setApplied(false); };

  const slotMs = [...new Set(slots.map((s) => s.m))];
  const pillLab = slotMs.length === 1 && ["per", "pbr", "psr", "ev", "fcf", "por"].includes(slotMs[0]) ? t["val_mode_" + slotMs[0]] : t.val_mode_mix;

  const slotFairs = slots.map((s) => sFair(s)).filter((v) => v > 0);
  const mixAvg = slotFairs.length ? slotFairs.reduce((a, b) => a + b, 0) / slotFairs.length : 0;
  const canDirect = slotFairs.length === 3;
  const sortedFairs = slotFairs.slice().sort((a, b) => a - b);
  // 적용은 항상 슬롯 1:1 (하단→하단, 중간→기준, 상단→상단). 슬롯이 3개가 아닐 때만 max/avg/min 폴백.
  const targets = slotFairs.length ? (
    canDirect
      ? { bull: Math.round(sortedFairs[2]), base: Math.round(sortedFairs[1]), bear: Math.round(sortedFairs[0]) }
      : { bull: Math.round(Math.max(...slotFairs)), base: Math.round(mixAvg), bear: Math.round(Math.min(...slotFairs)) }
  ) : null;
  const apply = () => { if (targets && onApplyTargets) { onApplyTargets(targets); setApplied(true); } };
  const setRev = (i: number, next: Slot) => setRevs((rs) => rs.map((rv, j) => j === i ? next : rv));
  // 대표(종합) 적정주가 — 항상 세 적정가의 평균(참고용).
  const repFair = slotFairs.length ? Math.round(mixAvg) : 0;
  const discount = repFair > 0 ? up2(repFair) : 0;
  const verdict = discount > 15 ? "under" : discount < -15 ? "over" : "fair";
  const verdictTone = verdict === "under" ? "pos" : verdict === "over" ? "neg" : "warn";

  // 분포 막대 데이터
  const fmtMult = (v: number, suf: string) => suf !== "×" ? (v + suf) : ((Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + "×");
  const ko = lang === "ko";
  // 적정가 카드 호버 — 산식 (배수 × 주당값 [− 순부채/주] = 적정가)
  const baseOf: Record<string, [string, number]> = { per: [ko ? "예상 EPS" : "Fwd EPS", r.fEps], pbr: [ko ? "예상 BPS" : "Fwd BPS", r.fBps], psr: [ko ? "예상 주당매출" : "Fwd SPS", r.fSps], por: [ko ? "예상 주당영업이익" : "Fwd OPS", r.fOps], ev: [ko ? "예상 EBITDA/주" : "Fwd EBITDA/sh", r.fEbitdaPs], fcf: [ko ? "예상 FCF/주" : "Fwd FCF/sh", r.fFcfPs] };
  const slotTip = (s: Slot, f: number) => { const b = baseOf[s.m]; if (!b) return mDef[s.m].short + " " + fmtMult(s.v, sSuf(s)) + " → " + money(f); const evlike = s.m === "ev" || s.m === "fcf"; return mDef[s.m].short + " " + fmtMult(s.v, sSuf(s)) + " × " + b[0] + " " + money(b[1]) + (evlike ? (ko ? " − 순부채/주 " : " − net debt/sh ") + money(r.netDebtPs) : "") + " = " + money(f); };
  // 자동계산 지표 호버 — 한 줄 의미
  const MT: Record<string, string> = ko ? { eps: "주당순이익 = 순이익 ÷ 주식수", bps: "주당순자산 = 자기자본 ÷ 주식수", per: "주가수익비율 = 주가 ÷ EPS · 낮을수록 저평가", pbr: "주가순자산비율 = 주가 ÷ BPS · 1배 미만이면 장부가 이하", psr: "주가매출비율 = 주가 ÷ 주당매출", opm: "영업이익률 = 영업이익 ÷ 매출", npm: "순이익률 = 순이익 ÷ 매출", roe: "자기자본이익률 = 순이익 ÷ 자기자본", ev: "EV/EBITDA = (시총+순부채) ÷ EBITDA · 부채 포함 가치 배수", divy: "배당수익률 = 주당배당 ÷ 주가", pfcf: "P/FCF = 주가 ÷ 주당 잉여현금흐름 · 현금 기준 저평가 여부", payout: "배당성향 = 주당배당 ÷ EPS · 이익 중 배당으로 나가는 비중", peg: "PEG = PER ÷ 이익성장률 · 1 근처면 성장 대비 적정" } : { eps: "Net income ÷ shares", bps: "Equity ÷ shares", per: "Price ÷ EPS · lower = cheaper", pbr: "Price ÷ BPS · under 1× is below book", psr: "Price ÷ sales/sh", opm: "Operating income ÷ revenue", npm: "Net income ÷ revenue", roe: "Net income ÷ equity", ev: "(Cap+net debt) ÷ EBITDA", divy: "Dividend/sh ÷ price", pfcf: "Price ÷ FCF per share", payout: "Dividend ÷ EPS · share of profit paid out", peg: "PER ÷ growth · near 1 = fair for the growth" };
  const EXPL: Record<string, string> = ko ? {
    eps: "회사가 1주당 벌어들인 순이익이에요. 높을수록 좋아요.", bps: "1주에 해당하는 회사 순자산(자기자본)이에요.", per: "주가가 한 해 이익의 몇 배인지. 낮을수록 저평가예요.", pbr: "주가가 순자산의 몇 배인지. 1배 미만이면 장부가 이하예요.", psr: "주가가 매출의 몇 배인지. 이익이 적은 성장주에 유용해요.", opm: "매출에서 본업으로 남긴 영업이익 비율이에요.", npm: "매출에서 최종으로 남긴 순이익 비율이에요.", roe: "자기자본으로 한 해 얼마를 벌었는지. 높을수록 자본을 잘 굴려요.", ev: "부채까지 포함한 기업가치가 EBITDA의 몇 배인지예요.", divy: "지금 주가로 살 때 1년에 받는 배당 비율이에요.", pfcf: "주가가 주당 잉여현금흐름의 몇 배인지. 현금 기준 밸류예요.", peg: "PER을 이익성장률로 나눈 값. 1 근처면 성장 대비 적정해요."
  } : {
    eps: "Net income per share. Higher is better.", bps: "Net assets (equity) per share.", per: "Price vs annual earnings. Lower = cheaper.", pbr: "Price vs net assets. Under 1x is below book.", psr: "Price vs sales. Useful for low-profit growth names.", opm: "Operating profit as a share of revenue.", npm: "Net profit as a share of revenue.", roe: "Return on equity — how hard capital works.", ev: "Enterprise value (incl. debt) vs EBITDA.", divy: "Annual dividend as a percent of the current price.", pfcf: "Price vs free cash flow per share.", peg: "P/E divided by growth. Near 1 = fair for the growth."
  };
  const mtip = (k: string) => ({ expl: EXPL[k] || "", formula: MT[k] || "" });
  // 슬롯 메서드 드롭다운 메타 — 그룹 · 한 줄 산식 · 이 종목 현재 배수
  const fmtCurM = (v: number | null): string | null => (v != null && v > 0 && isFinite(v)) ? (ko ? "현 " : "") + (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + "×" : null;
  const porCur = r.cOps > 0 ? plan.currentPrice / r.cOps : null;
  const fcfCur = r.cFcfPs > 0 ? (plan.currentPrice + (r.netDebtPs || 0)) / r.cFcfPs : null;
  const slotMeta: Record<string, SlotMeta> = {
    per: { name: "PER", desc: ko ? "주가 ÷ EPS" : "Price ÷ EPS", cur: fmtCurM(r.cPer), grp: "mult" },
    pbr: { name: "PBR", desc: ko ? "주가 ÷ 순자산(BPS)" : "Price ÷ BPS", cur: fmtCurM(r.cPbr), grp: "mult" },
    psr: { name: "PSR", desc: ko ? "주가 ÷ 주당매출" : "Price ÷ sales/sh", cur: fmtCurM(r.cPsr), grp: "mult" },
    ev: { name: "EV/EBITDA", desc: ko ? "기업가치 ÷ EBITDA" : "EV ÷ EBITDA", cur: fmtCurM(r.cEvEbitda), grp: "mult" },
    fcf: { name: "EV/FCF", desc: ko ? "기업가치 ÷ FCF" : "EV ÷ FCF", cur: fmtCurM(fcfCur), grp: "mult" },
    por: { name: "POR", desc: ko ? "주가 ÷ 영업이익" : "Price ÷ op. income", cur: fmtCurM(porCur), grp: "mult" },
    divy: { name: ko ? "배당수익률" : "Div. yield", desc: ko ? "목표 수익률로 역산" : "solve from yield", cur: r.divYield > 0 ? (ko ? "현 " : "") + r.divYield.toFixed(1) + "%" : null, grp: "single" },
    cap: { name: ko ? "시가총액" : "Market cap", desc: ko ? "목표 시총으로 역산" : "solve from target cap", cur: null, grp: "single" },
  };
  const slotGroups = { mult: ko ? "밸류에이션 배수" : "Valuation multiples", single: ko ? "단일 목표 (역산)" : "Single target" };
  // 슬롯을 적정가 기준 정렬해 하단/기준/상단 티어 부여 (시나리오 bear/base/bull과 1:1)
  const slotTiers: Record<number, Tier> = (() => {
    const arr = slots.map((s, i) => ({ i, f: sFair(s) })).filter((x) => x.f > 0).sort((a, b) => a.f - b.f);
    const res: Record<number, Tier> = {};
    if (arr.length === 1) { res[arr[0].i] = { lab: ko ? "중간" : "Base", c: "var(--r-base)" }; }
    else { arr.forEach((x, rank) => { res[x.i] = rank === 0 ? { lab: ko ? "하단" : "Low", c: "var(--r-bear)" } : rank === arr.length - 1 ? { lab: ko ? "상단" : "High", c: "var(--r-bull)" } : { lab: ko ? "중간" : "Base", c: "var(--r-base)" }; }); }
    return res;
  })();
  const distPoints = slots.map((s) => ({ lab: mDef[s.m].short, sub: fmtMult(s.v, sSuf(s)), full: mDef[s.m].short + " " + fmtMult(s.v, sSuf(s)), v: sFair(s) })).filter((p) => p.v > 0);
  // 핵심 가정 앵커
  const anchorRows = [
    { lab: t.val_growth, val: (inp.growth >= 0 ? "+" : "") + inp.growth + "%", dot: "var(--accent)" },
    { lab: lang === "ko" ? "예상 EPS" : "Fwd EPS", val: money(r.fEps) },
  ]
    .concat(slots.some((s) => s.m === "ev") ? [{ lab: lang === "ko" ? "예상 EBITDA/주" : "Fwd EBITDA/sh", val: money(r.fEbitdaPs) }] : [])
    .concat(slots.some((s) => s.m === "fcf") ? [{ lab: lang === "ko" ? "예상 FCF/주" : "Fwd FCF/sh", val: money(r.fFcfPs) }] : [])
    .concat(slots.map((s) => ({ lab: mDef[s.m].short, val: fmtMult(s.v, sSuf(s)), dot: "var(--fg-3)" })));
  // 민감도 히트맵 — 성장률 × 첫 슬롯(비-시총/배당) 배수
  const primary = slots.find((s) => s.m !== "cap" && s.m !== "divy") || { m: "per", v: 12 };
  const _vm = slots.filter((s) => s.m !== "cap" && s.m !== "divy" && s.v > 0).map((s) => s.v).sort((a, b) => a - b);
  const baseMult = _vm.length ? _vm[Math.floor((_vm.length - 1) / 2)] : (primary.v || 12);
  const fairOf = (m: string, v: number, rr: ReturnType<typeof calcValuation>) => m === "per" ? rr.fEps * v : m === "pbr" ? rr.fBps * v : m === "psr" ? rr.fSps * v : m === "ev" ? Math.max(0, rr.fEbitdaPs * v - rr.netDebtPs) : m === "fcf" ? Math.max(0, rr.fFcfPs * v - rr.netDebtPs) : m === "por" ? rr.fOps * v : 0;
  const gSteps = [10, 5, 0, -5, -10].map((d) => Math.round((inp.growth + d) * 10) / 10);
  const mSteps = [0.6, 0.8, 1, 1.2, 1.4].map((k) => Math.round(baseMult * k * 100) / 100);
  const sensCells = gSteps.map((gv) => mSteps.map((mv) => { const rr = calcValuation(plan, { ...inp, growth: gv }); const f = fairOf(primary.m, mv, rr); return { up: up2(f), fair: f }; }));
  const sensBase = { r: 2, c: 2 };
  const primarySuf = primary.m === "divy" ? "%" : "×";

  const finRows: [string, string][] = [["revenue", t.val_revenue], ["op", t.val_op], ["net", t.val_net], ["equity", t.val_equity]];

  // 자동계산 지표 delta 헬퍼 — 원본은 JSX IIFE 안에서 정의했으나 본문으로 hoist.
  const dl = (a: number, b: number): number | null => (a && isFinite(a)) ? (b - a) / Math.abs(a) * 100 : null;
  const finSuf = isUs ? finList[finU].suf : finList[finU].suf.replace("원", "");

  // shares 표시값(readOnly) — sharesDisp 헬퍼(core/format)
  const shDisp = sharesDisp(plan.sharesOut, lang);

  // "예상 실적 × 현재 배수" 카드 — 원본 JSX IIFE(321~353)를 본문으로 hoist(제네릭 캐스트/복잡 계산 분리).
  const METHOD_HUE: Record<string, string> = { PER: "#6A93D6", PBR: "#4FA08A", PSR: "#C2933F", "EV/EBITDA": "#9281C2" };
  const impliedAll = [
    { k: "PER", m: r.cPer, fps: r.fEps, adj: 0, v: r.fEps * r.cPer,
      fpsLab: ko ? "예상 EPS(주당순이익)" : "Fwd EPS", full: ko ? "주가수익비율" : "Price / Earnings",
      desc: ko ? "예상 주당순이익에 현재 PER을 그대로 곱한 값. 이익이 예상대로 늘고 시장이 매기는 PER이 지금과 같다면 받게 되는 주가예요." : "Forward EPS × today's P/E." },
    { k: "PBR", m: r.cPbr, fps: r.fBps, adj: 0, v: r.fBps * r.cPbr,
      fpsLab: ko ? "예상 BPS(주당순자산)" : "Fwd BPS", full: ko ? "주가순자산비율" : "Price / Book",
      desc: ko ? "예상 주당순자산에 현재 PBR을 곱한 값. 보유 자산 가치를 기준으로 한 적정가예요." : "Forward BPS × today's P/B." },
    { k: "PSR", m: r.cPsr, fps: r.fSps, adj: 0, v: r.fSps * r.cPsr,
      fpsLab: ko ? "예상 SPS(주당매출)" : "Fwd SPS", full: ko ? "주가매출비율" : "Price / Sales",
      desc: ko ? "예상 주당매출에 현재 PSR을 곱한 값. 매출 기준이라 이익이 적은 성장주에도 쓸 수 있어요." : "Forward SPS × today's P/S." },
    { k: "EV/EBITDA", m: r.cEvEbitda, fps: r.fEbitdaPs, adj: r.netDebtPs, v: r.fEbitdaPs * r.cEvEbitda - r.netDebtPs,
      fpsLab: ko ? "예상 주당 EBITDA" : "Fwd EBITDA/sh", full: "EV / EBITDA",
      desc: ko ? "예상 주당 EBITDA에 현재 EV/EBITDA 배수를 곱해 기업가치를 구한 뒤, 주당 순부채를 빼 주주 몫만 남긴 값이에요. 부채까지 반영해 더 보수적입니다." : "Fwd EBITDA/sh × EV/EBITDA, minus net debt per share." },
  ];
  const ip = impliedAll.filter((it) => it.v > 0 && isFinite(it.v) && it.m > 0 && isFinite(it.m));
  const ivals = ip.map((it) => it.v);
  const vMin = ivals.length ? Math.min(...ivals) : 0;
  const vMax = ivals.length ? Math.max(...ivals) : 0;
  const vAvg = ivals.length ? ivals.reduce((a, b) => a + b, 0) / ivals.length : 0;
  const curPx = plan.currentPrice;

  // 목표 주가 → 필요조건(골시크). 원본 JSX IIFE(435~525)를 본문으로 hoist.
  const gp = goalPx > 0 ? goalPx : 0;
  const pxPrem = up2(gp);
  const gsEps = r.cEps, gsPer = r.cPer;
  const needEps = gsPer > 0 ? gp / gsPer : 0;
  const needPer = gsEps > 0 ? gp / gsEps : 0;
  const epsGrow = gsEps > 0 && needEps > 0 ? (needEps / gsEps - 1) * 100 : 0;
  const perGrow = gsPer > 0 && needPer > 0 ? (needPer / gsPer - 1) * 100 : 0;
  const perStretch = perGrow > 50;
  const pickCapU = (disp: number): CapUnit => { let u = capList[0]; for (const x of capList) if (disp >= x.base) u = x; return u; };
  const capFmt = (pxv: number) => { if (!(plan.sharesOut > 0)) return "—"; const d = pxv * plan.sharesOut * 1e6 * fxRate; const u = pickCapU(d); return (d / u.base).toFixed(1) + u.suf; };
  const absFmt = (nativeTotal: number) => { if (!(isFinite(nativeTotal) && nativeTotal > 0)) return "—"; const d = nativeTotal * fxRate; const u = pickCapU(d); return (d / u.base).toFixed(1) + u.suf; };
  const niNow = gsEps * (plan.sharesOut || 0) * 1e6, niNeed = needEps * (plan.sharesOut || 0) * 1e6;
  const netM = r.cNetM;
  const revNow = netM > 0 ? niNow / (netM / 100) : 0, revNeed = netM > 0 ? niNeed / (netM / 100) : 0;
  const pct0 = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(0) + "%";
  const opM = r.cOpM, opNow = revNow * (opM / 100), opNeed = revNeed * (opM / 100);
  const krwAbbr = (n: number) => { n = Math.abs(n); return n >= 1e12 ? (n / 1e12).toFixed(1) + "조원" : n >= 1e8 ? (n / 1e8).toFixed(1) + "억원" : n >= 1e4 ? (n / 1e4).toFixed(1) + "만원" : Math.round(n).toLocaleString("en-US") + "원"; };
  const gpv = isUs ? Math.round(gp * fxRate * 100) / 100 : Math.round(gp * fxRate);
  const gpComma = isUs ? "$" + gpv.toLocaleString("en-US", { maximumFractionDigits: 2 }) : gpv.toLocaleString("en-US") + "원";

  // mock priceHistory 이음새 — 밴드 차트가 읽는 plan.priceHistory 를 fin 연도축에 맞춰 합성해 붙인다.
  // (마일스톤 6에서 lib/fin-history 를 실 히스토리로 교체하면 자동 승계.)
  const planWithHist: UIPlan = { ...plan, priceHistory: plan.priceHistory ?? finPriceHistory(plan, fin) };
  // 역사적 멀티플 밴드 기본 배수 = plan 자체 프레임워크 model 기준.
  // 제네릭 캐스트(Record<>/Partial<>)를 JSX 안에서 쓰면 Next(SWC) 파서가 <string>을 JSX 태그로 오인 → 본문으로 hoist.
  const _bandModel = (STRATEGIES.find((s) => s.id === plan.strategyId) || ({} as Partial<Framework>)).model;
  const BAND_BY_MODEL: Record<string, string> = { PER: "PER", PBR: "PBR", PSR: "PSR", EV: "EV" };
  const fwBand = BAND_BY_MODEL[_bandModel || ""] || "PER";

  return (
    <div className="val-wrap">
      <div className="val-intro">{t.val_intro}</div>

      {/* basic */}
      <div className="val-sec">
        <div className="val-sec-cap"><span className="val-cap-title"><Lic name="info" size={14} cls="icon-sm" color="var(--accent)" />{t.val_basic}</span></div>
        <div className="val-row3">
          <ValField label={t.val_price} value={plan.currentPrice} suffix={plan.cur === "USD" ? "$" : "원"} readOnly />
          <ValField label={t.val_shares} value={shDisp.v} suffix={shDisp.suf} onChange={(v) => set("__sh", v)} readOnly />
          <div className="val-field"><span className="val-field-lab">{t.mktCap}</span><span className="val-field-static mono">{capLabel}</span></div>
        </div>
      </div>

      {/* financials */}
      <div className="val-sec">
        <div className="val-sec-cap"><span className="val-cap-title"><Lic name="table-2" size={14} cls="icon-sm" color="var(--accent)" />{t.val_currentFin}</span><ValUnitPick units={finList} idx={finU} onPick={setFinU} /></div>
        <div className="val-row5">
          {finRows.map(([k, lab]) => <ValField key={k} label={lab} value={finShow(inp[k as keyof ValuationInput])} onChange={(v) => set(k, finParse(v))} suffix={finSuf} />)}
          <ValField label={"DPS"} value={inp.dps} suffix={isUs ? "$" : "원"} onChange={(v) => set("dps", v)} />
        </div>
        <div className="val-growth">
          <span className="val-growth-key">{t.val_growth}</span>
          <label className="val-slider">
            <input type="range" min="-20" max="40" step="1" value={inp.growth} onChange={(e) => set("growth", Number(e.target.value))} style={{ background: `linear-gradient(90deg, var(--accent) ${((inp.growth + 20) / 60 * 100).toFixed(1)}%, var(--border-strong) ${((inp.growth + 20) / 60 * 100).toFixed(1)}%)` }} />
          </label>
          <b className="val-growth-val mono">{inp.growth >= 0 ? "+" : ""}{inp.growth}%</b>
          <span className="val-growth-note">{t.val_growthNote}</span>
        </div>
        <div className="val-adv">
          <button type="button" className={"val-adv-toggle" + (advOpen ? " open" : "")} onClick={() => setAdvOpen((o) => !o)}><Lic name="chevron-right" size={13} cls="icon-sm val-adv-chev" color="currentColor" />{lang === "ko" ? "고급 가정 (EV·DCF·배당주용)" : "Advanced (EV·DCF)"}</button>
          {advOpen && <div className="val-row5 val-adv-fields">
            <ValField label={"EBITDA"} value={finShow(inp.ebitda)} onChange={(v) => set("ebitda", finParse(v))} suffix={finSuf} />
            <ValField label={lang === "ko" ? "잉여현금흐름" : "FCF"} value={finShow(inp.fcf)} onChange={(v) => set("fcf", finParse(v))} suffix={finSuf} />
            <ValField label={lang === "ko" ? "순부채" : "Net debt"} value={finShow(inp.netDebt)} onChange={(v) => set("netDebt", finParse(v))} suffix={finSuf} />
          </div>}
        </div>
      </div>

      {/* computed metrics */}
      <div className="val-sec">
        <div className="val-sec-cap"><span className="val-cap-title"><Lic name="calculator" size={14} cls="icon-sm" color="var(--accent)" />{t.val_computed}</span> <span className="val-unit">{t.val_curFwd}</span></div>
        <div className="val-metrics">
          <ValMetric lab="EPS" cur={money(r.cEps)} fwd={money(r.fEps)} tone={r.fEps >= r.cEps ? "pos" : "neg"} delta={dl(r.cEps, r.fEps)} tip={mtip("eps")} />
          <ValMetric lab="BPS" cur={money(r.cBps)} fwd={money(r.fBps)} tone={r.fBps >= r.cBps ? "pos" : "neg"} delta={dl(r.cBps, r.fBps)} tip={mtip("bps")} />
          <ValMetric lab="PER" cur={fmtX(r.cPer)} fwd={fmtX(r.fPer)} tone={r.fPer <= r.cPer ? "pos" : "neg"} delta={dl(r.cPer, r.fPer)} tip={mtip("per")} />
          <ValMetric lab="PBR" cur={fmtX(r.cPbr)} fwd={fmtX(r.fPbr)} tone={r.fPbr <= r.cPbr ? "pos" : "neg"} delta={dl(r.cPbr, r.fPbr)} tip={mtip("pbr")} />
          <ValMetric lab="PSR" cur={fmtX(r.cPsr)} fwd={fmtX(r.fPsr)} tone={r.fPsr <= r.cPsr ? "pos" : "neg"} delta={dl(r.cPsr, r.fPsr)} tip={mtip("psr")} />
          <ValMetric lab={t.val_opMargin} cur={fmtRatio(r.cOpM)} fwd={fmtRatio(r.fOpM)} tone={r.fOpM >= r.cOpM ? "pos" : "neg"} delta={dl(r.cOpM, r.fOpM)} tip={mtip("opm")} />
          <ValMetric lab={t.val_netMargin} cur={fmtRatio(r.cNetM)} fwd={fmtRatio(r.fNetM)} tone={r.fNetM >= r.cNetM ? "pos" : "neg"} delta={dl(r.cNetM, r.fNetM)} tip={mtip("npm")} />
          <ValMetric lab="ROE" cur={fmtRatio(r.cRoe)} fwd={fmtRatio(r.fRoe)} tone={r.fRoe >= r.cRoe ? "pos" : "neg"} delta={dl(r.cRoe, r.fRoe)} tip={mtip("roe")} />
          <ValMetric lab="EV/EBITDA" cur={fmtX(r.cEvEbitda)} fwd={fmtX(r.fEvEbitda)} tone={r.fEvEbitda <= r.cEvEbitda ? "pos" : "neg"} delta={dl(r.cEvEbitda, r.fEvEbitda)} tip={mtip("ev")} />
          <ValMetric lab={t.val_divYield} cur={fmtRatio(r.divYield)} fwd={fmtRatio(r.fDivYield)} delta={dl(r.divYield, r.fDivYield)} tip={mtip("divy")} />
          <ValMetric lab="P/FCF" cur={r.cFcfPs > 0 ? fmtX(plan.currentPrice / r.cFcfPs) : "—"} fwd={r.fFcfPs > 0 ? fmtX(plan.currentPrice / r.fFcfPs) : "—"} tone={r.fFcfPs >= r.cFcfPs ? "pos" : "neg"} delta={r.cFcfPs > 0 && r.fFcfPs > 0 ? dl(plan.currentPrice / r.cFcfPs, plan.currentPrice / r.fFcfPs) : null} tip={mtip("pfcf")} />
          <ValMetric lab="PEG" cur={inp.growth > 0 ? (r.cPer / inp.growth).toFixed(2) : "—"} fwd={inp.growth > 0 ? (r.fPer / inp.growth).toFixed(2) : "—"} tone={r.fPer <= r.cPer ? "pos" : "neg"} delta={inp.growth > 0 ? dl(r.cPer / inp.growth, r.fPer / inp.growth) : null} tip={mtip("peg")} />
        </div>
        {ip.length > 0 && (
          <div className="val-implied">
            <div className="val-implied-cap"><Lic name="zap" size={13} cls="icon-sm" color="var(--accent)" />{ko ? "예상 실적 × 현재 배수" : "Forward fundamentals × today's multiple"}<span className="fin-term"><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? "예상 실적 × 현재 배수" : "Forward × today's multiple"}</b><span className="fin-tip-def">{ko ? "예상 실적(주당)에 지금의 배수를 그대로 곱한 값입니다. 배수가 안 변한다고 가정하고 실적 성장만 반영한 빠른 적정가예요. 각 카드에 마우스를 올리면 계산식을 볼 수 있어요. 배수를 직접 정하려면 아래 적정주가 섹션을 쓰세요. 강조된 카드는 이 전략이 주로 쓰는 지표예요." : "Forward per-share fundamentals × today's multiple. Holds the multiple fixed and reflects only earnings growth; hover each card for the formula. The highlighted card is this strategy's core metric."}</span></span></span><span className="val-implied-conv"><span className="val-implied-conv-lab">{ko ? "평균" : "avg"}</span><span className="val-implied-conv-avg mono">{money(Math.round(vAvg))}</span><span className="val-implied-conv-range mono">{money(vMin)}~{money(vMax)}</span><span className="ind-q">?</span><span className="fin-tip fin-tip-r"><b>{ko ? `종합 평균 ${money(Math.round(vAvg))}` : `Average ${money(Math.round(vAvg))}`}</b><span className="fin-tip-def">{ko ? `${ip.map((it) => it.k).join("·")} ${ip.length}개 방법으로 각각 구한 적정가를 단순 평균한 값이에요. 옆 범위(${money(vMin)}~${money(vMax)})는 그중 최저·최고치이고, 각 방법 결과가 서로 가까울수록(범위가 좁을수록) 적정가를 더 믿을 수 있어요.` : `Simple average of the ${ip.length} methods. The range (${money(vMin)}~${money(vMax)}) spans the lowest and highest — a tight spread means higher confidence.`}</span><span className="fin-tip-f">({ip.map((it) => money(it.v)).join(" + ")}) ÷ {ip.length} = {money(Math.round(vAvg))}</span></span></span></div>
            <div className="val-implied-row" style={{ gridTemplateColumns: "repeat(" + ip.length + ", minmax(0, 1fr))" }}>
              {ip.map((it) => { const up = curPx > 0 ? (it.v - curPx) / curPx * 100 : 0; const adjStr = it.adj ? (it.adj > 0 ? (ko ? ` − 순부채 ${money(it.adj)}` : ` − net debt ${money(it.adj)}`) : (ko ? ` + 순현금 ${money(-it.adj)}` : ` + net cash ${money(-it.adj)}`)) : ""; return (
                <div className="val-implied-cell" key={it.k}>
                  <span className="val-implied-lab"><span className="val-implied-dot" style={{ background: METHOD_HUE[it.k] || "var(--border-strong)" }} />{it.k}<span className="ind-q">?</span><span className="val-implied-mult mono">{it.m.toFixed(1)}×</span></span>
                  <span className="val-implied-val mono">{money(it.v)}</span>
                  <span className={"val-implied-up mono " + (up >= 0 ? "pos" : "neg")}>{ko ? "현재가 대비 " : ""}{up >= 0 ? "+" : ""}{up.toFixed(0)}%{ko ? "" : " vs current"}</span>
                  <span className="fin-tip">
                    <b>{it.k} {ko ? "기준 — " : "— "}{money(it.v)}</b>
                    <span className="fin-tip-def">{it.desc}</span>
                    <span className="fin-tip-f">{it.fpsLab} {money(it.fps)} × {it.m.toFixed(1)}×{adjStr} = {money(it.v)}</span>
                    <span className="fin-tip-eg">{ko ? `현재가 ${money(curPx)} 대비 ${up >= 0 ? "+" : ""}${up.toFixed(0)}%` : `vs current ${money(curPx)}: ${up >= 0 ? "+" : ""}${up.toFixed(0)}%`}</span>
                  </span>
                </div>
              ); })}
            </div>
          </div>
        )}
      </div>

      {/* 적정가 밴드 (여러 방법 · 시계열) — 위 "예상 실적 × 현재 배수" 카드의 시계열판 (source valuation_view.jsx 356~362) */}
      {fin && fin.is && fin.is.length >= 2 && (
        <div className="val-sec">
          <div className="val-sec-cap"><span className="val-cap-title"><Lic name="layers" size={14} cls="icon-sm" color="var(--accent)" />{ko ? "적정가 밴드 · 여러 방법" : "Fair-value band · by method"}<span className="fin-term" style={{ marginLeft: 2 }}><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? "여러 방법 적정가 밴드" : "Multi-method fair band"}</b><span className="fin-tip-def">{ko ? "PER·PBR·PSR·EV 각 방법이 매기는 적정가를 연도별로 겹쳐, 방법 간 최저~최고를 띠로·평균을 선으로 보여줍니다. 흰 선(시장가)이 띠 위면 대다수 방법 대비 비싼, 아래면 싼 편이에요. 한 방법의 과거 분포를 보는 아래 '역사적 멀티플 밴드'와 달리, 여기선 방법들이 서로 얼마나 갈리는지를 봅니다." : "Overlays the fair value each method (PER·PBR·PSR·EV) implies, over time — band spans lowest→highest across methods, the line is their average. Price above the band = pricey vs most methods; below = cheap. Unlike the historical multiple band below (one method's own range), this shows how methods disagree."}</span></span></span></span></div>
          <ValFairBandChart plan={planWithHist} fin={fin} lang={lang} />
        </div>
      )}

      {/* 역사적 멀티플 밴드 (source valuation_view.jsx 364~370) */}
      {fin && fin.is && fin.is.length >= 2 && (
        <div className="val-sec">
          <div className="val-sec-cap"><span className="val-cap-title"><Lic name="trending-up" size={14} cls="icon-sm" color="var(--accent)" />{ko ? "역사적 멀티플 밴드" : "Historical multiple band"}<span className="fin-term" style={{ marginLeft: 2 }}><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? "멀티플 밴드 보는 법" : "Reading the band"}</b><span className="fin-tip-def">{ko ? "현재 배수(PER 등)가 과거 5년 분포에서 어디쯤인지 보여줍니다. 백분위가 낮을수록(하위 %) 역사적으로 싼 편이에요." : "Where today's multiple sits in its 5-yr range. Lower percentile = historically cheaper."}</span></span></span></span></div>
          <MultipleBandChart plan={planWithHist} fin={fin} lang={lang} defaultBand={fwBand} />
        </div>
      )}

      {/* fair value — slot grid; preset pill only seeds */}
      <div className="val-sec">
        <div className="val-sec-cap val-cap-row">
          <span className="val-cap-title"><Lic name="target" size={14} cls="icon-sm" color="var(--accent)" />{t.val_fair}</span>
          <ValPresetPick label={pillLab} onPick={preset} t={t} />
        </div>
        <div className="val-slots">
          {slots.map((s, i) => (
            <div className="val-slot" key={i}>
              <ValField label={<span className="val-slot-lab">{slotTiers[i] && <span className="val-tier" style={{ color: slotTiers[i].c, background: `color-mix(in srgb, ${slotTiers[i].c} 16%, transparent)` }}>{slotTiers[i].lab}</span>}<span className="val-slot-metric">{mDef[s.m].lab}</span></span>} value={s.v} onChange={(v) => setSlotV(i, v)} suffix={sufNode(s, (ni) => pickU(slots, setSlots, i, ni))} />
            </div>
          ))}
        </div>
        {distPoints.length > 0 && <ValDistribution points={distPoints} avg={repFair} current={plan.currentPrice} money={money} lang={lang} />}
        <div className="val-fairs">
          {slots.map((s, i) => ({ s, i, f: sFair(s) })).sort((a, b) => (a.f > 0 ? a.f : Infinity) - (b.f > 0 ? b.f : Infinity)).map(({ s, i, f }) => <ValFair key={i} tier={slotTiers[i]} lab={mDef[s.m].short + " " + fmtMult(s.v, sSuf(s))} val={f > 0 ? money(f) : "—"} up={f > 0 ? up2(f) : 0} fmtPct={fmtPct1} off={!(f > 0)} tip={f > 0 ? slotTip(s, f) : null} />)}
          <ValFair tier={{ c: "var(--fg-3)", lab: ko ? "종합" : "Blend" }} lab={ko ? "3개 평균" : "3-way avg"} val={repFair > 0 ? money(repFair) : "—"} up={repFair > 0 ? up2(repFair) : 0} fmtPct={fmtPct1} highlight tip={repFair > 0 ? (ko ? "세 적정가(하단·중간·상단)의 평균 = " + money(repFair) + ". 참고용 종합값이며, 시나리오 적용은 항상 슬롯 1:1입니다." : "Average of the three fair values = " + money(repFair) + ". Reference only; scenario apply is always 1:1.") : null} />
        </div>
        <div className="val-verdict-row">
          <div className={"val-verdict " + verdictTone}>
            <span className="val-verdict-dot" />{t["val_v_" + verdict]}
            <span className="mono" style={{ marginLeft: 8 }}>{fmtPct1(discount)}</span>
          </div>
          {onApplyTargets && <div className="val-apply-wrap">
            <button className={"v-btn v-btn--primary val-apply" + (applied ? " done" : "")} onClick={apply} disabled={!targets}>
              <Lic name={applied ? "check" : "arrow-up-right"} size={14} cls="icon-sm" color="var(--fg-on-accent)" />
              {applied ? t.val_applied : t.val_apply}
            </button>
          </div>}
        </div>
        {onApplyTargets && targets && <div className="val-apply-note" title={t.val_applyTip}>{t.val_applyNote} · <span className="mono">{(lang === "ko" ? "상단 " : "Bull ") + money(targets.bull)}<em className="val-logic">{lang === "ko" ? "고배수" : "high"}</em> · {(lang === "ko" ? "기준 " : "Base ") + money(targets.base)}<em className="val-logic">{lang === "ko" ? "중간배수" : "mid"}</em> · {(lang === "ko" ? "하단 " : "Bear ") + money(targets.bear)}<em className="val-logic">{lang === "ko" ? "저배수" : "low"}</em></span></div>}
      </div>

      {/* 핵심 가정 앵커 + 민감도 히트맵 */}
      <div className="val-sec">
        <div className="val-sec-cap"><span className="val-cap-title"><Lic name="anchor" size={14} cls="icon-sm" color="var(--accent)" />{t.val_anchors}</span></div>
        <ValAnchors rows={anchorRows} />
        <div className="val-sec-cap val-sens-cap"><span className="val-cap-title"><Lic name="grid-3x3" size={14} cls="icon-sm" color="var(--accent)" />{t.val_sens}<span className="fin-term" style={{ marginLeft: 2 }}><span className="ind-q">?</span><span className="fin-tip"><b>{ko ? "민감도 보는 법" : "Reading the heatmap"}</b><span className="fin-tip-def">{ko ? "행 = 성장률 가정, 열 = 목표 배수. 각 칸은 그 조합에서 현재가 대비 상승여력이에요. 초록일수록 상승(저평가), 빨강일수록 하락(고평가). 흰 테두리 칸이 지금 내 가정이고, 위·오른쪽으로 갈수록 낙관적이에요." : "Rows = growth assumption, columns = target multiple. Each cell is the upside vs. current price for that combo. Greener = upside (cheap), redder = downside (rich). The white-bordered cell is your current assumption; up & right is more optimistic."}</span><span className="fin-tip-f">{ko ? "한 칸만 옆으로 가도 색이 확 바뀌면 그 가정에 민감한 종목이에요." : "If color swings sharply from one cell, the value is sensitive to that assumption."}</span></span></span></span><span className="val-sens-hint">{t.val_sensHint}</span></div>
        <ValSensitivity gSteps={gSteps} mSteps={mSteps} cells={sensCells} base={sensBase} primaryShort={mDef[primary.m].short} mSuf={primarySuf} t={t} money={money} current={plan.currentPrice} ko={ko} />
        <div className="val-sens-legend">
          <span className="val-sens-leg"><span className="val-sens-leg-box base" />{ko ? "현재 가정" : "Current"}</span>
          <span className="val-sens-leg"><span className="val-sens-leg-box" style={{ background: "color-mix(in srgb, var(--pos) 45%, transparent)" }} />{ko ? "상승여력" : "Upside"}</span>
          <span className="val-sens-leg"><span className="val-sens-leg-box" style={{ background: "color-mix(in srgb, var(--neg) 45%, transparent)" }} />{ko ? "하락" : "Downside"}</span>
          <span className="val-sens-leg-note">{ko ? "↑ 성장 · → 배수 · 우상단일수록 낙관" : "↑ growth · → multiple · up-right = bullish"}</span>
        </div>
      </div>

      {/* reverse calculators — same slot pattern: pick a method, type a value, read the implied price */}
      <div className="val-sec">
        <div className="val-sec-cap"><span className="val-cap-title"><Lic name="rotate-ccw" size={14} cls="icon-sm" color="var(--accent)" />{t.val_reverse}</span></div>
        <div className="val-rev-grid">
          {revs.map((rv, i) => {
            const f = sFair(rv);
            return (
              <div className="val-rev" key={i}>
                <div className="val-rev-h">{mDef[rv.m].short} → {lang === "ko" ? "주가" : "price"}</div>
                <ValField label={<ValSlotPick m={rv.m} mDef={mDef} meta={slotMeta} groups={slotGroups} onPick={(m) => setRev(i, m === "cap" ? { m, v: capDef, u: capDefIdx } : { m, v: defSlotV(m) })} />} value={rv.v} onChange={(v) => setRev(i, { ...rv, v })} suffix={sufNode(rv, (ni) => pickU(revs, setRevs, i, ni))} />
                {f > 0 ? <div className="val-rev-out"><span className="val-rev-out-v mono">{money(f)}</span><span className={"mono " + (up2(f) >= 0 ? "pos" : "neg")}>{fmtPct1(up2(f))}</span></div>
                  : <div className="val-rev-empty">{rv.m === "divy" ? t.val_needEps : rv.m === "cap" ? t.val_needShares : t.val_needEps}</div>}
              </div>
            );
          })}
        </div>
        <div className="val-goalseek">
          <div className="val-gs-head">
            <span className="val-gs-title">{ko ? "목표 주가 → 필요조건" : "Target price → requirements"}</span>
            <span className="val-gs-sub">{ko ? "이 주가가 정당화되려면 무엇이 필요한가" : "what must be true to justify it"}</span>
          </div>
          <div className="val-gs-inp">
            <ValField label={ko ? "목표 주가" : "Target price"} value={isUs ? Math.round(gp * fxRate * 100) / 100 : Math.round(gp * fxRate)} onChange={(v) => setGoalPx((v || 0) / (fxRate || 1))} suffix={isUs ? "$" : "원"} />
            <span className={"val-gs-prem mono " + (pxPrem >= 0 ? "pos" : "neg")}>{(ko ? "현재가 대비 " : "vs now ") + fmtPct1(pxPrem)}</span>
            <span className="val-gs-abbr mono">{"= " + gpComma + (isUs ? "" : " (" + krwAbbr(gpv) + ")")}</span>
          </div>
          <div className="val-gs-scale">
            <span className="val-gs-scale-lab">{ko ? "회사 전체 규모" : "Company scale"}</span>
            <span className="val-gs-scale-val mono">{capFmt(plan.currentPrice) + " → " + capFmt(gp)}</span>
            <span className="val-gs-scale-delta mono pos">{"+" + capFmt(gp - plan.currentPrice) + " · " + fmtPct1(pxPrem)}</span>
          </div>
          <div className="val-gs-path">
            <button className={"val-gs-seg" + (gsPath === "earn" ? " on" : "")} onClick={() => setGsPath("earn")}>{ko ? "실적으로" : "Via earnings"}</button>
            <button className={"val-gs-seg" + (gsPath === "mult" ? " on" : "")} onClick={() => setGsPath("mult")}>{ko ? "기대감으로" : "Via re-rating"}</button>
          </div>
          {gsPath === "earn" ? (
            <div className="val-gs-cards2">
              <div className="val-gs-sec">
                <div className="val-gs-sec-cap">{ko ? "이만큼 커져야 — 현재 → 정당화 시" : "Must grow — now → justified"}</div>
                <div className="val-gs-keygrid"><div className="val-gs-key-row">{[
                  { k: ko ? "매출" : "Revenue", cur: revNow, need: revNeed, abs: true },
                  { k: ko ? "영업이익" : "Op income", cur: opNow, need: opNeed, abs: true },
                  { k: ko ? "순이익" : "Net income", cur: niNow, need: niNeed, abs: true },
                  { k: "EPS", cur: gsEps, need: needEps, abs: false }
                ].map((x, oi) => { const nv = x.need; return (<div className="fin-keycard val-gs-key" key={oi}><div className="fin-keycard-top"><span className="fin-keycard-lab">{x.k}</span><span className="ind-grade ind-pos"><span className="ind-dot" />{pct0(pxPrem)}</span></div><div className="val-gs-key-flow"><span className="val-gs-key-now mono">{x.abs ? absFmt(x.cur) : money(x.cur)}</span><span className="val-gs-key-arrow">&#8594;</span><span className="val-gs-key-to mono">{x.abs ? absFmt(nv) : money(nv)}</span></div></div>); })}</div></div>
                <div className="val-gs-cagr">{ko ? ("필요 연성장률 — 3년이면 연 " + fmtPct1((Math.pow((gp / (plan.currentPrice || 1)), 1 / 3) - 1) * 100) + " · 5년이면 연 " + fmtPct1((Math.pow((gp / (plan.currentPrice || 1)), 1 / 5) - 1) * 100)) : ("Required CAGR — 3y " + fmtPct1((Math.pow((gp / (plan.currentPrice || 1)), 1 / 3) - 1) * 100) + " · 5y " + fmtPct1((Math.pow((gp / (plan.currentPrice || 1)), 1 / 5) - 1) * 100))}</div>
              </div>
              <div className="val-gs-sec">
                <div className="val-gs-sec-cap">{ko ? "고정한 가정 — 그대로 둠" : "Held constant"}</div>
                <div className="val-gs-keygrid"><div className="val-gs-key-row">{[
                  { k: ko ? "순이익률" : "Net margin", v: (isFinite(r.cNetM) ? r.cNetM.toFixed(1) + "%" : "—") },
                  { k: "ROE", v: (isFinite(r.cRoe) ? r.cRoe.toFixed(1) + "%" : "—") },
                  { k: "PER", v: (gsPer > 0 ? gsPer.toFixed(1) : "—") + "×" }
                ].map((x, oi) => (<div className="fin-keycard val-gs-key hold" key={oi}><div className="fin-keycard-top"><span className="fin-keycard-lab">{x.k}</span><span className="val-gs-card-tag muted">{ko ? "고정" : "held"}</span></div><div className="val-gs-key-flow"><span className="val-gs-key-to mono">{x.v}</span></div></div>))}</div></div>
              </div>
            </div>
          ) : (
            <div className={"val-gs-mult" + (perStretch ? " warn" : "")}>
              <div className="val-gs-mult-top"><span className="val-gs-mult-name">{ko ? "실적은 그대로, 시장이 더 높게 평가한다" : "Earnings flat, market re-rates"}</span><span className={"val-gs-card-tag" + (perStretch ? " warn" : " muted")}>{ko ? "배수만" : "multiple only"}</span></div>
              <div className="val-gs-keygrid">
                <div className="val-gs-key-sub">{ko ? ("주가만 올라도 PER·PBR·PSR이 다 같이 " + pct0(perGrow) + " 올라요 — 카드마다 다른 건 '왜 그만큼 평가받을 만한지'예요") : ("Price alone lifts PER, PBR, PSR all by " + pct0(perGrow) + " — each card shows why that multiple could be earned")}</div>
                <div className="val-gs-key-row">{[
                  { k: "PER", c: gsPer, n: needPer, why: ko ? "이익 성장 기대" : "faster growth" },
                  { k: "PBR", c: r.cPbr, n: r.cPbr * (gp / (plan.currentPrice || 1)), why: ko ? "ROE 개선 기대" : "ROE improves" },
                  { k: "PSR", c: r.cPsr, n: r.cPsr * (gp / (plan.currentPrice || 1)), why: ko ? "마진 확대 기대" : "margin expands" }
                ].filter((x) => x.c > 0 && isFinite(x.c)).map((x, oi) => (<div className="fin-keycard val-gs-key" key={oi}><div className="fin-keycard-top"><span className="fin-keycard-lab">{x.k}</span><span className="ind-grade ind-mid"><span className="ind-dot" />{pct0(perGrow)}</span></div><div className="val-gs-key-flow"><span className="val-gs-key-now mono">{fmtX(x.c)}</span><span className="val-gs-key-arrow">&#8594;</span><span className="val-gs-key-to mono">{fmtX(x.n)}</span></div><div className="val-gs-key-why">{x.why}</div></div>))}</div>
              </div>
              <div className="val-gs-mult-warn">{ko ? "⚠ 실적 변화 없이 배수만 오르는 건 펀더멘털이 아니라 시장 심리에 기댄 가정이에요." : "⚠ A multiple-only move isn't fundamentals — it leans on sentiment."}</div>
            </div>
          )}
          <div className="val-gs-foot">{gsPath === "earn"
            ? (ko
              ? `PER·PBR·PSR을 그대로 두면, 순이익이 ${fmtPct1(epsGrow)} 늘어야 이 가격에 닿아요. 시장이 더 높게 평가해 주면(기대감으로) 필요한 실적 성장은 그만큼 줄어요 — 보통은 둘의 조합이에요.`
              : `Holding the multiples, earnings must grow ${fmtPct1(epsGrow)} to reach this price. If the market also re-rates (Via re-rating), the required growth shrinks — usually it is a mix.`)
            : (ko
              ? `실적이 그대로면 PER·PBR·PSR이 함께 ${fmtPct1(perGrow)} 올라야 해요 — 배수만 오르는 건 펀더멘털이 아니라 시장 심리예요. 실적이 받쳐주면(실적으로) 필요한 재평가 폭은 줄어요.`
              : `With flat earnings, PER/PBR/PSR must all rise ${fmtPct1(perGrow)} — a multiple-only move is sentiment, not fundamentals. If earnings grow too (Via earnings), the needed re-rating shrinks.`)}</div>
        </div>
      </div>
    </div>
  );
}

function ValFair({ lab, val, up, fmtPct, highlight, off, tip, tier }: {
  lab: string; val: string; up: number; fmtPct: (v: number) => string;
  highlight?: boolean; off?: boolean; tip?: string | null; tier?: Tier;
}) {
  const [hv, setHv] = useState(false);
  return (
    <div className={"val-fair" + (highlight ? " hl" : "") + (off ? " off" : "")}
      onMouseEnter={() => tip && setHv(true)} onMouseLeave={() => setHv(false)}>
      {hv && tip && <span className="val-card-tip val-mtip"><b>{lab}</b><span className="fin-tip-def">{tip}</span></span>}
      {tier && <span className="val-fair-tier" style={{ color: tier.c, background: `color-mix(in srgb, ${tier.c} 15%, transparent)` }}>{tier.lab}</span>}
      <div className="val-fair-lab">{lab}</div>
      <div className="val-fair-val mono">{val}</div>
      <div className={"val-fair-up mono " + (up >= 0 ? "pos" : "neg")}>{fmtPct(up)}</div>
    </div>
  );
}

/* 적정주가 분포 막대 — 현재가 대비 각 방법의 적정가가 어디에 떨어지는지 */
type DistPoint = { lab: string; sub: string; full: string; v: number };
type Marker = { kind: string; v: number; id: string; full: string; pos: number; up: number; row: number };
function ValDistribution({ points, avg, current, money, lang }: {
  points: DistPoint[]; avg: number; current: number; money: (v: number) => string; lang: Lang;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const pts = points.filter((p) => p.v > 0);
  const fairsV = pts.map((p) => p.v);
  const all = fairsV.concat([avg, current]).filter((v) => v > 0);
  let lo = all.length ? Math.min(...all) : 0, hi = all.length ? Math.max(...all) : 1;
  const pad = (hi - lo) * 0.16 || hi * 0.16 || 1; lo -= pad; hi += pad;
  const span = (hi - lo) || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  const curPct = pos(current);
  const upOf = (v: number) => current > 0 ? (v - current) / current * 100 : 0;
  const hue = (up: number) => up > 1.5 ? "var(--r-bull)" : up < -1.5 ? "var(--r-bear)" : "var(--r-base)";
  const ko = lang === "ko";
  if (!fairsV.length) return null;
  // 현재가를 경첩으로: 왼쪽(하락 영역) 빨강 → 현재가 노랑 → 오른쪽(상승여력) 초록
  const trackBg = `linear-gradient(90deg, var(--r-bear) 0%, var(--r-base) ${curPct.toFixed(1)}%, var(--r-bull) 100%)`;
  // 막대에는 방법 핀만 — 종합(요약값)은 아래 카드가 담당 (중복·중앙 혼잡 방지)
  const markers: Marker[] = pts.map((p) => ({ kind: "pin", v: p.v, id: p.full || p.lab, full: p.full || p.lab, pos: 0, up: 0, row: 0 }));
  markers.forEach((m) => { m.pos = pos(m.v); m.up = upOf(m.v); });
  const lastRow = [-100, -100];
  markers.slice().sort((a, b) => a.pos - b.pos).forEach((m) => { const row = (m.pos - lastRow[0] >= 12) ? 0 : (m.pos - lastRow[1] >= 12) ? 1 : 0; m.row = row; lastRow[row] = m.pos; });
  return (
    <div className="val-dist">
      <div className="val-dist-track" style={{ background: trackBg }}>
        {/* 현재가 — 흰 세로선 + 삼각 + 위쪽 배지 (기준점) */}
        <div className="val-dist-now" style={{ left: curPct + "%" }}><span className="val-dist-now-lab">{(ko ? "현재 " : "Now ") + money(current)}</span></div>
        {/* 방법 핀 + 종합 — 같은 솔리드 점, 가격은 한 줄에 나란히 */}
        {markers.map((m, i) => { const tip = (m.kind === "avg" ? (ko ? "종합 적정주가" : "Blended") : m.full) + " · " + money(m.v) + " · " + (m.up >= 0 ? "+" : "") + m.up.toFixed(1) + "%"; return (
          <div className={"val-dist-pin" + (m.kind === "avg" ? " avg" : "") + (hov === i ? " hov" : "")} key={i} style={{ left: m.pos + "%", background: hue(m.up) }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov((h) => h === i ? null : h)}>
            {hov === i && <span className="val-dist-tip">{tip}</span>}
            <span className={"val-dist-pin-lab" + (m.row ? " row1" : "") + (m.kind === "avg" ? " avg" : "")}><span className="val-dist-pin-id">{m.id}</span><span className="val-dist-pin-px">{money(m.v)}</span></span>
          </div>
        ); })}
      </div>
      <div className="val-dist-ends"><span className="mono">{money(lo)}</span><span className="val-dist-scale-mid">{ko ? "현재가 기준 · ← 하락 · 상승 →" : "vs current · ← down · up →"}</span><span className="mono">{money(hi)}</span></div>
    </div>
  );
}

/* 핵심 가정 앵커 — 적정가를 만드는 입력값을 명시 */
function ValAnchors({ rows }: { rows: { lab: string; val: string; dot?: string }[] }) {
  return (
    <div className="val-anchors">
      {rows.map((a, i) => (
        <div className="val-anchor" key={i}>
          {a.dot && <span className="val-anchor-dot" style={{ background: a.dot }} />}
          <span className="val-anchor-lab">{a.lab}</span>
          <span className="val-anchor-val mono">{a.val}</span>
        </div>
      ))}
    </div>
  );
}

/* 민감도 히트맵 — 성장률 × 첫 슬롯 배수 조합별 현재가 대비 상승여력 + 적정가 */
function ValSensitivity({ gSteps, mSteps, cells, base, primaryShort, mSuf, t, money, current, ko }: {
  gSteps: number[]; mSteps: number[]; cells: { up: number; fair: number }[][];
  base: { r: number; c: number }; primaryShort: string; mSuf: string;
  t: I18nDict; money: (v: number) => string; current: number; ko: boolean;
}) {
  const [hov, setHov] = useState<string | null>(null);
  const tone = (up: number) => { const a = Math.max(-50, Math.min(50, up)); const c = up >= 0 ? "var(--pos)" : "var(--neg)"; return "color-mix(in srgb, " + c + " " + (Math.abs(a) / 50 * 60 + 5).toFixed(0) + "%, transparent)"; };
  const fmtM = (m: number) => (mSuf === "×" ? (Math.abs(m) >= 100 ? Math.round(m) : Math.round(m * 10) / 10) : m) + mSuf;
  return (
    <div className="val-sens">
      <div className="val-sens-xtitle"><span>{t.val_sens_m}</span><span className="val-sens-arr">→</span></div>
      <div className="val-sens-body">
      <div className="val-sens-ytitle"><span>{t.val_sens_g}</span><span className="val-sens-arr">↓</span></div>
      <div className="val-sens-grid" style={{ gridTemplateColumns: "52px repeat(" + mSteps.length + ", 1fr)" }}>
        <div className="val-sens-corner"></div>
        {mSteps.map((m, i) => <div className="val-sens-colh" key={"c" + i}>{fmtM(m)}</div>)}
        {gSteps.map((g, ri) => (
          <Fragment key={"r" + ri}>
            <div className="val-sens-rowh">{(g >= 0 ? "+" : "") + g + "%"}</div>
            {mSteps.map((m, ci) => { const c = cells[ri][ci]; const isBase = ri === base.r && ci === base.c; const id = ri + "-" + ci; const gl = (g >= 0 ? "+" : "") + g + "%"; const ml = fmtM(m); const ul = (c.up >= 0 ? "+" : "") + c.up.toFixed(1) + "%"; return (
              <div className={"val-sens-cell" + (isBase ? " base" : "")} key={id} style={{ background: tone(c.up) }}
                onMouseEnter={() => setHov(id)} onMouseLeave={() => setHov((h) => h === id ? null : h)}>
                <span className="val-sens-cell-up">{(c.up >= 0 ? "+" : "") + c.up.toFixed(0) + "%"}</span>
                <span className="val-sens-cell-px">{money(c.fair)}</span>
                {hov === id && <span className={"val-sens-celltip" + (ci >= mSteps.length - 1 ? " left" : "") + (ci === 0 ? " right" : "")}>
                  <b className="val-sens-celltip-h">{primaryShort} {ml} · {ko ? "성장 " : "growth "}{gl}{isBase ? (ko ? " · 현재 가정" : " · current") : ""}</b>
                  <span className="val-sens-celltip-row"><span>{ko ? "적정가" : "Fair value"}</span><b className="mono">{money(c.fair)}</b></span>
                  <span className="val-sens-celltip-row"><span>{ko ? "현재가 대비" : "vs current"}</span><b className={"mono " + (c.up >= 0 ? "pos" : "neg")}>{ul}</b></span>
                  <span className="val-sens-celltip-note">{ko ? `성장률을 ${gl}로 가정하면 예상 주당가치가 달라지고, 거기에 목표 ${primaryShort} ${ml}를 곱해(EV 계열은 순부채 차감) 적정가 ${money(c.fair)}가 나와요. 현재가 ${money(current)} 대비 ${ul}.` : `At ${gl} growth the forward per-share value shifts; × ${primaryShort} ${ml} gives ${money(c.fair)}, ${ul} vs current ${money(current)}.`}</span>
                </span>}
              </div>
            ); })}
          </Fragment>
        ))}
      </div>
      </div>
    </div>
  );
}

/* ---- 멀티플 밴드 차트 — 과거 PER/PBR/PSR/EV 밴드에 가격 오버레이 (source 2233~2382) ---- */
function MultipleBandChart({ plan, fin, lang, defaultBand }: {
  plan: UIPlan; fin: Fin | null; lang: Lang; defaultBand?: string;
}) {
  const ko = lang === "ko";
  const [bandType, setBandType] = useState(defaultBand || "PER");
  const [src, setSrc] = useState("hist");      // hist | custom
  const [cm, setCm] = useState<{ low: number | string; mid: number | string; high: number | string } | null>(null); // 유저 입력 {low,mid,high}
  const [hov, setHov] = useState<{ i: number; left: number } | null>(null);
  useEffect(() => { setCm(null); setSrc("hist"); }, [bandType, plan.id]);
  const shares = (plan.sharesOut || 1) * 1e6;
  if (!fin) return <div className="empty-tab">{ko ? "재무 데이터 없음" : "No data"}</div>;
  // 연도별 주당 지표
  const divyNow = (fin.indicators.find((x) => x.key === "DIVY") || ({} as Partial<Indicator>)).v || 0;
  const dpsNow = plan.currentPrice * divyNow / 100;
  const netLast = fin.is[fin.is.length - 1].net || 1;
  const payout = dpsNow * shares / netLast;          // 배당성향(현재 기준)
  const metricSeries = fin.is.map((r, i) => {
    if (bandType === "PBR") return fin.bs[i].equity / shares;
    if (bandType === "PSR") return r.rev / shares;
    if (bandType === "EV") return (r.op * 1.25) / shares;
    if (bandType === "DIVY") return Math.max(1e-9, (r.net * payout) / shares); // 주당배당 (P/D 밴드 = PER과 동일 수학)
    return r.net / shares; // PER
  });
  const isDivy = bandType === "DIVY";
  const years = fin.is.map((r) => r.y);
  const n = years.length;
  // 연도별 주가(현재가 기준 priceHistory 5점 리샘플)
  const ph = plan.priceHistory || [];
  const pxYear = years.map((_, i) => { const idx = Math.min(ph.length - 1, Math.round(i / (n - 1) * (ph.length - 1))); return i === n - 1 ? plan.currentPrice : (ph[idx] ? ph[idx].v : plan.currentPrice); });
  // 과거 멀티플 → 밴드(저/평균/고)
  const mults = metricSeries.map((m, i) => m > 0 ? pxYear[i] / m : null).filter((v) => v && isFinite(v)) as number[];
  if (mults.length < 2) return <div className="empty-tab">{ko ? "이 지표는 밴드를 만들 수 없습니다" : "No band for this metric"}</div>;
  const sorted = mults.slice().sort((a, b) => a - b);
  // 퍼센타일 밴드 (min/max 이상치 왜곡 방지): 25/50/75
  const pct = (q: number) => { const idx = (sorted.length - 1) * q; const lo = Math.floor(idx), hi = Math.ceil(idx); return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo); };
  const histLow = pct(0.25), histHigh = pct(0.75), histMid = pct(0.5);
  const custom = src === "custom";
  const histLowYield = 100 / histHigh, histMidYield = 100 / histMid, histHighYield = 100 / histLow;
  const cmv = cm || (isDivy ? { low: +histLowYield.toFixed(2), mid: +histMidYield.toFixed(2), high: +histHighYield.toFixed(2) } : { low: +histLow.toFixed(1), mid: +histMid.toFixed(1), high: +histHigh.toFixed(1) });
  let low: number, mid: number, high: number;
  if (custom && isDivy) { low = 100 / Math.max(0.01, +cmv.high || 0.01); mid = 100 / Math.max(0.01, +cmv.mid || 0.01); high = 100 / Math.max(0.01, +cmv.low || 0.01); }
  else if (custom) { low = +cmv.low || 0; mid = +cmv.mid || 0; high = +cmv.high || 0; }
  else { low = histLow; mid = histMid; high = histHigh; }
  const metricNow = metricSeries[n - 1];
  const curMult = metricNow > 0 ? plan.currentPrice / metricNow : null;
  // 현재 배수가 과거 분포의 몇 % 지점인가
  const curPctile = curMult ? Math.round(sorted.filter((v) => v <= curMult).length / sorted.length * 100) : null;
  const belowCount = curMult ? sorted.filter((v) => v <= curMult).length : 0; // 현재 이하였던 연도 수
  const bandAt = (i: number, mlt: number) => metricSeries[i] * mlt;
  const all: number[] = [];
  metricSeries.forEach((m, i) => { all.push(bandAt(i, low), bandAt(i, high), pxYear[i]); });
  const max = Math.max(...all) * 1.05, min = Math.min(...all) * 0.95;
  const W = 760, H = 230, PX = 10, TOP = 22, BOT = 30;
  const x = (i: number) => PX + (W - 2 * PX) * i / (n - 1);
  const y = (v: number) => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const linePath = (mlt: number) => metricSeries.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(bandAt(i, mlt)).toFixed(1)}`).join(" ");
  const pxPath = pxYear.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const backLow = metricSeries.map((m, i) => ({ X: x(i), Y: y(bandAt(i, low)) })).reverse().map((p) => `L${p.X.toFixed(1)} ${p.Y.toFixed(1)}`).join(" ");
  const fairNow = metricNow * mid;
  const fairUp = (fairNow - plan.currentPrice) / plan.currentPrice * 100;
  const unit = isDivy ? "%" : "×";
  // DIVY는 P/D비율을 수익률(%)로 환산해 표시 (낮은 가격 = 높은 수익률)
  const dMult = (m: number) => isDivy ? (100 / m) : m;
  const curDisp = curMult ? dMult(curMult) : null;
  const _loDisp = isDivy ? dMult(high) : low, _hiDisp = isDivy ? dMult(low) : high;
  void _loDisp; void _hiDisp;
  // 백분위는 항상 '실제 과거 분포' 기준 — 내 가정값이 아니라 과거 25/75 밴드를 표시해야 40%와 일관됨
  const histLoDisp = isDivy ? dMult(histHigh) : histLow, histHiDisp = isDivy ? dMult(histLow) : histHigh;
  const pctTone = curPctile == null ? "warn" : curPctile <= 35 ? "pos" : curPctile >= 65 ? "neg" : "warn";
  const pctColor = pctTone === "pos" ? "var(--pos)" : pctTone === "neg" ? "var(--neg)" : "var(--r-paused)";
  const pctWord = curPctile == null ? "—" : curPctile <= 35 ? (ko ? "과거보다 싼 편" : "Cheaper than usual") : curPctile >= 65 ? (ko ? "과거보다 비싼 편" : "Pricier than usual") : (ko ? "평소 수준" : "Around usual");
  const metricPsLab = bandType === "PBR" ? (ko ? "주당순자산(BPS)" : "book value/sh (BPS)") : bandType === "PSR" ? (ko ? "주당매출(SPS)" : "sales/sh (SPS)") : bandType === "EV" ? (ko ? "주당 EBITDA" : "EBITDA/sh") : (ko ? "주당순이익(EPS)" : "earnings/sh (EPS)");
  const metricPsSym = bandType === "PBR" ? "BPS" : bandType === "PSR" ? "SPS" : bandType === "EV" ? "EBITDA/sh" : "EPS";
  const midLab = custom ? (ko ? "내가 정한 평균" : "your mid") : (ko ? "과거 중앙값" : "historical median");
  const fairYr = years[n - 1];
  const BANDS = ["PER", "PBR", "PSR", "EV"];
  return (
    <div>
      <div className="band-srcrow">
        <div className="seg-toggle band-bandsel">
          {BANDS.map((b) => <div key={b} className={"st" + (bandType === b ? " active" : "")} onClick={() => setBandType(b)}>{b === "EV" ? "EV/EBITDA" : b}</div>)}
        </div>
        <span className="fcb-spacer" />
        <div className="seg-toggle band-srctoggle">
          <div className={"st" + (!custom ? " active" : "")} onClick={() => setSrc("hist")}>{ko ? "과거" : "Historical"}</div>
          <div className={"st" + (custom ? " active" : "")} onClick={() => { if (!cm) setCm({ low: +histLow.toFixed(1), mid: +histMid.toFixed(1), high: +histHigh.toFixed(1) }); setSrc("custom"); }}>{ko ? "내 가정" : "My assumption"}</div>
        </div>
      </div>
      {custom && (
        <div className="band-inputs">
          {([["low", ko ? "저배수" : "Low"], ["mid", ko ? "평균" : "Mid"], ["high", ko ? "고배수" : "High"]] as [string, string][]).map(([k, lab]) => (
            <label key={k} className="band-inp"><span>{lab}</span>
              <input type="number" step="0.1" value={cmv[k as "low" | "mid" | "high"]} onChange={(e) => setCm({ ...cmv, [k]: e.target.value })} />
              <span className="band-inp-unit">{unit}</span>
            </label>
          ))}
        </div>
      )}
      <div className="band-lead">
        <div className="band-lead-main">
          <span className="band-lead-pct" style={{ color: pctColor }}>{curPctile != null ? curPctile + (ko ? "%" : "th") : "—"}</span>
          <div className="band-lead-txt">
            <div className="band-lead-tag" style={{ color: pctColor }}>{pctWord}<span className="fin-term" style={{ marginLeft: 3 }}><span className="ind-q">?</span><span className="fin-tip" style={{ color: "var(--fg)" }}><b>{ko ? `백분위 ${curPctile}% — ${pctWord}` : `${curPctile}th percentile — ${pctWord}`}</b><span className="fin-tip-def">{ko ? `과거 5년 ${bandType} 배수 ${sorted.length}개 중 ${belowCount}개가 현재(${curDisp ? curDisp.toFixed(1) : "—"}×) 이하 → ${belowCount}/${sorted.length} = ${curPctile}%. 과거의 ${curPctile}% 기간이 지금보다 쌌고 ${curPctile != null ? 100 - curPctile : "—"}%가 비쌌다는 뜻이에요. 35% 이하면 '과거보다 싼 편', 65% 이상이면 '비싼 편', 그 사이는 '평소 수준'입니다. (내 가정과 무관한 과거 실제 분포 기준)` : `${belowCount} of the last ${sorted.length} yearly multiples were at or below today's ${curDisp ? curDisp.toFixed(1) : "—"}× → ${belowCount}/${sorted.length} = ${curPctile}%. Under 35% = cheaper than usual, over 65% = pricier, in between = around usual. Based on actual history, not your assumptions.`}</span></span></span></div>
            <div className="band-lead-sub">{ko ? `현재 ${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"} · 과거 5년 ${histLoDisp.toFixed(1)}~${histHiDisp.toFixed(1)}${unit} 분포의 백분위` : `${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"} · percentile in its 5-yr range`}</div>
          </div>
        </div>
        <div className="band-lead-cells">
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "중앙값 적정가" : "Fair (median)"}<span className="fin-term" style={{ marginLeft: 3 }}><span className="ind-q">?</span><span className="fin-tip fin-tip-r"><b>{ko ? "중앙값 적정가란?" : "Fair value (median)"}</b><span className="fin-tip-def">{ko ? `최근 ${n}년(${years[0]}~${fairYr}) 거래된 ${bandType} 배수의 한가운데(중앙값)로 평가하면 나오는 1주 가격이에요. 최신 ${fairYr}년 ${metricPsLab}에 ${midLab} 배수를 곱해 구합니다.` : `The share price if it traded at the middle (median) of its ${bandType} multiples over the last ${n} years (${years[0]}–${fairYr}) — latest ${fairYr} ${metricPsLab} × the ${midLab} multiple.`}</span><span className="fin-tip-f">{`${metricPsSym} ${fmtMoney(metricNow, plan.cur)} × ${mid.toFixed(1)}${unit} = ${fmtMoney(fairNow, plan.cur)}`}</span></span></span></div><div className="gap-px-val mono">{fmtMoney(fairNow, plan.cur)}</div></div>
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "중앙값 대비" : "vs median"}</div><div className="gap-spread-val" style={{ color: fairUp >= 0 ? "var(--pos)" : "var(--neg)" }}>{fairUp >= 0 ? "+" : ""}{fairUp.toFixed(0)}%</div></div>
        </div>
      </div>
      <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const rel = (e.clientX - r.left) / r.width * W; let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); setHov({ i, left: x(i) / W * 100 }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
        {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
        <path d={`${linePath(high)} ${backLow} Z`} fill="color-mix(in srgb, var(--accent) 7%, transparent)" />
        <path d={linePath(high)} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />
        <path d={linePath(mid)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path d={linePath(low)} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />
        <path d={pxPath} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, high))} r="3" fill="var(--fg-4)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, mid))} r="3.5" fill="var(--accent)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(bandAt(n - 1, low))} r="3" fill="var(--fg-4)" />}
        {!hov && <circle cx={x(n - 1)} cy={y(plan.currentPrice)} r="4.5" fill={pctColor} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
        {hov && <circle cx={x(hov.i)} cy={y(bandAt(hov.i, mid))} r="4" fill="var(--accent)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <circle cx={x(hov.i)} cy={y(pxYear[hov.i])} r="4" fill={pctColor} stroke="var(--bg-app)" strokeWidth="1.5" />}
        <text x={x(0) + 2} y={y(bandAt(0, high)) - 4} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{high.toFixed(0)}{unit}</text>
        <text x={x(0) + 2} y={y(bandAt(0, low)) + 11} style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-sans)" }}>{low.toFixed(0)}{unit}</text>
        {years.map((q, i) => <text key={i} x={x(i)} y={H - 10} textAnchor="middle" style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
      </svg>
      {hov && (() => { const i = hov.i; const leftPct = Math.max(2, Math.min(78, hov.left)); const g = (bandAt(i, mid) - pxYear[i]) / pxYear[i] * 100; const ym = pxYear[i] > 0 && metricSeries[i] > 0 ? pxYear[i] / metricSeries[i] : null; return (
        <div className="gap-tip" style={{ left: leftPct + "%" }}>
          <div className="gap-tip-q">{years[i]}{ym != null ? ` · ${bandType} ${dMult(ym).toFixed(1)}${unit}` : ""}</div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{ko ? "상위 25% (비쌈)" : "75%ile"} <b>{fmtMoney(bandAt(i, high), plan.cur)}</b></div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--accent)" }} />{ko ? "중앙값 (적정)" : "Median"} <b>{fmtMoney(bandAt(i, mid), plan.cur)}</b></div>
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--fg-4)" }} />{ko ? "하위 25% (쌈)" : "25%ile"} <b>{fmtMoney(bandAt(i, low), plan.cur)}</b></div>
          <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{fmtMoney(pxYear[i], plan.cur)}</b></div>
          <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "중앙값 대비 " : "vs median "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
        </div>
      ); })()}
      </div>
      <div className="gap-legend">
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--accent)" }} />{ko ? "중앙값 (적정 배수)" : "Median"}</span>
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-4)" }} />{ko ? "상위·하위 25% (밴드)" : "25–75%ile band"}</span>
        <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{ko ? "시장 가격" : "Price"}</span>
      </div>
      <div className={"gap-verdict gv-" + (pctTone === "warn" ? "neutral" : pctTone)} style={{ marginTop: 14 }}>
        <Lic name="info" size={17} cls="icon-sm" color="currentColor" />
        <div><div className="gap-verdict-lab">{ko ? "참고용 · 과거 멀티플 분포 기준" : "Reference · historical multiples"}</div><div className="gap-verdict-msg">{custom ? (ko ? `내가 정한 ${bandType} ${low.toFixed(1)}~${high.toFixed(1)}${unit} 기준 적정가는 ${fmtMoney(fairNow, plan.cur)} — 현재가 대비 ${fairUp >= 0 ? "+" : ""}${fairUp.toFixed(0)}%.` : `My ${bandType} band implies ${fmtMoney(fairNow, plan.cur)} fair value.`) : (ko ? `현재 ${bandType} ${curDisp ? curDisp.toFixed(1) + unit : "—"}는 과거 5년 분포의 ${curPctile}% 지점 — ${pctWord}. 중앙값 배수로 환산한 적정가는 ${fmtMoney(fairNow, plan.cur)}입니다.` : `At the ${curPctile}th percentile of its 5-yr range; median-multiple fair value ${fmtMoney(fairNow, plan.cur)}.`)}</div></div>
      </div>
    </div>
  );
}

/* ---- 적정가 밴드(여러 방법) — PER·PBR·PSR·EV 각 방법이 매기는 적정가를 시계열 밴드로, 시장가 오버레이. (source 2387~2546) ---- */
// show 토글(band/avg/price + 방법 id)은 동적 키로 접근 → flags 인덱스 시그니처, style은 별도.
// (원본 프로토타입은 vp.band / vp[m.id] / vp.style 로 평면 접근 — TS 안전을 위해 flags/style 로 분리.)
interface ValPrefs { flags: Record<string, boolean>; style: Record<string, string> }
const VALBAND_FLAGS: Record<string, boolean> = { band: true, avg: true, price: true, PER: false, PBR: false, PSR: false, EV: false };
const VALBAND_STYLE: Record<string, string> = { PER: "solid", PBR: "solid", PSR: "solid", EV: "solid" };
const valBandDefault = (): ValPrefs => ({ flags: { ...VALBAND_FLAGS }, style: { ...VALBAND_STYLE } });
function valBandPrefsLoad(): ValPrefs {
  try {
    const s = JSON.parse((typeof localStorage !== "undefined" && localStorage.getItem("keystone-valband-prefs")) || "{}");
    // 레거시 평면 저장({band,avg,...,style})과 신 구조({flags,style}) 모두 흡수.
    const flatFlags = { band: s.band, avg: s.avg, price: s.price, PER: s.PER, PBR: s.PBR, PSR: s.PSR, EV: s.EV };
    return { flags: { ...VALBAND_FLAGS, ...(s.flags || flatFlags) }, style: { ...VALBAND_STYLE, ...(s.style || {}) } };
  } catch { return valBandDefault(); }
}
function ValFairBandChart({ plan, fin, lang }: { plan: UIPlan; fin: Fin | null; lang: Lang }) {
  const ko = lang === "ko";
  const [hov, setHov] = useState<{ i: number; left: number } | null>(null);
  const [disp, setDisp] = useState(false);
  // SSR 가드: localStorage 접근을 렌더 후 useEffect 로 미룬다(gap-tab.tsx 패턴). 초기값은 서버·클라 동일한 default.
  const [vp, setVp] = useState<ValPrefs>(valBandDefault);
  useEffect(() => { setVp(valBandPrefsLoad()); }, []);
  const setVp1 = (patch: { flags?: Record<string, boolean>; style?: Record<string, string> }) => setVp((p) => { const nx: ValPrefs = { flags: { ...p.flags, ...(patch.flags || {}) }, style: { ...p.style, ...(patch.style || {}) } }; try { localStorage.setItem("keystone-valband-prefs", JSON.stringify(nx)); } catch { /* SSR/차단 무시 */ } return nx; });
  if (!fin || !fin.is || fin.is.length < 2) return null;
  const shares = (plan.sharesOut || 1) * 1e6;
  const years = fin.is.map((r) => r.y);
  const n = years.length;
  const ph = plan.priceHistory || [];
  const pxYear = years.map((_, i) => { const idx = Math.min(ph.length - 1, Math.round(i / (n - 1) * (ph.length - 1))); return i === n - 1 ? plan.currentPrice : (ph[idx] ? ph[idx].v : plan.currentPrice); });
  // 방법별 주당 펀더멘털 시계열
  const psPER = fin.is.map((r) => r.net > 0 ? r.net / shares : null);
  const psPBR = fin.is.map((r, i) => (fin.bs[i] && fin.bs[i].equity > 0) ? fin.bs[i].equity / shares : null);
  const psPSR = fin.is.map((r) => r.rev > 0 ? r.rev / shares : null);
  const psEV = fin.is.map((r) => r.op > 0 ? (r.op * 1.18) / shares : null);
  const ndPs = fin.is.map((r, i) => (fin.bs[i] ? fin.bs[i].liab * 0.4 : 0) / shares);
  // 방법별 대표배수 = 과거 멀티플의 중앙값(그 방법의 '정상 수준') — MultipleBandChart와 동일 산법
  const median = (arr: (number | null)[]) => { const s = arr.filter((v) => v && isFinite(v) && v > 0).sort((a, b) => (a as number) - (b as number)) as number[]; return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  const medPER = median(psPER.map((psv, i) => psv && psv > 0 ? pxYear[i] / psv : null));
  const medPBR = median(psPBR.map((psv, i) => psv && psv > 0 ? pxYear[i] / psv : null));
  const medPSR = median(psPSR.map((psv, i) => psv && psv > 0 ? pxYear[i] / psv : null));
  const medEV = median(psEV.map((psv, i) => psv && psv > 0 ? (pxYear[i] * shares + (fin.bs[i] ? fin.bs[i].liab * 0.4 : 0)) / (psv * shares) : null));
  const methods = ([
    { k: "PER", id: "PER", col: "#6A93D6", ps: psPER, mult: medPER, ev: false },
    { k: "PBR", id: "PBR", col: "#4FA08A", ps: psPBR, mult: medPBR, ev: false },
    { k: "PSR", id: "PSR", col: "#C2933F", ps: psPSR, mult: medPSR, ev: false },
    { k: "EV/EBITDA", id: "EV", col: "#9281C2", ps: psEV, mult: medEV, ev: true },
  ] as { k: string; id: string; col: string; ps: (number | null)[]; mult: number | null; ev: boolean }[]).filter((m) => m.mult && m.mult > 0);
  const fairAt = (m: { ps: (number | null)[]; mult: number | null; ev: boolean }, i: number) => { const psv = m.ps[i]; if (!(psv && psv > 0) || !(m.mult && m.mult > 0)) return null; const v = psv * m.mult; return m.ev ? Math.max(0, v - ndPs[i]) : v; };
  if (methods.length < 2) return <div className="empty-tab">{ko ? "밴드를 만들 방법이 부족합니다" : "Not enough methods for a band"}</div>;
  const bandY = years.map((_, i) => { const vs = methods.map((m) => fairAt(m, i)).filter((v) => v != null && v > 0 && isFinite(v)) as number[]; if (!vs.length) return null; return { lo: Math.min(...vs), hi: Math.max(...vs), avg: vs.reduce((a, b) => a + b, 0) / vs.length }; });
  const allV: number[] = []; bandY.forEach((b, i) => { if (b) allV.push(b.lo, b.hi); allV.push(pxYear[i]); });
  const max = Math.max(...allV) * 1.05, min = Math.min(...allV) * 0.95;
  const W = 760, H = 230, PX = 10, TOP = 22, BOT = 30;
  const x = (i: number) => PX + (W - 2 * PX) * i / (n - 1);
  const y = (v: number) => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const sxy = (P: { X: number; Y: number }[]) => { if (P.length < 2) return P.length ? `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}` : ""; let d = `M${P[0].X.toFixed(1)} ${P[0].Y.toFixed(1)}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; const c1x = p1.X + (p2.X - p0.X) / 6, c1y = p1.Y + (p2.Y - p0.Y) / 6, c2x = p2.X - (p3.X - p1.X) / 6, c2y = p2.Y - (p3.Y - p1.Y) / 6; d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.X.toFixed(1)} ${p2.Y.toFixed(1)}`; } return d; };
  const hiP = bandY.map((b, i) => b ? { X: x(i), Y: y(b.hi) } : null).filter(Boolean) as { X: number; Y: number }[];
  const loP = bandY.map((b, i) => b ? { X: x(i), Y: y(b.lo) } : null).filter(Boolean) as { X: number; Y: number }[];
  const bandPath = hiP.length >= 2 ? `${sxy(hiP)} L${sxy(loP.slice().reverse()).slice(1)} Z` : "";
  const midPath = sxy(bandY.map((b, i) => b ? { X: x(i), Y: y(b.avg) } : null).filter(Boolean) as { X: number; Y: number }[]);
  const hiLine = sxy(hiP), loLine = sxy(loP);
  const pxPath = sxy(pxYear.map((v, i) => ({ X: x(i), Y: y(v) })));
  const L = n - 1;
  const price = plan.currentPrice;
  const money = (v: number) => fmtMoney(plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v), plan.cur);
  const cur = bandY[L] || { lo: price, hi: price, avg: price };
  const fairNow = cur.avg;
  const upNow = price > 0 ? (fairNow - price) / price * 100 : 0;
  const word = upNow >= 15 ? (ko ? "평균 대비 저평가" : "Below fair") : upNow <= -15 ? (ko ? "평균 대비 고평가" : "Above fair") : (ko ? "평균 부근" : "Around fair");
  const tone = upNow >= 15 ? "var(--pos)" : upNow <= -15 ? "var(--neg)" : "var(--r-paused)";
  const tv = upNow >= 15 ? "pos" : upNow <= -15 ? "neg" : "neutral";
  const showBand = vp.flags.band, showAvg = vp.flags.avg, showPx = vp.flags.price;
  const methodPath = (m: { ps: (number | null)[]; mult: number | null; ev: boolean }) => sxy(years.map((_, i) => { const v = fairAt(m, i); return v != null && v > 0 ? { X: x(i), Y: y(v) } : null; }).filter(Boolean) as { X: number; Y: number }[]);
  const mLineAttrs = (id: string) => { const s = (vp.style && vp.style[id]) || "solid"; return { strokeDasharray: s === "dash" ? "4 3" : undefined, strokeWidth: s === "thick" ? 2.4 : 1.4 }; };
  const activeMethods = methods.filter((m) => vp.flags[m.id]);
  return (
    <div>
      <div className="band-lead">
        <div className="band-lead-main">
          <span className="band-lead-pct" style={{ color: tone }}>{(upNow >= 0 ? "+" : "") + upNow.toFixed(0) + "%"}</span>
          <div className="band-lead-txt">
            <div className="band-lead-tag" style={{ color: tone }}>{word}</div>
            <div className="band-lead-sub">{ko ? `평균 적정가 ${money(fairNow)} 대비 시장가` : `Price vs ${money(fairNow)} avg fair`}</div>
          </div>
        </div>
        <div className="band-lead-cells">
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "시장가" : "Price"}</div><div className="gap-px-val mono">{money(price)}</div></div>
          <div className="band-ro-cell"><div className="gap-iv-lab">{ko ? "방법 범위" : "Method range"}</div><div className="gap-px-val mono" style={{ fontSize: 12 }}>{money(cur.lo)}~{money(cur.hi)}</div></div>
        </div>
        <span style={{ position: "relative", flex: "none" }}>
          <button className={"iconbtn" + (disp ? " active" : "")} onClick={() => setDisp((v) => !v)} title={ko ? "표시" : "Display"}><Lic name="sliders-horizontal" size={15} /></button>
          {disp && <Fragment>
            <div className="overlay" onClick={() => setDisp(false)} />
            <div className="panel" style={{ position: "absolute", top: 32, right: 0, width: 232, padding: 8, zIndex: 45 }}>
              <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{ko ? "표시 항목" : "Series"}</div>
              {([["band", ko ? "밴드 (범위)" : "Band"], ["avg", ko ? "평균" : "Average"], ["price", ko ? "시장가" : "Price"]] as [string, string][]).map(([k, l]) => (
                <div className="v-menu-item" key={k} onClick={() => setVp1({ flags: { [k]: !vp.flags[k] } })}>
                  <span>{l}</span>
                  <span className={"toggle" + (vp.flags[k] ? " on" : "")} style={{ marginLeft: "auto" }} />
                </div>
              ))}
              <div className="v-menu-sep" style={{ margin: "6px 4px" }} />
              <div className="side-cap" style={{ padding: "4px 8px", margin: 0 }}>{ko ? "방법" : "Methods"}</div>
              {methods.map((m) => (
                <Fragment key={m.id}>
                  <div className="v-menu-item" onClick={() => setVp1({ flags: { [m.id]: !vp.flags[m.id] } })}>
                    <span style={{ width: 11, height: 3, borderRadius: 2, background: m.col, flex: "none" }} />
                    <span>{m.k}</span>
                    <span className={"toggle" + (vp.flags[m.id] ? " on" : "")} style={{ marginLeft: "auto" }} />
                  </div>
                  {vp.flags[m.id] && (
                    <div className="disp-segrow" style={{ padding: "1px 8px 5px 27px" }}>
                      <span className="disp-segrow-lab" style={{ color: "var(--fg-4)" }}>{ko ? "선" : "Line"}</span>
                      <div className="rb-modebar" style={{ margin: 0 }}>
                        {([["solid", ko ? "실선" : "Solid"], ["dash", ko ? "점선" : "Dash"], ["thick", ko ? "굵게" : "Thick"]] as [string, string][]).map(([v, vl]) => <div key={v} className={"rb-mode" + (((vp.style && vp.style[m.id]) || "solid") === v ? " on" : "")} onClick={() => setVp1({ style: { [m.id]: v } })}>{vl}</div>)}
                      </div>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </Fragment>}
        </span>
      </div>
      <div style={{ position: "relative" }} onMouseLeave={() => setHov(null)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const rel = (e.clientX - r.left) / r.width * W; let i = Math.round((rel - PX) / ((W - 2 * PX) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); setHov({ i, left: x(i) / W * 100 }); }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id="valBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
        {showBand && bandPath && <path d={bandPath} fill="url(#valBandGrad)" />}
        {showBand && <path d={hiLine} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />}
        {showBand && <path d={loLine} fill="none" stroke="var(--fg-4)" strokeWidth="1.4" strokeDasharray="4 3" opacity="0.7" />}
        {activeMethods.map((m) => <path key={m.id} d={methodPath(m)} fill="none" stroke={m.col} {...mLineAttrs(m.id)} strokeLinejoin="round" opacity="0.82" />)}
        {activeMethods.map((m) => { const v = fairAt(m, L); return v != null && v > 0 ? <circle key={m.id + "d"} cx={x(L)} cy={y(v)} r="2.8" fill={m.col} /> : null; })}
        {showAvg && <path d={midPath} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {showPx && <path d={pxPath} fill="none" stroke="var(--fg)" strokeWidth="2.5" strokeLinejoin="round" />}
        {!hov && showAvg && <circle cx={x(L)} cy={y(cur.avg)} r="3.5" fill="var(--accent)" />}
        {!hov && showPx && <circle cx={x(L)} cy={y(price)} r="4.5" fill={tone} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && <line x1={x(hov.i)} x2={x(hov.i)} y1={TOP} y2={H - BOT} stroke="var(--fg-4)" strokeWidth="1" strokeDasharray="3 3" />}
        {hov && activeMethods.map((m) => { const v = fairAt(m, hov.i); return v != null && v > 0 ? <circle key={m.id + "h"} cx={x(hov.i)} cy={y(v)} r="3" fill={m.col} stroke="var(--bg-app)" strokeWidth="1.2" /> : null; })}
        {hov && showAvg && bandY[hov.i] && <circle cx={x(hov.i)} cy={y(bandY[hov.i]!.avg)} r="4" fill="var(--accent)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        {hov && showPx && <circle cx={x(hov.i)} cy={y(pxYear[hov.i])} r="4" fill={tone} stroke="var(--bg-app)" strokeWidth="1.5" />}
        {years.map((q, i) => <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} style={{ fill: hov && hov.i === i ? "var(--fg-2)" : "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{q}</text>)}
      </svg>
      {hov && bandY[hov.i] && (() => { const i = hov.i; const b = bandY[i]!; const leftPct = Math.max(2, Math.min(78, hov.left)); const g = (b.avg - pxYear[i]) / pxYear[i] * 100; return (
        <div className="gap-tip" style={{ left: leftPct + "%" }}>
          <div className="gap-tip-q">{years[i]}</div>
          <div className="gap-tip-cap">{ko ? "방법별 적정가" : "By method"}</div>
          {methods.map((m) => { const fv = fairAt(m, i); return fv != null && fv > 0 ? <div className="gap-tip-row" key={m.k}><span className="gap-tip-dot" style={{ background: m.col }} />{m.k} <b>{money(fv)}</b></div> : null; })}
          <div className="gap-tip-div" />
          <div className="gap-tip-row"><span className="gap-tip-dot" style={{ background: "var(--accent)" }} />{ko ? "평균" : "Avg"} <b>{money(b.avg)}</b></div>
          <div className="gap-tip-row gap-tip-price"><span className="gap-tip-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"} <b>{money(pxYear[i])}</b></div>
          <div className="gap-tip-gap" style={{ color: g >= 0 ? "var(--pos)" : "var(--neg)" }}>{ko ? "평균 대비 " : "vs avg "}{g >= 0 ? "+" : ""}{g.toFixed(0)}%</div>
        </div>
      ); })()}
      </div>
      <div className="gap-legend">
        {showAvg && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--accent)" }} />{ko ? "평균 적정가" : "Avg fair"}</span>}
        {showBand && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg-4)" }} />{ko ? "방법 범위 (최저~최고)" : "Method range"}</span>}
        {showPx && <span className="gap-leg"><span className="gap-leg-dot" style={{ background: "var(--fg)" }} />{ko ? "시장가" : "Price"}</span>}
        {activeMethods.map((m) => <span className="gap-leg" key={m.id}><span className="gap-leg-dot" style={{ background: m.col, width: 10, height: 3, borderRadius: 2 }} />{m.k}</span>)}
      </div>
      <div className="gap-bandcap"><Lic name="info" size={11} cls="icon-sm" color="var(--fg-4)" />{ko ? "띠 = 방법별 적정가 최저~최고 · 파란선 = 평균 · 흰선 = 시장가 · 대표배수는 각 방법 과거 중앙값" : "Band = min–max fair across methods · blue = average · white = price"}</div>
      <div className={"gap-verdict gv-" + tv} style={{ marginTop: 12 }}>
        <Lic name="info" size={17} cls="icon-sm" color="currentColor" />
        <div><div className="gap-verdict-lab">{ko ? "참고용 · 여러 방법 평균 기준" : "Reference · multi-method average"}</div><div className="gap-verdict-msg">{ko ? `현재 시장가 ${money(price)}는 방법 평균 적정가 ${money(fairNow)} 대비 ${upNow >= 0 ? "+" : ""}${upNow.toFixed(0)}% — ${word}. 방법별 적정가는 ${money(cur.lo)}~${money(cur.hi)}에 걸쳐 있어요.` : `Price ${money(price)} is ${upNow >= 0 ? "+" : ""}${upNow.toFixed(0)}% vs the ${money(fairNow)} multi-method average.`}</div></div>
      </div>
    </div>
  );
}
