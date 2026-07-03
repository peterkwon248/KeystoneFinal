// source/DetailView.jsx FinancialsTab(1436~1729) + 의존 헬퍼 Waterfall/FinChartBuilder + LensPicker 이식.
// 손익계산서/재무상태표/현금흐름표(K-IFRS·US-GAAP) — 카드/표/구성/차트 4모드 + 관점(렌즈) 하이라이트.
// 데이터: plan.fin 대신 props로 받은 fin(page.tsx가 DB 우선·시드 폴백으로 계산 — lib/fin-mapper).
// SVG/차트 계산/className은 프로토타입 그대로. JSX→TSX 변환(React.useState→named, style={null}→undefined).
"use client";
import { Fragment, useEffect, useState, type CSSProperties } from "react";
import type { Fin, FinYearBS, FinYearCF, FinYearIS, I18nDict, Lang } from "@keystone/core/types";
import { STRATEGIES } from "@keystone/core/reference";
import { toDispCur } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import { MiniDropdown, type MdItem } from "./mini-dropdown";
import type { UIPlan } from "@/lib/plan-mapper";

// STRATEGIES 항목 + 프로토타입이 옵션으로 참조하는 hiliteLines 슬롯(현 스키마엔 없음 — API 연동 시 채워짐).
type Lens = (typeof STRATEGIES)[number] & { hiliteLines?: string[] };

/* ---- 관점(밸류에이션 렌즈) 픽커 — source/DetailView.jsx LensPicker(3080~) ---- */
function LensPicker({ value, onPick, lang, width = 200 }: {
  value: string; onPick: (v: string | null | undefined) => void; lang: Lang; width?: number;
}) {
  const ko = lang === "ko";
  const fws = STRATEGIES.filter((s) => s.model);
  const isNone = !value || value === "none";
  const cur = isNone ? null : fws.find((s) => s.id === value);
  const noneLabel = ko ? "관점 없음" : "No lens";
  const items: MdItem[] = [
    { value: "none", label: noneLabel, icon: <Lic name="circle-off" size={13} cls="icon-sm" color="var(--fg-4)" />, on: isNone } as MdItem,
    ...fws.map((s): MdItem => ({ value: s.id, label: s.name[lang], icon: <span className="strat-dot" style={{ background: s.color }} />, on: !isNone && value === s.id })),
  ];
  const trigger = cur
    ? <span className="fin-lens-chip pick" style={{ color: cur.color, background: "color-mix(in srgb, " + cur.color + " 13%, transparent)" }}><span className="strat-dot" style={{ background: cur.color }} />{cur.name[lang]}<Lic name="chevron-down" size={11} cls="icon-sm" color={cur.color} /></span>
    : <span className="fin-lens-chip pick" style={{ color: "var(--fg-3)", background: "var(--bg-elevated-2)" }}><Lic name="circle-off" size={12} cls="icon-sm" color="var(--fg-4)" />{noneLabel}<Lic name="chevron-down" size={11} cls="icon-sm" color="var(--fg-4)" /></span>;
  return <MiniDropdown width={width} align="left" lang={lang} trigger={trigger} items={items} onPick={onPick} />;
}

