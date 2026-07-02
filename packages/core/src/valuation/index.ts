// valuation.jsx — forward-valuation engine (currency-aware). Pure functions, no DB.
// Inputs are financial lines (억원 for KRW, 백만$ for USD) + shares (백만/M) → per-share metrics,
// forward multiples, profitability, and fair value from target multiples. Output can be pushed
// to a plan's Bull/Base/Bear scenario targets — turning "감" targets into computed ones.

import type {
  Plan,
  ValuationInput,
  ValuationResult,
  Band,
  BandKind,
  BandTargets,
  ScenarioTargets,
  ValuationSlot,
  Currency,
} from "../types/index.ts";

// financial-line(억원 / 백만$) × factor / shares(M) → per-share value in the plan currency
export function valFactor(cur: Currency): number { return cur === "USD" ? 1 : 100; }

// seed plausible current financials so derived EPS ≈ plan.eps (editable afterwards)
export function seedFinancials(plan: Plan): ValuationInput {
  const f = valFactor(plan.cur), sh = plan.sharesOut || 100;
  const net = Math.max(1, Math.round((plan.eps || 1) * sh / f));   // EPS ≈ plan.eps
  const op = Math.round(net * 1.3);                                // op > net
  const equity = Math.round(net / 0.11);                           // ~11% ROE
  return {
    revenue: Math.round(net / 0.12),   // ~12% net margin
    op,
    net,
    equity,
    dps: Math.max(0, Math.round((plan.eps || 0) * 0.3)),
    // 고급 가정 — inp 라인에서 일관되게 파생 (EV/EBITDA·EV/FCF 모델 입력)
    ebitda: Math.round(op * 1.18),     // 영업이익 + 감가상각
    fcf: Math.round(net * 0.9),        // 잉여현금흐름 ≈ 순이익보다 약간 낮게
    netDebt: Math.round(equity * 0.25),// 순부채 (음수면 순현금)
    growth: 10,
    targetPer: 12, targetPbr: 1.2, targetPsr: 1.5,
    years: 3,
  };
}

export function calcValuation(plan: Plan, inp: ValuationInput): ValuationResult {
  const f = valFactor(plan.cur), sh = plan.sharesOut || 1, price = plan.currentPrice;
  const gr = (inp.growth || 0) / 100, g = 1 + gr;
  const ps = (line: number) => sh > 0 ? line * f / sh : 0;
  // current per-share
  const cEps = ps(inp.net), cBps = ps(inp.equity), cSps = ps(inp.revenue), cOps = ps(inp.op);
  // forecast lines (revenue/op/net grow by g; equity by 0.8g — retained earnings)
  const fNet = inp.net * g, fOp = inp.op * g, fRev = inp.revenue * g, fEquity = inp.equity * (1 + gr * 0.8), fDps = inp.dps * g;
  const fEps = ps(fNet), fBps = ps(fEquity), fSps = ps(fRev), fOps = ps(fOp);
  // multiples
  const cPer = cEps > 0 ? price / cEps : 0, fPer = fEps > 0 ? price / fEps : 0;
  const cPbr = cBps > 0 ? price / cBps : 0, fPbr = fBps > 0 ? price / fBps : 0;
  const cPsr = cSps > 0 ? price / cSps : 0, fPsr = fSps > 0 ? price / fSps : 0;
  // profitability
  const cOpM = inp.revenue > 0 ? inp.op / inp.revenue * 100 : 0, fOpM = fRev > 0 ? fOp / fRev * 100 : 0;
  const cNetM = inp.revenue > 0 ? inp.net / inp.revenue * 100 : 0, fNetM = fRev > 0 ? fNet / fRev * 100 : 0;
  const cRoe = inp.equity > 0 ? inp.net / inp.equity * 100 : 0, fRoe = fEquity > 0 ? fNet / fEquity * 100 : 0;
  const divYield = price > 0 ? inp.dps / price * 100 : 0, fDivYield = price > 0 ? fDps / price * 100 : 0;
  // 고급 가정 (EBITDA·FCF·순부채) — forward 성장 반영 + 주당 환산 (EV 기반 모델 입력)
  const ebitda = inp.ebitda || 0, fcf = inp.fcf || 0, netDebt = inp.netDebt || 0;
  const fEbitda = ebitda * g, fFcf = fcf * g;        // 순부채는 상수로 유지
  const cEbitdaPs = ps(ebitda), fEbitdaPs = ps(fEbitda);
  const cFcfPs = ps(fcf), fFcfPs = ps(fFcf);
  const netDebtPs = ps(netDebt);
  // 현재/예상 EV/EBITDA (참고용) — EV = 시총 + 순부채
  const evNow = price * (sh) + netDebt * f;          // native-ish; 표시용 배수만 사용
  const cEvEbitda = ebitda > 0 ? (price + netDebtPs) / (cEbitdaPs || 1) : 0;
  const fEvEbitda = fEbitda > 0 ? (price + netDebtPs) / (fEbitdaPs || 1) : 0;
  // fair value: forecast per-share × target multiple
  const fairPer = fEps * inp.targetPer, fairPbr = fBps * inp.targetPbr, fairPsr = fSps * inp.targetPsr;
  const fairs = [fairPer, fairPbr, fairPsr].filter(v => v > 0);
  const fairAvg = fairs.length ? fairs.reduce((a, b) => a + b, 0) / fairs.length : 0;
  const up = (v: number) => price > 0 ? (v / price - 1) * 100 : 0;
  const discount = up(fairAvg);
  const verdict = discount > 15 ? "under" : discount < -15 ? "over" : "fair";
  return {
    cEps, fEps, cBps, fBps, cSps, fSps, fDps, cOps, fOps,
    cPer, fPer, cPbr, fPbr, cPsr, fPsr,
    cEbitdaPs, fEbitdaPs, cFcfPs, fFcfPs, netDebtPs, cEvEbitda, fEvEbitda,
    cOpM, fOpM, cNetM, fNetM, cRoe, fRoe, divYield, fDivYield,
    fairPer, fairPbr, fairPsr, fairAvg,
    upPer: up(fairPer), upPbr: up(fairPbr), upPsr: up(fairPsr), upAvg: discount,
    discount, verdict,
  };
}

