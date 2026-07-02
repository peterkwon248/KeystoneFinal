// @keystone/core/format — money / market-cap / shares / date formatters promoted
// from the prototype (source/data.jsx). Ported verbatim, minus the localStorage
// side effects (getSecRecents/pushSecRecent) which stay in the prototype.

import type { Currency, DispMoney, Lang, SharesDisp } from "../types/index.ts";

/* ============ helpers ============ */
// ===== global display currency (app-level) =====
// Money values are stored/passed in each plan's NATIVE currency. A global display
// preference (null = native) converts every fmtMoney/fmtCompact call at format time,
// so no call site needs the display currency threaded through. FX is a single mock
// constant today — swap KEYSTONE_FX for a live rate later and the whole app reflows.
let KEYSTONE_FX = 1380;            // ₩ per $ (mock; replace with live API rate later)

let KEYSTONE_DISP: Currency | null = null;          // null | "KRW" | "USD"
export function setDisplayCurrency(c: Currency | null): void { KEYSTONE_DISP = c || null; }
export function getDisplayCurrency(): Currency | null { return KEYSTONE_DISP; }
export function setFxRate(r: number): void { if (r > 0) KEYSTONE_FX = r; }
export function getFxRate(): number { return KEYSTONE_FX; }
// convert a native-currency amount to the active display currency
export function toDispCur(n: number, planCur?: Currency | string): DispMoney {
  const pc = (planCur || "KRW") as Currency;
  if (!KEYSTONE_DISP || KEYSTONE_DISP === pc) return { v: n, cur: pc };
  const v = pc === "KRW" ? n / KEYSTONE_FX : n * KEYSTONE_FX;
  return { v, cur: KEYSTONE_DISP };
}
export function fmtMoney(n: number | null | undefined, cur?: Currency | string): string {
  if (n == null) return "—";
  const d = toDispCur(n, cur);
  if (d.cur === "USD") return "$" + d.v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "₩" + Math.round(d.v).toLocaleString("en-US");
}
export function fmtCompact(n: number | null | undefined, cur?: Currency | string): string {
  if (n == null) return "—";
  const d = toDispCur(n, cur);
  if (d.cur === "USD") return "$" + (d.v >= 1000 ? d.v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : d.v.toFixed(2));
  return "₩" + Math.round(d.v).toLocaleString("en-US");
}
// market-cap formatter — respects the active display currency (자동/원화/달러), then ROLLING units (억↔조↔경 · B↔T).
export function fmtMktCap(nativeTotal: number | null | undefined, cur?: Currency | string): string {
  if (nativeTotal == null || !isFinite(nativeTotal) || nativeTotal <= 0) return "—";
  const d = toDispCur(nativeTotal, cur);
  const isUSD = d.cur === "USD";
  const units = isUSD
    ? [{ s: "B", b: 1e9 }, { s: "T", b: 1e12 }]
    : [{ s: "억", b: 1e8 }, { s: "조", b: 1e12 }, { s: "경", b: 1e16 }];
  let u = units[0];
  for (const x of units) if (d.v >= x.b) u = x;
  const v = d.v / u.b;
  const num = v.toFixed(v >= 100 ? 0 : 1);
  return isUSD ? "$" + num + u.s : num + u.s;
}

// localized dates: createdAt is an absolute "Mon D"; updatedAt is relative ("2d"/"4h"/"now") or absolute.
export const MON_KO: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
export const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// App "today" anchor — bare "Mon D" dates have no year, so infer the most recent past occurrence.
export const KS_REF = { y: 2026, mo: 6, d: 26 };
export function inferYear(mo: number, d: number): number { return (mo < KS_REF.mo || (mo === KS_REF.mo && d <= KS_REF.d)) ? KS_REF.y : KS_REF.y - 1; }
export function fmtDate(s: string, lang: Lang): string {
  if (!s) return s;
  // "Mon D" or "Mon D, YYYY" → infer year if absent; show the year only when it isn't the current year.
  const m = /^([A-Z][a-z]{2})\s+(\d+)(?:,?\s+(\d{4}))?$/.exec(s);
  if (!m || !MON_KO[m[1]]) return s;
  const mo = MON_KO[m[1]], d = +m[2];
  const yr = m[3] ? +m[3] : inferYear(mo, d);
  const showY = yr !== KS_REF.y;
  if (lang === "ko") return (showY ? yr + "년 " : "") + mo + "월 " + d + "일";
  return MON_EN[mo - 1] + " " + d + (showY ? ", " + yr : "");
}
export function fmtRel(s: string, lang: Lang): string {
  if (!s) return s;
  if (lang === "ko") {
    if (s === "now") return "방금";
    let m;
    if (m = /^(\d+)d$/.exec(s)) return m[1] + "일 전";
    if (m = /^(\d+)h$/.exec(s)) return m[1] + "시간 전";
    if (m = /^(\d+)mo$/.exec(s)) return m[1] + "개월 전";
    if (m = /^(\d+)y$/.exec(s)) return m[1] + "년 전";
    if (m = /^today(?:\s+(\d{1,2}:\d{2}))?$/i.exec(s)) return "오늘" + (m[1] ? " " + m[1] : "");
    if (m = /^yesterday(?:\s+(\d{1,2}:\d{2}))?$/i.exec(s)) return "어제" + (m[1] ? " " + m[1] : "");
    if (m = /^([A-Z][a-z]{2})\s+(\d+)\s+(\d{1,2}:\d{2})$/.exec(s)) return fmtDate(m[1] + " " + m[2], lang) + " " + m[3];
    return fmtDate(s, lang);
  }
  // en: relative strings pass through; absolute dates get year-aware formatting
  if (s === "now" || /^\d+(d|h|mo|y)$/.test(s)) return s;
  return fmtDate(s, "en");
}

// adaptive shares-outstanding display. Input is in MILLIONS of shares.
// ko: 억 주 when ≥ 1억 (100M), else 만 주 — covers small-float stocks naturally.
// en: B when ≥ 1000M, else M.
export function sharesDisp(m: number, lang: Lang): SharesDisp {
  if (!(m > 0)) return { v: 0, suf: lang === "ko" ? "주" : "" };
  if (lang === "ko") {
    if (m >= 100) return { v: +(m / 100).toFixed(m / 100 >= 100 ? 0 : 1), suf: "억 주" };
    return { v: Math.round(m * 100), suf: "만 주" };
  }
  if (m >= 1000) return { v: +(m / 1000).toFixed(1), suf: "B" };
  return { v: Math.round(m), suf: "M" };
}
export function fmtShares(m: number, lang: Lang): string { const d = sharesDisp(m, lang); return d.v.toLocaleString("en-US") + (d.suf && /[A-Z]/.test(d.suf) ? "" : " ") + d.suf; }