/* ---- 손익 워터폴 — 매출에서 순이익까지 돈이 어디서 새는지 (source 1298~1333) ---- */
interface WfStep { label: string; val: number; total?: boolean; pct?: string | null; from?: number; to?: number; }
export function Waterfall({ steps, cur, lang }: { steps: WfStep[]; cur: string; lang: Lang }) {
  const fv = (v: number) => fmtCompactAbs(v, cur);
  // 누적 위치 계산
  let run = 0; const segs: WfStep[] = [];
  steps.forEach((s) => {
    if (s.total) { segs.push({ ...s, from: 0, to: s.val, total: true }); run = s.val; }
    else { const from = run; run += s.val; segs.push({ ...s, from, to: run }); }
  });
  const max = Math.max(...segs.map((s) => Math.max(s.from!, s.to!))) * 1.04;
  const W = 760, H = 250, PADX = 8, TOP = 16, BOT = 42, n = segs.length;
  const gap = 14, bw = (W - 2 * PADX - gap * (n - 1)) / n;
  const y = (v: number) => TOP + (H - TOP - BOT) * (1 - v / (max || 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 0.5, 1].map((f, i) => <line key={i} x1={PADX} x2={W - PADX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
      {segs.map((s, i) => {
        const x = PADX + i * (bw + gap);
        const yTop = y(Math.max(s.from!, s.to!)), yBot = y(Math.min(s.from!, s.to!));
        const h = Math.max(2, yBot - yTop);
        const color = s.total ? "var(--accent)" : s.val >= 0 ? "color-mix(in srgb, var(--pos) 70%, transparent)" : "color-mix(in srgb, var(--neg) 70%, transparent)";
        return (
          <g key={i} className="wf-col">
            {i < n - 1 && <line x1={x} x2={x + bw + gap} y1={y(s.to!)} y2={y(s.to!)} stroke="var(--border-strong)" strokeDasharray="2 2" />}
            <rect x={x} y={yTop} width={bw} height={h} rx="2" fill={color} />
            <text x={x + bw / 2} y={yTop - 5} textAnchor="middle" style={{ fill: "var(--fg-2)", font: "var(--fw-semi) 10px var(--font-mono)" }}>{(s.val >= 0 || s.total ? "" : "−") + fv(s.val)}</text>
            <text x={x + bw / 2} y={H - BOT + 15} textAnchor="middle" style={{ fill: "var(--fg-3)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{s.label}</text>
            {s.pct != null && <text x={x + bw / 2} y={H - BOT + 28} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 9px var(--font-mono)" }}>{s.pct}</text>}
          </g>
        );
      })}
    </svg>
  );
}
// Waterfall 내부 헬퍼(프로토타입 fmtCompact(Math.abs(v)) 인라인) — 절대값 compact.
function fmtCompactAbs(v: number, cur: string): string { const d = toDispCur(Math.abs(v), cur); const usd = d.cur === "USD"; const x = d.v / (usd ? 1e9 : 1e12); return (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1)) + (usd ? "B" : "조"); }

/* ---- 커스텀 재무 차트 빌더 — 항목을 골라 한 차트에서 비교 (source 1334~1434) ---- */
type SrcDef = [string, string, string, (r: FinYearIS & FinYearBS & FinYearCF) => number, string];
function FinChartBuilder({ fin, lang, fv, stmt }: {
  fin: Fin; lang: Lang; fv: (v: number | null) => string; stmt: string;
}) {
  const ko = lang === "ko";
  const SRC0: SrcDef[] = [
    ["rev", ko ? "매출액" : "Revenue", "is", (r) => r.rev, "var(--accent)"],
    ["op", ko ? "영업이익" : "Op. income", "is", (r) => r.op, "#4CB782"],
    ["net", ko ? "순이익" : "Net income", "is", (r) => r.net, "#4C8DFF"],
    ["gross", ko ? "매출총이익" : "Gross profit", "is", (r) => r.gross, "#BB6BD9"],
    ["cogs", ko ? "매출원가" : "COGS", "is", (r) => r.cogs, "var(--neg)"],
    ["sga", ko ? "판관비" : "SG&A", "is", (r) => r.sga, "#F2994A"],
    ["tax", ko ? "법인세" : "Tax", "is", (r) => r.tax, "#8A8F98"],
    ["assets", ko ? "자산총계" : "Assets", "bs", (r) => r.assets, "#F2994A"],
    ["curAssets", ko ? "유동자산" : "Current assets", "bs", (r) => r.curAssets, "var(--accent)"],
    ["nonCurAssets", ko ? "비유동자산" : "Non-cur. assets", "bs", (r) => r.nonCurAssets, "#4CB782"],
    ["liab", ko ? "부채총계" : "Liabilities", "bs", (r) => r.liab, "var(--neg)"],
    ["curLiab", ko ? "유동부채" : "Current liab.", "bs", (r) => r.curLiab, "#E0A93E"],
    ["nonCurLiab", ko ? "비유동부채" : "Non-cur. liab.", "bs", (r) => r.nonCurLiab, "#BB6BD9"],
    ["equity", ko ? "자본총계" : "Equity", "bs", (r) => r.equity, "#2D9CDB"],
    ["ocf", ko ? "영업CF" : "Operating CF", "cf", (r) => r.ocf, "#4CB782"],
    ["icf", ko ? "투자CF" : "Investing CF", "cf", (r) => r.icf, "var(--neg)"],
    ["fcf_fin", ko ? "재무CF" : "Financing CF", "cf", (r) => r.fcf_fin, "#2D9CDB"],
    ["fcf", ko ? "FCF" : "Free cash flow", "cf", (r) => r.fcf, "#9B6BD9"],
    ["da", ko ? "감가상각" : "D&A", "cf", (r) => r.da, "#F2994A"],
    ["capex", ko ? "CAPEX" : "Capex", "cf", (r) => Math.abs(r.capex), "#E0A93E"],
  ];
  const SRC = (stmt && stmt !== "all") ? SRC0.filter((s) => s[2] === stmt) : SRC0;
  const DEFAULTS: Record<string, string[]> = { is: ["rev", "op", "net"], bs: ["assets", "liab", "equity"], cf: ["ocf", "fcf", "capex"], all: ["rev", "op", "net"] };
  const [sel, setSel] = useState<string[]>(DEFAULTS[stmt || "all"] || ["rev", "op", "net"]);
  const [kind, setKind] = useState<"line" | "bar">("line");
  const [basis, setBasis] = useState<"abs" | "pctRev" | "index" | "yoy">("abs");
  const rows = (src: string) => (src === "is" ? fin.is : src === "bs" ? fin.bs : fin.cf) as (FinYearIS & FinYearBS & FinYearCF)[];
  const years = fin.is.map((r) => r.y);
  const canPctRev = (stmt === "is");
  const effBasis = (basis === "pctRev" && !canPctRev) ? "abs" : basis;
  const transform = (rawVals: number[]): (number | null)[] => {
    if (effBasis === "pctRev") return rawVals.map((v, i) => v / (fin.is[i].rev || 1) * 100);
    if (effBasis === "index") { const base = rawVals[0] || 1; return rawVals.map((v) => v / base * 100); }
    if (effBasis === "yoy") return rawVals.map((v, i) => i === 0 ? null : (v - rawVals[i - 1]) / Math.abs(rawVals[i - 1] || 1) * 100);
    return rawVals;
  };
  const isPctish = effBasis !== "abs";
  const series = sel.map((k) => SRC.find((s) => s[0] === k)).filter((s): s is SrcDef => Boolean(s)).map((d) => { const raw = rows(d[2]).map(d[3]); return { k: d[0], lab: d[1], color: d[4], raw, vals: transform(raw) }; });
  const all = series.flatMap((s) => s.vals).filter((v): v is number => v != null);
  const max = Math.max(...all, isPctish ? 0 : 1), min = Math.min(...all, 0);
  const W = 760, H = 220, PX = 12, TOP = 14, BOT = 28, n = years.length;
  const x = (i: number) => PX + (W - 2 * PX) * i / (n - 1 || 1);
  const y = (v: number) => TOP + (H - TOP - BOT) * (1 - (v - min) / ((max - min) || 1));
  const toggle = (k: string) => setSel((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);
  const [hov, setHov] = useState<number | null>(null);
  return (
    <div className="fcb">
      <div className="fcb-bar">
        <span className="fcb-lab">{ko ? "비교 항목" : "Compare"}</span>
        {SRC.map((d) => <span key={d[0]} className={"fcb-chip" + (sel.includes(d[0]) ? " on" : "")} onClick={() => toggle(d[0])} style={sel.includes(d[0]) ? { borderColor: d[4], color: d[4] } : undefined}><span className="fcb-dot" style={{ background: d[4] }} />{d[1]}</span>)}
      </div>
      <div className="fcb-controls">
        <div className="fcb-ctl">
          <span className="fcb-lab">{ko ? "유형" : "Type"}</span>
          <div className="seg-toggle fcb-kind">
            <div className={"st" + (kind === "line" ? " active" : "")} onClick={() => setKind("line")}>{ko ? "선" : "Line"}</div>
            <div className={"st" + (kind === "bar" ? " active" : "")} onClick={() => setKind("bar")}>{ko ? "막대" : "Bar"}</div>
          </div>
        </div>
        <div className="fcb-ctl">
          <span className="fcb-lab">{ko ? "기준" : "Basis"}</span>
          <div className="seg-toggle">
            <div className={"st" + (basis === "abs" ? " active" : "")} onClick={() => setBasis("abs")}>{ko ? "금액" : "Amount"}</div>
            {canPctRev && <div className={"st" + (basis === "pctRev" ? " active" : "")} onClick={() => setBasis("pctRev")}>{ko ? "매출 대비" : "% rev"}</div>}
            <div className={"st" + (basis === "index" ? " active" : "")} onClick={() => setBasis("index")}>{ko ? "지수" : "Index"}</div>
            <div className={"st" + (basis === "yoy" ? " active" : "")} onClick={() => setBasis("yoy")}>{ko ? "전년 대비" : "YoY"}</div>
          </div>
        </div>
      </div>
      {series.length ? (
        <div className="fcb-wrap" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {[0, 0.5, 1].map((f, i) => <line key={i} x1={PX} x2={W - PX} y1={TOP + (H - TOP - BOT) * f} y2={TOP + (H - TOP - BOT) * f} stroke="var(--border)" />)}
          {hov != null && <line x1={x(hov)} x2={x(hov)} y1={TOP} y2={H - BOT} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {kind === "line" ? series.map((s) => (
            <g key={s.k}>
              <path d={s.vals.map((v, i) => v == null ? null : `${s.vals.slice(0, i).every((x) => x == null) ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).filter(Boolean).join(" ")} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {s.vals.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={hov === i ? 4 : 2.5} fill={s.color} />)}
            </g>
          )) : years.map((yr, i) => {
            const slotW = (W - 2 * PX) / n, groupW = slotW * 0.62, bw = groupW / series.length;
            const gx = PX + slotW * i + (slotW - groupW) / 2;
            return <g key={i}>{series.map((s, si) => { const v = s.vals[i]; if (v == null) return null; const yy = y(v), zero = y(0); return <rect key={si} x={gx + si * bw} y={Math.min(yy, zero)} width={bw * 0.82} height={Math.abs(zero - yy) || 1} rx="1.5" fill={s.color} opacity={hov == null || hov === i ? 1 : 0.45} />; })}</g>;
          })}
          {years.map((yr, i) => { const slotW = (W - 2 * PX) / n; const cx = kind === "bar" ? PX + slotW * (i + 0.5) : x(i); return <rect key={"hz" + i} x={cx - slotW / 2} y={TOP} width={slotW} height={H - TOP - BOT} fill="transparent" style={{ pointerEvents: "all" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov((h) => h === i ? null : h)} />; })}
          {years.map((yr, i) => { const slotW = (W - 2 * PX) / n; const cx = kind === "bar" ? PX + slotW * (i + 0.5) : x(i); return <text key={i} x={cx} y={H - 9} textAnchor="middle" style={{ fill: "var(--fg-4)", font: "var(--fw-medium) 10px var(--font-sans)" }}>{yr}</text>; })}
        </svg>
        {hov != null && <div className="fcb-tip" style={{ left: (x(hov) / W * 100) + "%" }}>
          <div className="fcb-tip-yr">{years[hov]}</div>
          {series.map((s) => <div className="fcb-tip-row" key={s.k}><span className="fcb-tip-dot" style={{ background: s.color }} /><span className="fcb-tip-lab">{s.lab}</span><span className="fcb-tip-val mono">{s.vals[hov] == null ? "—" : isPctish ? (effBasis === "index" ? s.vals[hov]!.toFixed(0) : (s.vals[hov]! >= 0 && effBasis === "yoy" ? "+" : "") + s.vals[hov]!.toFixed(1) + "%") : fv(s.vals[hov])}</span></div>)}
        </div>}
        </div>
      ) : <div className="empty-tab">{ko ? "항목을 1개 이상 선택하세요" : "Pick at least one"}</div>}
    </div>
  );
}

/* ---- 재무 탭 — 손익계산서/재무상태표/현금흐름표 (K-IFRS 연결) (source 1436~1729) ---- */
interface Spec { k: string; label: string; g: (r: FinYearIS & FinYearBS & FinYearCF) => number; bold?: boolean; sub?: boolean; accent?: boolean; }
export function FinancialsTab({ plan, fin, t: _t, lang }: {
  plan: UIPlan; fin: Fin | null; t: I18nDict; lang: Lang;
}) {
  const [fwSel, setFwSel] = useState<string | null>(null);
  const _fwIdF = fwSel === "none" ? null : (fwSel || plan.strategyId);
  const fwObj = (STRATEGIES.find((s) => s.id === _fwIdF) || {}) as Partial<Lens>;
  const fwModel2 = fwObj.model;
  const fwColor = fwObj.color || "var(--accent)";
  const FW_HILITE: Record<string, string[]> = { PER: ["op", "net", "gross"], DCF: ["rev", "fcf", "op"], PBR: ["equity", "assets", "net"], DDM: ["fcf", "net", "ocf"], EV: ["op", "fcf", "liab"], PSR: ["rev", "gross", "op"] };
  // hiliteLines 슬롯이 채워져 있으면 직접 지정(B), 없으면 모델 자동 매핑. (API 연동 시 B 편집 UI만 붙이면 됨)
  const fwHiliteLines = (fwObj.hiliteLines && fwObj.hiliteLines.length) ? fwObj.hiliteLines : (fwModel2 ? FW_HILITE[fwModel2] || null : null);
  const FW_WHY: Record<string, string> = { PER: lang === "ko" ? "이익의 크기와 질이 PER 평가의 근거라, 영업이익·순이익·마진을 핵심으로 봅니다." : "Earnings size & quality drive P/E.", DCF: lang === "ko" ? "미래 현금흐름 할인이 핵심이라, 매출 성장과 잉여현금(FCF) 창출력을 봅니다." : "Future cash flows drive DCF.", PBR: lang === "ko" ? "순자산 대비 가치가 기준이라, 자본·자산 규모와 이익을 봅니다." : "Net assets drive P/B.", DDM: lang === "ko" ? "배당 지속성이 핵심이라, 배당 재원인 FCF·영업현금·순이익을 봅니다." : "Dividend sustainability drives DDM.", EV: lang === "ko" ? "정상화 영업이익과 부채(순부채)가 EV 평가를 좌우합니다." : "Normalized EBIT & net debt drive EV.", PSR: lang === "ko" ? "적자·고성장 단계라 매출 규모·성장과 마진 잠재력을 봅니다." : "Revenue scale drives P/S." };
  const KEY_WHY: Record<string, string> = lang === "ko" ? { rev: "성장의 출발점", gross: "원가 경쟁력·가격결정력", op: "본업의 수익성", net: "최종 이익·EPS의 원천", assets: "사업 규모", liab: "부채 부담·안정성", equity: "순자산(청산) 가치", ocf: "실제 현금 창출력", fcf: "배당·재투자 재원" } : {};
  const hiSet = new Set<string>(fwHiliteLines || []);
  const [stmt, setStmt] = useState("all");
  const [fmode, setFmode] = useState("table");
  const [barHov, setBarHov] = useState<number | null>(null);
  useEffect(() => { if (!(fwHiliteLines && fwHiliteLines.length)) setStmt((s) => s === "focus" ? "all" : s); }, [_fwIdF]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!fin) return <div className="empty-tab">{lang === "ko" ? "재무 데이터 없음" : "No financials"}</div>;
  const ko = lang === "ko";
  const isUs = plan.cur === "USD";
  const dispCur = toDispCur(1, plan.cur).cur;
  const unitLab = dispCur === "USD" ? "B" : "조";
  const fv = (v: number | null): string => { if (v == null) return "—"; const d = toDispCur(v, plan.cur); const div = dispCur === "USD" ? 1e9 : 1e12; const x = d.v / div; const s = (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1)); return (x < 0 ? "(" + s.replace("-", "") + ")" : s) + unitLab; };
  const years = fin.is.map((r) => r.y);
  const SUBTABS: [string, string][] = [["all", ko ? "전체" : "All"], ["is", ko ? "손익계산서" : "Income"], ["bs", ko ? "재무상태표" : "Balance sheet"], ["cf", ko ? "현금흐름표" : "Cash flow"]];
  // 행 정의: {label, get, bold?, sub?(들여쓰기), pct?(매출대비)}
  const FIN_DEF: Record<string, { def: string; f: string; dir: string }> = (() => { const D: Record<string, { ko: [string, string]; en: [string, string] }> = {
    rev: { ko: ["기업이 제품·서비스를 팔아 벌어들인 총액이에요.", "수량 × 단가"], en: ["Total earned from selling goods/services.", "units × price"] },
    cogs: { ko: ["판매된 제품을 만드는 데 직접 든 원가예요(재료·인건비 등).", "매출 − 매출총이익"], en: ["Direct cost of goods sold (materials, labor).", "Revenue − Gross profit"] },
    gross: { ko: ["매출에서 원가를 뺀 1차 이익이에요. 제품 경쟁력·가격결정력을 보여줘요.", "매출 − 매출원가"], en: ["First-line profit after COGS — pricing power.", "Revenue − COGS"] },
    rnd: { ko: ["미래 제품·기술에 투자한 연구개발 비용이에요.", ""], en: ["Spend on future products and technology.", ""] },
    sga: { ko: ["판매·관리에 쓴 비용이에요(마케팅·임직원 등).", ""], en: ["Selling, general & admin overhead.", ""] },
    op: { ko: ["본업으로 번 이익이에요. 영업외 요소를 뺀 핵심 수익성이에요.", "매출총이익 − 판관비"], en: ["Profit from core operations.", "Gross − operating expenses"] },
    nonop: { ko: ["본업 외 손익이에요(이자·외환·지분법 등).", ""], en: ["Non-operating items (interest, FX).", ""] },
    pretax: { ko: ["세금을 내기 전 이익이에요.", "영업이익 ± 영업외손익"], en: ["Profit before income tax.", "Operating ± non-op"] },
    tax: { ko: ["법인세 비용이에요.", ""], en: ["Provision for income taxes.", ""] },
    net: { ko: ["모든 비용·세금을 뺀 최종 이익이에요. EPS·배당의 원천이에요.", "세전이익 − 법인세"], en: ["Bottom-line profit — source of EPS & dividends.", "Pretax − tax"] },
    curAssets: { ko: ["1년 안에 현금으로 바꿀 수 있는 자산이에요(현금·재고·매출채권).", ""], en: ["Assets convertible to cash within a year.", ""] },
    nonCurAssets: { ko: ["오래 보유하는 자산이에요(설비·토지·무형자산).", ""], en: ["Long-term assets (PP&E, intangibles).", ""] },
    assets: { ko: ["기업이 가진 모든 자산을 합한 거예요.", "부채 + 자본"], en: ["Everything the company owns.", "Liabilities + Equity"] },
    curLiab: { ko: ["1년 안에 갚아야 할 빚이에요(매입채무·단기차입).", ""], en: ["Debts due within a year.", ""] },
    nonCurLiab: { ko: ["1년 뒤에 갚는 장기 부채예요(회사채·장기차입).", ""], en: ["Long-term debt due beyond a year.", ""] },
    liab: { ko: ["기업이 갚아야 할 모든 빚을 합한 거예요.", "유동부채 + 비유동부채"], en: ["Everything the company owes.", "Current + long-term"] },
    equity: { ko: ["자산에서 부채를 뺀 주주 몫이에요. 순자산이에요.", "자산 − 부채"], en: ["Shareholders' stake — net worth.", "Assets − Liabilities"] },
    ocf: { ko: ["본업에서 실제로 들어온 현금이에요. 이익의 질을 보여줘요.", "순이익 + 감가상각 ± 운전자본"], en: ["Cash actually generated by operations.", "Net + D&A ± WC"] },
    da: { ko: ["설비·무형자산의 가치 감소분이에요(현금이 빠져나가지 않는 비용).", ""], en: ["Non-cash value decline of assets.", ""] },
    icf: { ko: ["투자로 오간 현금이에요(설비·지분 매입/매각).", ""], en: ["Cash from investing activities.", ""] },
    capex: { ko: ["설비·시설에 투자한 지출이에요. 미래 성장을 위한 비용이에요.", ""], en: ["Spend on property & equipment.", ""] },
    fcf_fin: { ko: ["차입·상환·배당·증자로 오간 현금이에요.", ""], en: ["Cash from financing activities.", ""] },
    fcf: { ko: ["영업현금에서 설비투자를 뺀 진짜 자유현금이에요. 배당·자사주 재원이에요.", "영업CF − CAPEX"], en: ["True free cash after capex.", "OCF − Capex"] },
  }; const DIR: Record<string, number> = { rev: 1, cogs: -1, gross: 1, rnd: 0, sga: -1, op: 1, nonop: 0, pretax: 1, tax: -1, net: 1, curAssets: 1, nonCurAssets: 0, assets: 1, curLiab: -1, nonCurLiab: -1, liab: -1, equity: 1, ocf: 1, da: 0, icf: 0, capex: 0, fcf_fin: 0, fcf: 1 }; const o: Record<string, { def: string; f: string; dir: string }> = {}; for (const k in D) o[k] = { def: D[k][ko ? "ko" : "en"][0], f: D[k][ko ? "ko" : "en"][1], dir: DIR[k] === 1 ? (ko ? "높을수록 좋아요" : "Higher is better") : DIR[k] === -1 ? (ko ? "낮을수록 좋아요" : "Lower is better") : "" }; return o; })();
  const SPECS: Record<string, Spec[]> = {
    is: isUs ? [
      { k: "rev", label: ko ? "매출액" : "Net sales", g: (r) => r.rev, bold: true },
      { k: "cogs", label: ko ? "매출원가" : "Cost of revenue", g: (r) => -r.cogs, sub: true },
      { k: "gross", label: ko ? "매출총이익" : "Gross profit", g: (r) => r.gross, bold: true },
      { k: "rnd", label: ko ? "연구개발비" : "Research & development", g: (r) => -r.sga * 0.42, sub: true },
      { k: "sga", label: ko ? "판매·일반관리비" : "Selling, general & admin", g: (r) => -r.sga * 0.58, sub: true },
      { k: "op", label: ko ? "영업이익" : "Operating income", g: (r) => r.op, bold: true, accent: true },
      { k: "nonop", label: ko ? "기타수익·비용" : "Other income (expense), net", g: (r) => r.nonOp, sub: true },
      { k: "pretax", label: ko ? "법인세비용차감전순이익" : "Income before income taxes", g: (r) => r.pretax },
      { k: "tax", label: ko ? "법인세비용" : "Provision for income taxes", g: (r) => -r.tax, sub: true },
      { k: "net", label: ko ? "당기순이익" : "Net income", g: (r) => r.net, bold: true, accent: true },
    ] : [
      { k: "rev", label: ko ? "매출액" : "Revenue", g: (r) => r.rev, bold: true },
      { k: "cogs", label: ko ? "매출원가" : "Cost of sales", g: (r) => -r.cogs, sub: true },
      { k: "gross", label: ko ? "매출총이익" : "Gross profit", g: (r) => r.gross, bold: true },
      { k: "sga", label: ko ? "판매관리비" : "SG&A", g: (r) => -r.sga, sub: true },
      { k: "op", label: ko ? "영업이익" : "Operating income", g: (r) => r.op, bold: true, accent: true },
      { k: "nonop", label: ko ? "영업외손익" : "Non-op. items", g: (r) => r.nonOp, sub: true },
      { k: "pretax", label: ko ? "법인세차감전순이익" : "Pretax income", g: (r) => r.pretax },
      { k: "tax", label: ko ? "법인세비용" : "Income tax", g: (r) => -r.tax, sub: true },
      { k: "net", label: ko ? "당기순이익" : "Net income", g: (r) => r.net, bold: true, accent: true },
    ],
    bs: isUs ? [
      { k: "curAssets", label: ko ? "유동자산" : "Total current assets", g: (r) => r.curAssets, sub: true },
      { k: "nonCurAssets", label: ko ? "비유동자산" : "Total non-current assets", g: (r) => r.nonCurAssets, sub: true },
      { k: "assets", label: ko ? "자산총계" : "Total assets", g: (r) => r.assets, bold: true, accent: true },
      { k: "curLiab", label: ko ? "유동부채" : "Total current liabilities", g: (r) => r.curLiab, sub: true },
      { k: "nonCurLiab", label: ko ? "비유동부채" : "Long-term liabilities", g: (r) => r.nonCurLiab, sub: true },
      { k: "liab", label: ko ? "부채총계" : "Total liabilities", g: (r) => r.liab, bold: true },
      { k: "equity", label: ko ? "자본총계" : "Total stockholders' equity", g: (r) => r.equity, bold: true, accent: true },
    ] : [
      { k: "curAssets", label: ko ? "유동자산" : "Current assets", g: (r) => r.curAssets, sub: true },
      { k: "nonCurAssets", label: ko ? "비유동자산" : "Non-current assets", g: (r) => r.nonCurAssets, sub: true },
      { k: "assets", label: ko ? "자산총계" : "Total assets", g: (r) => r.assets, bold: true, accent: true },
      { k: "curLiab", label: ko ? "유동부채" : "Current liabilities", g: (r) => r.curLiab, sub: true },
      { k: "nonCurLiab", label: ko ? "비유동부채" : "Non-current liabilities", g: (r) => r.nonCurLiab, sub: true },
      { k: "liab", label: ko ? "부채총계" : "Total liabilities", g: (r) => r.liab, bold: true },
      { k: "equity", label: ko ? "자본총계" : "Total equity", g: (r) => r.equity, bold: true, accent: true },
    ],
    cf: isUs ? [
      { k: "ocf", label: ko ? "영업활동 현금흐름" : "Cash from operating activities", g: (r) => r.ocf, bold: true, accent: true },
      { k: "da", label: ko ? "감가상각비" : "Depreciation & amortization", g: (r) => r.da, sub: true },
      { k: "icf", label: ko ? "투자활동 현금흐름" : "Cash used in investing activities", g: (r) => r.icf, bold: true },
      { k: "capex", label: ko ? "자본적지출(CAPEX)" : "Capital expenditures", g: (r) => r.capex, sub: true },
      { k: "fcf_fin", label: ko ? "재무활동 현금흐름" : "Cash from financing activities", g: (r) => r.fcf_fin, bold: true },
      { k: "fcf", label: ko ? "잉여현금흐름(FCF)" : "Free cash flow", g: (r) => r.fcf, bold: true, accent: true },
    ] : [
      { k: "ocf", label: ko ? "영업활동 현금흐름" : "Operating CF", g: (r) => r.ocf, bold: true, accent: true },
      { k: "da", label: ko ? "감가상각비" : "D&A", g: (r) => r.da, sub: true },
      { k: "icf", label: ko ? "투자활동 현금흐름" : "Investing CF", g: (r) => r.icf, bold: true },
      { k: "capex", label: ko ? "CAPEX" : "Capex", g: (r) => r.capex, sub: true },
      { k: "fcf_fin", label: ko ? "재무활동 현금흐름" : "Financing CF", g: (r) => r.fcf_fin, bold: true },
      { k: "fcf", label: ko ? "잉여현금흐름(FCF)" : "Free cash flow", g: (r) => r.fcf, bold: true, accent: true },
    ],
  };
  return (
    <div>
      <div className="fin-subbar">
        <div className="seg-toggle fin-subtabs">
          {SUBTABS.map(([k, lab]) => <div key={k} className={"st" + (stmt === k ? " active" : "")} onClick={() => setStmt(k)}>{k === "focus" && <span className="strat-dot" style={{ background: fwColor, width: 7, height: 7, marginRight: 5, display: "inline-block", verticalAlign: "middle" }} />}{lab}</div>)}
        </div>
        <LensPicker value={fwObj && fwObj.id ? fwObj.id : "none"} onPick={(v) => setFwSel(v ?? null)} lang={lang} width={200} />
        {fwObj.name && <span className="fin-term" style={{ marginLeft: 6 }}><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{fwObj.desc ? fwObj.desc[lang] : ""}</span><span className="fin-tip-def" style={{ color: "var(--fg-2)" }}>{(fwModel2 && FW_WHY[fwModel2]) || ""}</span><span className="fin-tip-f" style={{ color: fwColor }}>{ko ? "핵심 항목" : "Key lines"}: {((fwModel2 && FW_HILITE[fwModel2]) || []).map((kk) => (({ rev: "매출", gross: "매출총이익", op: "영업이익", net: "순이익", assets: "자산", liab: "부채", equity: "자본", ocf: "영업CF", fcf: "FCF" } as Record<string, string>)[kk] || kk)).join(" · ")}</span></span></span>}
        <span className="fcb-spacer" />
        <div className="seg-toggle modes">{([["cards", "layout-grid", ko ? "카드" : "Cards"], ["table", "table", ko ? "표" : "Table"], ["comp", "pie-chart", ko ? "구성" : "Composition"], ["chart", "trending-up", ko ? "차트" : "Chart"]] as [string, string, string][]).map(([k, ic, lab]) => <div key={k} className={"st mode-st" + (fmode === k ? " active" : "")} onClick={() => setFmode(k)} title={lab}><Lic name={ic} size={15} cls="icon-sm" color="currentColor" />{fmode === k && <span>{lab}</span>}</div>)}</div>
      </div>
      {(() => {
        const KLAB: Record<string, string> = { rev: ko ? "매출액" : "Revenue", gross: ko ? "매출총이익" : "Gross profit", op: ko ? "영업이익" : "Op. income", net: ko ? "순이익" : "Net income", assets: ko ? "자산총계" : "Assets", liab: ko ? "부채총계" : "Liabilities", equity: ko ? "자본총계" : "Equity", ocf: ko ? "영업CF" : "Operating CF", capex: ko ? "CAPEX" : "CapEx", fcf: ko ? "FCF" : "Free cash flow" };
        const KGET: Record<string, (r: FinYearIS & FinYearBS & FinYearCF) => number> = { rev: (r) => r.rev, gross: (r) => r.gross, op: (r) => r.op, net: (r) => r.net, assets: (r) => r.assets, liab: (r) => r.liab, equity: (r) => r.equity, ocf: (r) => r.ocf, capex: (r) => Math.abs(r.capex), fcf: (r) => r.fcf };
        const SRC: Record<string, "is" | "bs" | "cf"> = { rev: "is", gross: "is", op: "is", net: "is", assets: "bs", liab: "bs", equity: "bs", ocf: "cf", capex: "cf", fcf: "cf" };
        const lensOn = !!(fwHiliteLines && fwHiliteLines.length);
        const keys = (lensOn ? fwHiliteLines! : ["rev", "op", "net"]).filter((k) => KGET[k]);
        if (!keys.length) return null;
        const arrOf = (k: string) => (SRC[k] === "is" ? fin.is : SRC[k] === "bs" ? fin.bs : fin.cf) as (FinYearIS & FinYearBS & FinYearCF)[];
        if (stmt !== "all") { if (!lensOn) return null; return (
          <div className="lens-strip" style={{ "--fw-c": fwColor } as CSSProperties}>
            <span className="ls-title"><Lic name="scan-search" size={13} cls="icon-sm" color={fwColor} />{fwObj.name ? fwObj.name[lang] : (ko ? "관점" : "Lens")}</span>
            <span className="ls-sep" />
            {keys.map((k) => { const arr = arrOf(k); const lv = KGET[k](arr[arr.length - 1]), pv = KGET[k](arr[arr.length - 2]); const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; return <span className="ls-item" key={k}>{KLAB[k]} <b>{fv(lv)}</b>{yoy != null && <span className={"ls-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}%</span>}</span>; })}
          </div>
        ); }
        return (
          <div className="fin-keycards" style={{ "--fw-c": fwColor } as CSSProperties}>
            <div className="fin-keycards-cap"><Lic name="star" size={13} cls="icon-sm" color={fwColor} />{lensOn ? (fwObj.name ? (ko ? `${fwObj.name.ko} 핵심 항목` : `${fwObj.name.en} key lines`) : (ko ? "핵심 항목" : "Key lines")) : (ko ? "손익 헤드라인" : "Income highlights")}</div>
            <div className="fin-keycard-grid">
              {keys.map((k) => { const arr = arrOf(k); const lv = KGET[k](arr[arr.length - 1]), pv = KGET[k](arr[arr.length - 2]); const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; const _d = (FIN_DEF[k] && FIN_DEF[k].dir) || ""; const dir = /높을|Higher/.test(_d) ? 1 : /낮을|Lower/.test(_d) ? -1 : 0; const sy = yoy == null ? null : dir * yoy; const g = yoy == null || dir === 0 ? "neutral" : sy! >= 10 ? "good" : sy! >= 0 ? "mid" : "bad"; const gl: Record<string, string> = { good: ko ? "우수" : "Good", mid: ko ? "보통" : "Fair", bad: ko ? "주의" : "Watch", neutral: "—" }; return (
                <div className="fin-keycard" key={k}>
                  <div className="fin-keycard-top"><span className="fin-keycard-lab fin-term">{KLAB[k]}<span className="ind-q">?</span>{FIN_DEF[k] && <span className="fin-tip"><b>{KLAB[k]}</b><span className="fin-tip-def">{FIN_DEF[k].def}{FIN_DEF[k].dir && <span className="fin-tip-dir"> {FIN_DEF[k].dir}</span>}</span>{lensOn && KEY_WHY[k] && <span className="fin-tip-def" style={{ color: fwColor }}>{fwObj.name ? fwObj.name[lang] + " 관점 — " : ""}{KEY_WHY[k]}{KEY_WHY[k] ? "(이)라 핵심으로 봅니다." : ""}</span>}{FIN_DEF[k].f && <span className="fin-tip-f">{FIN_DEF[k].f}</span>}</span>}</span><span className={"ind-grade ind-" + g}><span className="ind-dot" />{gl[g]}</span></div>
                  <div className="fin-keycard-val">{fv(lv)}</div>
                  {yoy != null && <div className={"fin-keycard-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}% YoY</div>}
                </div>
              ); })}
            </div>
          </div>
        );
      })()}
      {fmode === "chart" && <FinChartBuilder fin={fin} lang={lang} fv={fv} stmt={stmt} />}
      {stmt !== "builder" && fmode === "cards" && (() => {
        const LB: Record<string, string> = { rev: ko ? "매출액" : "Revenue", op: ko ? "영업이익" : "Op. income", net: ko ? "순이익" : "Net income", assets: ko ? "자산총계" : "Assets", liab: ko ? "부채총계" : "Liabilities", equity: ko ? "자본총계" : "Equity", ocf: ko ? "영업CF" : "Operating CF", fcf: ko ? "FCF" : "Free cash flow" };
        const SRC2: Record<string, number[]> = { rev: fin.is.map((r) => r.rev), op: fin.is.map((r) => r.op), net: fin.is.map((r) => r.net), assets: fin.bs.map((r) => r.assets), liab: fin.bs.map((r) => r.liab), equity: fin.bs.map((r) => r.equity), ocf: fin.cf.map((r) => r.ocf), fcf: fin.cf.map((r) => r.fcf) };
        const byStmt: Record<string, string[]> = { all: Object.keys(LB), is: ["rev", "op", "net"], bs: ["assets", "liab", "equity"], cf: ["ocf", "fcf"] };
        const showKeys = byStmt[stmt] || Object.keys(LB);
        const spark = (arr: number[]) => { const v = arr.filter((x) => x != null && isFinite(x)); if (v.length < 2) return null; const mn = Math.min(...v), mx = Math.max(...v), sp = (mx - mn) || 1; const pts = arr.map((x, i) => `${(i / (arr.length - 1) * 72).toFixed(1)},${(18 - (x - mn) / sp * 16 - 1).toFixed(1)}`).join(" "); const up = arr[arr.length - 1] >= arr[0]; return <svg width="72" height="18" style={{ display: "block" }}><polyline points={pts} fill="none" stroke={up ? "var(--pos)" : "var(--neg)"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>; };
        return (
          <div className="fin-sumcards">
            {showKeys.map((k) => { const arr = SRC2[k]; const lv = arr[arr.length - 1], pv = arr[arr.length - 2]; const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null; const d = FIN_DEF[k]; return (
              <div className="fin-sumcard" key={k}>
                <div className="fin-sumcard-top"><span className="fin-sumcard-lab fin-term">{LB[k]}{d && <>{" "}<span className="ind-q">?</span><span className="fin-tip"><b>{LB[k]}</b><span className="fin-tip-def">{d.def}{d.dir && <span className="fin-tip-dir"> {d.dir}</span>}</span>{d.f && <span className="fin-tip-f">{d.f}</span>}</span></>}</span>{yoy != null && <span className={"fin-sumcard-yoy " + (yoy >= 0 ? "pos" : "neg")}>{(yoy >= 0 ? "+" : "") + yoy.toFixed(0)}%</span>}</div>
                <div className="fin-sumcard-val">{fv(lv)}</div>
                <div className="fin-sumcard-spark">{spark(arr)}<span className="fin-sumcard-yrs">{fin.is[0].y}–{fin.is[fin.is.length - 1].y}</span></div>
              </div>
            ); })}
          </div>
        );
      })()}
      {stmt !== "builder" && fmode === "table" && (() => {
        const COL: Record<string, string> = { soft: "color-mix(in srgb, var(--accent) 26%, transparent)", accent: "var(--accent)", pos: "var(--pos)", neg: "var(--neg)" };
        type BarDef = [string, string, string];
        interface Foot { v?: number; txt?: string; lab: string; pos?: boolean; }
        interface Cfg { rows: Record<string, number | string>[]; bars: BarDef[]; foot: ((r: Record<string, number | string>) => Foot) | null; }
        const SERIES: Record<string, Cfg> = {
          is: { rows: fin.is as unknown as Record<string, number | string>[], bars: [["rev", ko ? "매출액" : "Revenue", "soft"], ["op", ko ? "영업이익" : "Op. income", "accent"], ["net", ko ? "순이익" : "Net income", "pos"]], foot: (r) => ({ v: (r.opm as number), lab: ko ? "영업이익률" : "Op. margin" }) },
          all: { rows: fin.is as unknown as Record<string, number | string>[], bars: [["rev", ko ? "매출액" : "Revenue", "soft"], ["op", ko ? "영업이익" : "Op. income", "accent"], ["net", ko ? "순이익" : "Net income", "pos"]], foot: (r) => ({ v: (r.net as number) / (r.rev as number) * 100, lab: ko ? "순이익률" : "Net margin" }) },
          bs: { rows: fin.bs as unknown as Record<string, number | string>[], bars: [["assets", ko ? "자산" : "Assets", "soft"], ["liab", ko ? "부채" : "Liab.", "neg"], ["equity", ko ? "자본" : "Equity", "accent"]], foot: (r) => ({ v: (r.liab as number) / (r.equity as number) * 100, lab: ko ? "부채비율" : "Debt ratio" }) },
          cf: { rows: fin.cf as unknown as Record<string, number | string>[], bars: [["ocf", ko ? "영업CF" : "Operating", "accent"], ["icf", ko ? "투자CF" : "Investing", "neg"], ["fcf_fin", ko ? "재무CF" : "Financing", "soft"]], foot: (r) => ({ txt: fv(r.fcf as number), lab: ko ? "FCF" : "FCF", pos: (r.fcf as number) >= 0 }) },
        };
        const colOf = (c: string) => COL[c] || c;
        let cfg: Cfg | undefined = SERIES[stmt];
        if (stmt === "focus") {
          const FLAB: Record<string, string> = { rev: ko ? "매출액" : "Revenue", gross: ko ? "매출총이익" : "Gross", op: ko ? "영업이익" : "Op.", net: ko ? "순이익" : "Net", assets: ko ? "자산" : "Assets", liab: ko ? "부채" : "Liab.", equity: ko ? "자본" : "Equity", ocf: ko ? "영업CF" : "OCF", fcf: "FCF", capex: ko ? "CAPEX" : "CapEx" };
          const FSRC: Record<string, "is" | "bs" | "cf"> = { rev: "is", gross: "is", op: "is", net: "is", assets: "bs", liab: "bs", equity: "bs", ocf: "cf", capex: "cf", fcf: "cf" };
          const FGET: Record<string, (r: FinYearIS & FinYearBS & FinYearCF) => number> = { rev: (r) => r.rev, gross: (r) => r.gross, op: (r) => r.op, net: (r) => r.net, assets: (r) => r.assets, liab: (r) => r.liab, equity: (r) => r.equity, ocf: (r) => r.ocf, capex: (r) => Math.abs(r.capex), fcf: (r) => r.fcf };
          const finOf = (s: "is" | "bs" | "cf") => (s === "is" ? fin.is : s === "bs" ? fin.bs : fin.cf) as (FinYearIS & FinYearBS & FinYearCF)[];
          const flines = (fwHiliteLines || []).filter((k) => FGET[k] && finOf(FSRC[k]) && finOf(FSRC[k]).length);
          const fcolors = ["var(--accent)", "#4CB782", "#F2994A", "#BB6BD9", "#E0A93E"];
          const frows = years.map((y, i) => { const o: Record<string, number | string> = { y }; flines.forEach((k) => { const a = finOf(FSRC[k]); o[k] = (a && a[i]) ? FGET[k](a[i]) : (null as unknown as number); }); return o; });
          cfg = { rows: frows, bars: flines.map((k, i): BarDef => [k, FLAB[k] || k, fcolors[i % fcolors.length]]), foot: null };
        }
        if (!cfg) return null;
        const maxV = Math.max(...cfg.rows.flatMap((r) => cfg!.bars.map((b) => Math.abs(r[b[0]] as number))), 1);
        return (
          <div className="fin-chart">
            <div className="fin-legend">
              {cfg.bars.map((b) => <span className="fin-leg" key={b[0]}><span className="fin-leg-sw" style={{ background: colOf(b[2]) }} />{b[1]}</span>)}
              {cfg.foot && <span className="fin-leg"><span className="fin-leg-sw fin-leg-line" />{cfg.foot(cfg.rows[0]).lab}</span>}
            </div>
            <div className="fin-bars">
              {cfg.rows.map((r, i) => {
                const ft = cfg!.foot && cfg!.foot(r);
                return (
                  <div className={"fin-barcol" + (barHov === i ? " hov" : "")} key={i} onMouseEnter={() => setBarHov(i)} onMouseLeave={() => setBarHov((h) => h === i ? null : h)}>
                    <div className="fin-barwrap">
                      {cfg!.bars.map((b) => {
                        const val = r[b[0]] as number;
                        return <div className="fin-bar" key={b[0]} style={{ height: Math.max(2, Math.abs(val) / maxV * 100) + "%", background: colOf(b[2]), width: 13 }} />;
                      })}
                    </div>
                    <div className="fin-barlab">{r.y}</div>
                    {ft && <div className={"fin-baropm " + ((ft.txt ? ft.pos : ft.v! >= 0) ? "pos" : "neg")}>{ft.txt != null ? ft.txt : ft.v!.toFixed(0) + "%"}</div>}
                    {barHov === i && (() => { const prev = i > 0 ? cfg!.rows[i - 1] : null; const yoyOf = (key: string) => { if (!prev) return null; const c = r[key] as number, p = prev[key] as number; if (p == null || p === 0) return null; return (c - p) / Math.abs(p) * 100; }; return (
                    <div className="fin-barpop">
                      <div className="fin-barpop-yr">{r.y}</div>
                      {cfg!.bars.map((b) => { const y = yoyOf(b[0]); return <div className="fin-barpop-row" key={b[0]}><span className="fin-barpop-dot" style={{ background: colOf(b[2]) }} /><span className="fin-barpop-lab">{b[1]}</span><span className="fin-barpop-val mono">{fv(r[b[0]] as number)}</span><span className={"fin-barpop-yoy mono " + (y == null ? "" : y >= 0 ? "pos" : "neg")}>{y == null ? "—" : (y >= 0 ? "+" : "") + y.toFixed(0) + "%"}</span></div>; })}
                      {ft && (() => { const pf = (prev && cfg!.foot) ? cfg!.foot(prev) : null; const ppy = (ft.txt == null && pf && pf.v != null) ? (ft.v! - pf.v) : null; return (
                        <div className="fin-barpop-row fin-barpop-foot"><span className="fin-barpop-dot fin-barpop-line" /><span className="fin-barpop-lab">{ft.lab}</span><span className="fin-barpop-val mono">{ft.txt != null ? ft.txt : (ft.v! >= 0 ? "+" : "") + ft.v!.toFixed(1) + "%"}</span><span className={"fin-barpop-yoy mono " + (ppy == null ? "" : ppy >= 0 ? "pos" : "neg")}>{ppy == null ? "—" : (ppy >= 0 ? "+" : "") + ppy.toFixed(1) + "%p"}</span></div>
                      ); })()}
                    </div>
                    ); })()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {stmt !== "builder" && fmode === "comp" && (() => {
        type Part = [string, string, string, (r: FinYearIS & FinYearBS & FinYearCF) => number];
        interface Comp { rows: (FinYearIS & FinYearBS & FinYearCF)[]; parts: Part[]; total: (r: FinYearIS & FinYearBS & FinYearCF) => number; totLab: string; cap: string; }
        const COMP: Record<string, Comp> = {
          is: { rows: fin.is as (FinYearIS & FinYearBS & FinYearCF)[], parts: [["cogs", ko ? "매출원가" : "COGS", "var(--neg)", (r) => r.cogs], ["sga", ko ? "판관비" : "SG&A", "var(--r-base)", (r) => r.sga], ["net", ko ? "순이익" : "Net", "var(--pos)", (r) => Math.max(0, r.net)], ["other", ko ? "기타" : "Other", "var(--fg-4)", (r) => Math.max(0, r.rev - r.cogs - r.sga - Math.max(0, r.net))]], total: (r) => r.rev, totLab: ko ? "매출액" : "Revenue", cap: ko ? "매출 100% 구성" : "Revenue breakdown" },
          bs: { rows: fin.bs as (FinYearIS & FinYearBS & FinYearCF)[], parts: [["curLiab", ko ? "유동부채" : "Cur. liab", "var(--neg)", (r) => r.curLiab], ["nonCurLiab", ko ? "비유동부채" : "LT liab", "var(--r-base)", (r) => r.nonCurLiab], ["equity", ko ? "자본" : "Equity", "var(--accent)", (r) => r.equity]], total: (r) => r.assets, totLab: ko ? "자산총계" : "Total assets", cap: ko ? "자산 = 부채 + 자본 구성" : "Capital structure" },
          cf: { rows: fin.cf as (FinYearIS & FinYearBS & FinYearCF)[], parts: [["ocf", ko ? "영업CF" : "Operating", "var(--pos)", (r) => Math.abs(r.ocf)], ["icf", ko ? "투자CF" : "Investing", "var(--neg)", (r) => Math.abs(r.icf)], ["fcf_fin", ko ? "재무CF" : "Financing", "var(--r-base)", (r) => Math.abs(r.fcf_fin)]], total: (r) => Math.abs(r.ocf) + Math.abs(r.icf) + Math.abs(r.fcf_fin), totLab: ko ? "합계" : "Total", cap: ko ? "현금흐름 구성" : "Cash flow mix" } };
        const which = stmt === "all" ? ["is", "bs", "cf"] : [stmt];
        return <div className="fin-comp">{which.map((sk) => { const c = COMP[sk]; return (
          <div className="fin-comp-block" key={sk}>
            <div className="fin-comp-cap">{c.cap}</div>
            <div className="fin-comp-rows">{c.rows.map((r, i) => { const tot = c.total(r) || 1; return (
              <div className="fin-comp-row" key={i}>
                <span className="fin-comp-yr">{r.y}</span>
                <div className="fin-comp-bar">{c.parts.map((p) => { const v = p[3](r), w = v / tot * 100; if (w < 0.5) return null; return <span key={p[0]} className="fin-comp-seg" style={{ width: w + "%", background: p[2] }}>{w >= 9 ? Math.round(w) + "%" : ""}</span>; })}
                  <div className={"fin-comp-tip" + (i === 0 ? " fin-comp-tip--down" : "")}>
                    <div className="fin-comp-tip-yr">{r.y}</div>
                    {c.parts.map((p) => { const v = p[3](r), w = v / tot * 100; return (
                      <div className="fin-comp-tip-row" key={p[0]}>
                        <span className="fin-comp-tip-dot" style={{ background: p[2] }} />
                        <span className="fin-comp-tip-lab">{p[1]}</span>
                        <span className="fin-comp-tip-pct">{w.toFixed(1)}%</span>
                        <span className="fin-comp-tip-val">{fv(v)}</span>
                      </div> ); })}
                    <div className="fin-comp-tip-row fin-comp-tip-tot">
                      <span />
                      <span className="fin-comp-tip-lab">{c.totLab}</span>
                      <span className="fin-comp-tip-pct">100%</span>
                      <span className="fin-comp-tip-val">{fv(c.total(r))}</span>
                    </div>
                  </div>
                </div>
              </div> ); })}</div>
            <div className="fin-comp-legend">{c.parts.map((p) => <span className="gap-leg" key={p[0]}><span className="gap-leg-dot" style={{ background: p[2] }} />{p[1]}</span>)}</div>
          </div> ); })}</div>;
      })()}
      {stmt !== "builder" && fmode === "table" && <table className="fin-table">
        <thead><tr><th>{(() => { const std = plan.cur === "USD" ? "US-GAAP" : "K-IFRS"; return ko ? "단위: " + (dispCur === "USD" ? "$B" : "조원") + " · " + std + (plan.cur === "USD" ? "" : " 연결") : "Unit: " + (dispCur === "USD" ? "$B" : "tn KRW") + " · " + std; })()}</th>{years.map((y) => <th key={y}>{y}</th>)}<th>YoY</th></tr></thead>
        <tbody>
          {(stmt === "all" || stmt === "focus" ? ["is", "bs", "cf"] : [stmt]).map((sk) => {
            const arr = (sk === "is" ? fin.is : sk === "bs" ? fin.bs : fin.cf) as (FinYearIS & FinYearBS & FinYearCF)[];
            const secLab = ({ is: ko ? "손익계산서" : "Income statement", bs: ko ? "재무상태표" : "Balance sheet", cf: ko ? "현금흐름표" : "Cash flow" } as Record<string, string>)[sk];
            const specsList = stmt === "focus" ? SPECS[sk].filter((sp) => hiSet.has(sp.k)) : SPECS[sk];
            if (stmt === "focus" && !specsList.length) return null;
            return (
              <Fragment key={sk}>
                {(stmt === "all" || stmt === "focus") && (() => {
                  const meta = ({ is: { ic: "trending-up", c: "var(--accent)", d: ko ? "일정 기간의 매출·비용·이익이에요. 회사가 얼마나 벌었는지 보여줘요." : "Revenue, costs and profit over a period." }, bs: { ic: "layers", c: "#4C8DFF", d: ko ? "특정 시점의 자산·부채·자본이에요. 회사의 재무 상태(체력)를 보여줘요." : "Assets, liabilities and equity at a point in time." }, cf: { ic: "banknote", c: "var(--r-bull)", d: ko ? "실제로 들어오고 나간 현금이에요. 이익의 질과 현금 창출력을 보여줘요." : "Actual cash in and out — quality of earnings." } } as Record<string, { ic: string; c: string; d: string }>)[sk];
                  return <tr className="fin-section" style={{ "--secc": meta.c } as CSSProperties}><td colSpan={years.length + 2}><span className="fin-sec-inner fin-term"><Lic name={meta.ic} size={14} cls="icon-sm" color={meta.c} /><span>{secLab}</span><span className="ind-q">?</span><span className="fin-tip"><b style={{ color: meta.c }}>{secLab}</b><span className="fin-tip-def">{meta.d}</span></span></span></td></tr>;
                })()}
                {specsList.map((sp, li) => {
                  const lv = sp.g(arr[arr.length - 1]), pv = sp.g(arr[arr.length - 2]);
                  const yoy = pv ? (lv - pv) / Math.abs(pv) * 100 : null;
                  return (
                    <tr key={sk + li} className={(sp.bold ? "fin-bold " : "") + (sp.sub ? "fin-sub " : "") + (hiSet.has(sp.k) ? "fin-hilite" : "")} style={hiSet.has(sp.k) ? { "--fw-c": fwColor } as CSSProperties : undefined}>
                      <td className="fin-rowlab">{(() => { const d = FIN_DEF[sp.k]; return d ? <span className="fin-term">{sp.label}<span className="ind-q">?</span><span className="fin-tip"><b>{sp.label}</b><span className="fin-tip-def">{d.def}{d.dir && <span className="fin-tip-dir"> {d.dir}</span>}</span>{d.f && <span className="fin-tip-f">{d.f}</span>}</span></span> : sp.label; })()}{hiSet.has(sp.k) && fwObj.name && <span className="fin-fwtag fin-term" style={{ color: fwColor }}><span className="fin-fwtag-dot" style={{ background: fwColor }} />{fwObj.name[lang]}<span className="fin-tip"><b style={{ color: fwColor }}>{fwObj.name[lang]}</b><span className="fin-tip-def">{lang === "ko" ? `${fwObj.name.ko} 프레임워크가 이 항목을 핵심 지표로 주목합니다. ${(fwObj.desc ? fwObj.desc.ko : "")}` : `Key line for the ${fwObj.name.en} framework. ${(fwObj.desc ? fwObj.desc.en : "")}`}</span></span></span>}</td>
                      {arr.map((r, ci) => <td key={ci} className={"mono" + (sp.accent ? " fin-accent" : "")}>{fv(sp.g(r))}</td>)}
                      <td className={"mono " + (yoy == null ? "" : yoy >= 0 ? "pos" : "neg")}>{yoy == null ? "—" : (yoy >= 0 ? "+" : "") + yoy.toFixed(0) + "%"}</td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>}
    </div>
  );
}