// reverse: target PER → price, target market cap → price
export function reverseFromPer(fEps: number, targetPer: number, price: number): { price: number; upside: number } | null {
  if (!(fEps > 0) || !(targetPer > 0)) return null;
  const p = fEps * targetPer; return { price: p, upside: price > 0 ? (p / price - 1) * 100 : 0 };
}
export function reverseFromCap(cur: Currency, targetCap: number, sharesM: number, price: number): { price: number; upside: number } | null {
  if (!(sharesM > 0) || !(targetCap > 0)) return null;
  // targetCap: 조원 (KRW) or $B (USD); shares in M
  const capBase = cur === "USD" ? targetCap * 1e9 : targetCap * 1e12;
  const p = capBase / (sharesM * 1e6);
  return { price: p, upside: price > 0 ? (p / price - 1) * 100 : 0 };
}

// map fair values → Bull / Base / Bear scenario targets (high / avg / low)
export function fairToScenarioTargets(r: ValuationResult): ScenarioTargets | null {
  const xs = [r.fairPer, r.fairPbr, r.fairPsr].filter(v => v > 0).sort((a, b) => b - a);
  if (!xs.length) return null;
  return { bull: Math.round(xs[0]), base: Math.round(r.fairAvg), bear: Math.round(xs[xs.length - 1]) };
}

