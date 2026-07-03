// source/ledger.jsx ExecutionLedger 이식 — 회차별 누적 장부 표 (스프레드시트형).
// 모든 수치는 computeLedger(순수 로직, @keystone/core/analytics)에서 파생. 표 구조/className 원본 그대로.
"use client";
import type { I18nDict, Lang } from "@keystone/core/types";
import { computeLedger } from "@keystone/core/analytics";
import { fmtMoney, fmtCompact } from "@keystone/core/format";
import { Lic } from "@/components/icons";
import type { UIPlan } from "@/lib/plan-mapper";

export function ExecutionLedger({ plan, t, lang }: { plan: UIPlan; t: I18nDict; lang: Lang }) {
  const L = computeLedger(plan);
  const money = (v: number) => fmtMoney(plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v), plan.cur);
  const amt = (v: number) => fmtCompact(v, plan.cur);
  const sgn = (v: number, f: (n: number) => string) => (v >= 0 ? "+" : "") + f(Math.abs(v) * Math.sign(v));
  const ko = lang === "ko";
  if (!L.rows.length) return null;

  return (
    <div className="ledger-wrap">
      <table className="ledger-table">
        <thead><tr>
          <th title={t.tip_lg_round}>{t.round}</th><th title={t.tip_lg_date}>{t.date}</th><th title={t.tip_lg_side}>{t.side}</th>
          <th className="num" title={t.tip_lg_price}>{t.price}</th><th className="num" title={t.tip_lg_qty}>{t.qty}</th><th className="num" title={t.tip_lg_amount}>{t.amount}</th>
          <th className="num sep" title={t.tip_lg_cumQty}>{t.lg_cumQty}</th><th className="num" title={t.tip_lg_cumInv}>{t.lg_cumInv}</th>
          <th className="num" title={t.tip_avgCost}>{t.avg}</th><th className="num" title={t.tip_lg_dAvg}>{t.lg_dAvg}</th><th className="num sep" title={t.tip_lg_pnlAt}>{t.lg_pnlAt}</th>
        </tr></thead>
        <tbody>
          {L.rows.map((r, i) => {
            if (r.type === "open") return (
              <tr key={i} className="lg-open">
                <td><span className="exec-round">{r.base ? (ko ? "기초" : "Base") : `${r.seqFrom}${r.seqTo! > r.seqFrom! ? "–" + r.seqTo : "+"}`}</span></td>
                <td colSpan={2} style={{ color: "var(--fg-4)" }}>{r.base ? (ko ? "기초 보유 (전략 시작 시점)" : "Opening position") : (ko ? "이월 (이전 회차 합산)" : "Carried forward")}</td>
                <td className="num mono">{money(r.avg!)}</td>
                <td className="num mono">{Math.round(r.qty!)}</td>
                <td className="num mono">{amt(r.cost!)}</td>
                <td className="num mono sep">{Math.round(r.qty!)}</td>
                <td className="num mono">{amt(r.cost!)}</td>
                <td className="num mono">{money(r.avg!)}</td>
                <td className="num mono dim">—</td><td className="num mono dim sep">—</td>
              </tr>
            );
            const e = r.e!, buy = r.type === "buy";
            return (
              <tr key={i} className={buy ? "" : "lg-sell"}>
                <td><span className="exec-round">{r.seq}</span></td>
                <td className="mono lg-date">{e.date}</td>
                <td><span className="exec-side" style={{ color: buy ? "var(--r-active)" : "var(--r-closing)" }}>
                  <Lic name={buy ? "arrow-down-left" : "arrow-up-right"} size={12} cls="icon-sm" color="inherit" />{buy ? t.buy : t.sell}</span></td>
                <td className="num mono">{money(e.price)}</td>
                <td className="num mono">{buy ? e.qty : "−" + e.qty}</td>
                <td className="num mono">{amt(e.price * e.qty)}</td>
                <td className="num mono sep">{Math.round(r.qty!)}</td>
                <td className="num mono">{amt(r.invested!)}</td>
                <td className="num mono">{r.avg != null && r.qty! > 0 ? money(r.avg) : (!buy && r.avg != null ? <span className="dim" title={t.tip_avgCost}>{money(r.avg)}</span> : "—")}</td>
                <td className={"num mono " + (r.dAvg == null ? "dim" : r.dAvg < 0 ? "pos" : "dim")}>
                  {r.dAvg == null ? "—" : (r.dAvg < 0 ? "▼" : "▲") + money(Math.abs(r.dAvg)).replace(/^[₩$]/, "")}</td>
                <td className={"num mono sep " + ((buy ? r.pnlPct! : r.realizedPct!) >= 0 ? "pos" : "neg")}>
                  {buy
                    ? sgn(r.pnlPct!, v => v.toFixed(1)) + "%"
                    : sgn(r.realized!, amt) + " (" + sgn(r.realizedPct!, v => v.toFixed(1)) + "%)"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr>
          <td colSpan={4}>{ko ? "합계" : "Totals"}</td>
          <td className="num mono">{Math.round(L.totals.qty)}</td>
          <td className="num mono">{amt(L.totals.invested)}</td>
          <td className="num mono sep">{Math.round(L.totals.qty)}</td>
          <td className="num mono">{amt(L.totals.cost)}</td>
          <td className="num mono">{L.totals.avg != null ? money(L.totals.avg) : "—"}</td>
          <td className="num mono dim">{ko ? "실현" : "Rzd"} <span className={L.totals.realized >= 0 ? "pos" : "neg"}>{sgn(L.totals.realized, amt)}</span></td>
          <td className={"num mono sep " + (L.totals.combined >= 0 ? "pos" : "neg")}>{sgn(L.totals.combined, amt)}</td>
        </tr></tfoot>
      </table>
      <div className="ledger-note">
        {ko ? "평가손익은 각 체결 시점 단가 기준 · 합계 손익 = 실현 + 현재가 평가" : "Point-in-time P&L uses each fill's price · combined = realized + unrealized at current price"}
      </div>
    </div>
  );
}
