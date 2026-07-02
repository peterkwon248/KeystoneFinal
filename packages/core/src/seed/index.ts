// @keystone/core/seed — synthesized 5-year financial time series + indicators
// promoted from the prototype (source/data.jsx). SEED / MOCK financials —
// replaced by DART/EDGAR adapters later. Ported verbatim; gradeOf is imported
// from ../screener/index.ts (was a global in the prototype).

import type { Fin, FinSeed } from "../types/index.ts";
import { gradeOf } from "../screener/index.ts";

/* ============ 재무 시계열 + 투자지표 보강 ============ */
// 플랜에 단년 eps/sharesOut만 있으므로, 종목별 5년 재무 시계열을 합성한다.
// FIN_SEED = {ticker: {rev5(매출 5년, 십억/native), opm(영업이익률%), npm(순이익률%), roe, debt(부채비율%), curr(유동비율%), divy(배당수익률%), revg(매출성장%)}}
export const FIN_SEED: Record<string, FinSeed> = {
  "005930": { unit: 1e12, rev: [236.8, 279.6, 302.2, 258.9, 300.9], opm: [15.2, 18.5, 14.3, 2.5, 10.9], npm: 11.4, roe: 8.6, gpm: 37, debt: 28, curr: 248, divy: 2.0, revg: 16.2 },
  "000660": { unit: 1e12, rev: [31.9, 43.0, 44.6, 32.8, 66.2], opm: [15.7, 28.9, 15.3, -23.6, 35.5], npm: 29.9, roe: 27.7, gpm: 43, debt: 70, curr: 120, divy: 0.8, revg: 101.8 },
  "AAPL": { unit: 1e9, rev: [274.5, 365.8, 394.3, 383.3, 391.0], opm: [24.1, 29.8, 30.3, 29.8, 31.5], npm: 24.0, roe: 164.6, gpm: 46, debt: 540, curr: 87, divy: 0.4, revg: 2.0 },
  "NVDA": { unit: 1e9, rev: [16.7, 26.9, 27.0, 60.9, 130.5], opm: [27.2, 37.3, 20.7, 54.1, 62.4], npm: 55.8, roe: 91.9, gpm: 75, debt: 41, curr: 444, divy: 0.03, revg: 114.2 },
  "TSLA": { unit: 1e9, rev: [31.5, 53.8, 81.5, 96.8, 97.7], opm: [6.3, 12.1, 16.8, 9.2, 7.8], npm: 7.3, roe: 20.4, gpm: 18, debt: 45, curr: 187, divy: 0, revg: 0.9 },
  "035720": { unit: 1e12, rev: [4.2, 6.1, 7.1, 7.6, 7.9], opm: [12.0, 9.8, 8.5, 7.2, 6.5], npm: 4.0, roe: 3.1, gpm: 30, debt: 38, curr: 140, divy: 0.2, revg: 3.9 },
  "005380": { unit: 1e12, rev: [104.0, 117.6, 142.2, 162.7, 175.2], opm: [2.7, 5.7, 6.9, 9.3, 8.1], npm: 7.5, roe: 14.2, gpm: 20, debt: 175, curr: 130, divy: 4.6, revg: 7.7 },
  "035420": { unit: 1e12, rev: [5.3, 6.8, 8.2, 9.7, 10.7], opm: [21.0, 19.4, 16.9, 14.1, 14.5], npm: 18.0, roe: 7.1, gpm: 40, debt: 42, curr: 120, divy: 0.5, revg: 10.3 },
  "GOOGL": { unit: 1e9, rev: [182.5, 257.6, 282.8, 307.4, 350.0], opm: [22.6, 30.6, 26.5, 27.4, 32.0], npm: 27.0, roe: 30.8, gpm: 57, debt: 33, curr: 180, divy: 0.5, revg: 13.9 },
  "005490": { unit: 1e12, rev: [57.8, 76.3, 84.8, 77.1, 72.7], opm: [4.2, 9.2, 7.1, 4.6, 4.9], npm: 4.6, roe: 5.8, gpm: 14, debt: 78, curr: 175, divy: 3.4, revg: -5.7 },
  "207940": { unit: 1e12, rev: [1.16, 1.57, 3.01, 3.69, 4.55], opm: [25.0, 34.3, 32.6, 30.7, 31.5], npm: 24.5, roe: 11.2, gpm: 45, debt: 38, curr: 220, divy: 0, revg: 23.3 },
  "MSFT": { unit: 1e9, rev: [143.0, 168.1, 198.3, 211.9, 245.1], opm: [37.0, 41.6, 42.1, 41.8, 44.6], npm: 36.0, roe: 38.5, gpm: 69, debt: 75, curr: 130, divy: 0.7, revg: 15.7 },
  "AMD": { unit: 1e9, rev: [9.76, 16.4, 23.6, 22.7, 25.8], opm: [14.0, 22.2, 5.4, 1.8, 8.0], npm: 6.5, roe: 5.1, gpm: 50, debt: 14, curr: 250, divy: 0, revg: 13.7 },
  "TSM": { unit: 1e9, rev: [45.5, 56.8, 73.6, 69.3, 90.0], opm: [42.3, 40.9, 49.5, 42.6, 45.7], npm: 40.0, roe: 27.8, gpm: 54, debt: 28, curr: 230, divy: 1.4, revg: 30.0 },
};
export function buildFin(ticker: string, px: number, eps: number, sharesOut: number): Fin | null {
  const years = ["2020", "2021", "2022", "2023", "2024"];
  const s = FIN_SEED[ticker]; if (!s) return null;
  {
    const per = eps ? px / eps : null, pbr = s.roe ? (per as number) * (s.roe / 100) : null;
    const tax = 0.22;                                  // 유효법인세율 가정
    const daR = s.unit === 1e12 ? 0.06 : 0.04;         // 감가상각/매출
    const capexR = (s.gpm >= 60 ? 0.05 : s.debt >= 150 ? 0.05 : 0.07); // capex/매출
    const lastRev = s.rev[s.rev.length - 1];
    // 손익계산서(IS) — 5년 풀라인
    const is = years.map((y, i) => {
      const rev = s.rev[i] * s.unit;
      const cogs = rev * (1 - s.gpm / 100);
      const gross = rev - cogs;
      const op = rev * (s.opm[i] / 100);
      const sga = gross - op;
      const nonOp = rev * 0.005 * (i % 2 ? 1 : -1);     // 영업외손익(소액)
      const pretax = op + nonOp;
      const taxAmt = pretax > 0 ? pretax * tax : 0;
      const net = rev * (s.npm / 100) * (s.opm[i] >= 0 ? 1 : 0.4);
      return { y, rev, cogs, gross, sga, op, nonOp, pretax, tax: taxAmt, net, opm: s.opm[i] };
    });
    // 재무상태표(BS) — 자본=순이익/ROE, 부채=자본×부채비율, 자산=자본+부채. 5년 역산(매출 비례)
    const lastNet = is[is.length - 1].net;
    const equityLast = s.roe ? lastNet / (s.roe / 100) : lastRev * s.unit * 0.5;
    const bs = years.map((y, i) => {
      const scale = s.rev[i] / lastRev;                 // 규모 프록시
      const equity = equityLast * (0.78 + 0.22 * scale);
      const liab = equity * (s.debt / 100);
      const assets = equity + liab;
      const curLiab = liab / (1 + (s.debt > 120 ? 1.2 : 0.6));
      const curAssets = curLiab * (s.curr / 100);
      return { y, curAssets, nonCurAssets: assets - curAssets, assets, curLiab, nonCurLiab: liab - curLiab, liab, equity };
    });
    // 현금흐름표(CF) — 5년
    const cf = years.map((y, i) => {
      const rev = s.rev[i] * s.unit, net = is[i].net;
      const da = rev * daR;
      const wc = -rev * 0.01 * (i % 2 ? 1 : -1);
      const ocf = net + da + wc;
      const capex = -rev * capexR;
      const icf = capex - rev * 0.005;
      const div = -(net > 0 ? net * (s.divy > 0 ? 0.3 : 0) : 0);
      const fcf_fin = div - rev * 0.01;
      return { y, ocf, da, capex, icf, fcf_fin, net: ocf + icf + fcf_fin, fcf: ocf + capex };
    });
    return {
      unit: s.unit, rows: is, is, bs, cf,
      indicators: (() => {
        const shares = (sharesOut || 1) * 1e6;
        const L = is[is.length - 1], P0 = is[is.length - 2], lastBs = bs[bs.length - 1];
        const sps = L.rev / shares, pcf = cf[cf.length - 1].ocf / shares;
        const psr = sps > 0 ? px / sps : null;
        const pcr = pcf > 0 ? px / pcf : null;
        const mktcap = px * shares, netDebt = lastBs.liab - (cf[cf.length - 1].ocf * 0.4);
        const ebitda = L.op * 1.18;
        const eveb = ebitda > 0 ? (mktcap + Math.max(0, netDebt)) / ebitda : null;
        const peg = (per && s.revg > 0) ? per / s.revg : null;
        const roa = lastBs.assets > 0 ? L.net / lastBs.assets * 100 : null;
        const opg = P0.op ? (L.op - P0.op) / Math.abs(P0.op) * 100 : null;
        const npg = P0.net ? (L.net - P0.net) / Math.abs(P0.net) * 100 : null;
        const payout = (s.divy != null && per) ? s.divy * per : null;   // 배당성향 = 배당수익률 × PER
        const divg = s.divg != null ? s.divg : (s.divy > 0 ? 6 : 0);     // 배당성장률
        const intcov = L.op > 0 ? L.op / Math.max(1, lastBs.liab * 0.03) : null; // 이자보상배율
        return [
          { key: "PER", cat: "value", v: per, fmt: "x" },
          { key: "PBR", cat: "value", v: pbr, fmt: "x" },
          { key: "PSR", cat: "value", v: psr, fmt: "x" },
          { key: "PCR", cat: "value", v: pcr, fmt: "x" },
          { key: "EVEB", cat: "value", v: eveb, fmt: "x" },
          { key: "PEG", cat: "value", v: peg, fmt: "x" },
          { key: "ROE", cat: "profit", v: s.roe, fmt: "pct" },
          { key: "ROA", cat: "profit", v: roa, fmt: "pct" },
          { key: "OPM", cat: "profit", v: s.opm[s.opm.length - 1], fmt: "pct" },
          { key: "NPM", cat: "profit", v: s.npm, fmt: "pct" },
          { key: "GPM", cat: "profit", v: s.gpm, fmt: "pct" },
          { key: "REVG", cat: "growth", v: s.revg, fmt: "pct" },
          { key: "OPG", cat: "growth", v: opg, fmt: "pct" },
          { key: "NPG", cat: "growth", v: npg, fmt: "pct" },
          { key: "DEBT", cat: "stability", v: s.debt, fmt: "pct" },
          { key: "CURR", cat: "stability", v: s.curr, fmt: "pct" },
          { key: "INTCOV", cat: "stability", v: intcov, fmt: "x" },
          { key: "DIVY", cat: "dividend", v: s.divy, fmt: "pct" },
          { key: "PAYOUT", cat: "dividend", v: payout, fmt: "pct" },
          { key: "DIVG", cat: "dividend", v: divg, fmt: "pct" },
        ].map(m => ({ ...m, tone: gradeOf(m.key, m.v) })) as Fin["indicators"];
      })(),
    };
  }
}
const FIN_CACHE: Record<string, Fin | null> = {};
export function finOf(ticker: string, px: number, eps: number, sharesOut: number): Fin | null { if (!(ticker in FIN_CACHE)) FIN_CACHE[ticker] = buildFin(ticker, px, eps, sharesOut); return FIN_CACHE[ticker]; }