// ---- band mode: one method (PER/PBR/PSR), three multiples (lo/mid/hi) ----
// "PER 10 은 하단, 12는 기준, 15는 상단" — same logic as the auto-scenario PER band.
// 과거 5년 멀티플 밴드를 재무 시계열 + 가격 히스토리에서 계산 (괴리 탭 MultipleBandChart와 동일 로직)
export function histMultipleBand(plan: Plan, type: string): Band | null {
  const fin = plan.fin; if (!fin || !fin.is) return null;
  const shares = (plan.sharesOut || 1) * 1e6;
  const n = fin.is.length;
  const ph = plan.priceHistory || [];
  const pxYear = fin.is.map((_, i) => { const idx = Math.min(ph.length - 1, Math.round(i / (n - 1) * (ph.length - 1))); return i === n - 1 ? plan.currentPrice : (ph[idx] ? ph[idx].v : plan.currentPrice); });
  const mults = fin.is.map((r, i) => {
    const cap = pxYear[i] * shares, bs = fin.bs[i], cf = fin.cf[i];
    const netDebt = bs ? bs.liab * 0.4 : 0;
    if (type === "pbr") return (bs && bs.equity > 0) ? cap / bs.equity : null;
    if (type === "psr") return r.rev > 0 ? cap / r.rev : null;
    if (type === "por") return r.op > 0 ? cap / r.op : null;
    if (type === "ev") { const e = r.op * 1.18; return e > 0 ? (cap + netDebt) / e : null; }
    if (type === "fcf") { const f = cf ? cf.fcf : 0; return f > 0 ? (cap + netDebt) / f : null; }
    return r.net > 0 ? cap / r.net : null; // per
  }).filter((v): v is number => Boolean(v) && isFinite(v as number) && (v as number) > 0);
  if (mults.length < 2) return null;
  const s = mults.slice().sort((a, b) => a - b);
  const r2 = (x: number) => Math.round(x * 10) / 10;
  return { lo: r2(s[0]), mid: r2(s[Math.floor(s.length / 2)]), hi: r2(s[s.length - 1]) };
}
export function seedBands(plan: Plan): Record<BandKind, Band> {
  const r = calcValuation(plan, seedFinancials(plan));
  const r1 = (v: number, d: number) => { const x = Math.round(v * 10) / 10; return x > 0 ? x : d; };
  const band = (type: string, fb: Band) => { const h = histMultipleBand(plan, type); return (h && h.lo > 0 && h.hi > h.lo) ? h : fb; };
  const cEv = r.cEvEbitda > 0 ? r.cEvEbitda : 8;
  const cFcf = (r.cFcfPs > 0) ? (plan.currentPrice + (r.netDebtPs || 0)) / r.cFcfPs : 16;
  const cPor = (r.cOps > 0) ? plan.currentPrice / r.cOps : 11;
  return {
    per: band("per", { lo: r1(r.cPer * 0.8, 8), mid: r1(r.cPer, 10), hi: r1(r.cPer * 1.25, 13) }),
    pbr: band("pbr", { lo: r1(r.cPbr * 0.8, 0.8), mid: r1(r.cPbr, 1.0), hi: r1(r.cPbr * 1.25, 1.3) }),
    psr: band("psr", { lo: r1(r.cPsr * 0.8, 0.8), mid: r1(r.cPsr, 1.2), hi: r1(r.cPsr * 1.25, 1.5) }),
    ev: band("ev", { lo: r1(cEv * 0.8, 6), mid: r1(cEv, 8), hi: r1(cEv * 1.25, 11) }),
    fcf: band("fcf", { lo: r1(cFcf * 0.8, 12), mid: r1(cFcf, 16), hi: r1(cFcf * 1.25, 22) }),
    por: band("por", { lo: r1(cPor * 0.8, 8), mid: r1(cPor, 11), hi: r1(cPor * 1.25, 15) }),
  };
}
export function bandTargets(r: ValuationResult, mode: string, band: Band): BandTargets | null {
  const ps = mode === "pbr" ? r.fBps : mode === "psr" ? r.fSps : r.fEps; // forward per-share value
  if (!(ps > 0) || !(band.lo > 0) || !(band.mid > 0) || !(band.hi > 0)) return null;
  return {
    bearP: ps * band.lo, baseP: ps * band.mid, bullP: ps * band.hi,
    bear: Math.round(ps * band.lo), base: Math.round(ps * band.mid), bull: Math.round(ps * band.hi),
  };
}

// preset → initial slot configs. A "band" is just 3 slots of the same method (lo/mid/hi);
// "mix" is one slot per method. Slots are fully editable afterwards — presets only seed.
export function seedSlots(plan: Plan, kind: string): ValuationSlot[] {
  const valid = ["per", "pbr", "psr", "ev", "fcf", "por"];
  const k = (valid.includes(kind) ? kind : "per") as BandKind;
  const bb = seedBands(plan)[k];
  return [{ m: k, v: bb.lo }, { m: k, v: bb.mid }, { m: k, v: bb.hi }];
}
