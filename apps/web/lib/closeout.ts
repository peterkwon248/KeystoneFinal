// source/ledger.jsx:196 closeoutSummary 이식 — 종료(closed) 플랜의 회고 요약.
// core computeLedger(순수)를 재사용하고 holdDays는 trajMonthIdx(웹 타임라인)로 파생.
// core 승격 X (프로토타입이 window에 붙이던 브라우저 헬퍼) — 웹 lib 이음새에만 둔다.
import type { Plan } from "@keystone/core/types";
import { computeLedger } from "@keystone/core/analytics";
import { trajMonthIdx } from "@/lib/trajectory";

export interface CloseoutSummary {
  invested: number;
  realized: number;
  realizedPct: number | null;
  avgBuy: number | null;
  avgSell: number | null;
  buyQty: number;
  rounds: number;
  holdDays: number | null;
  firstBuy: string | undefined;
  closedAt: string | undefined;
}

// invested = 총 투입(computeLedger.invested는 매도로 줄지 않음); avgSell = 매도대금 가중평균;
// holdDays = 공유 월-인덱스 타임라인으로 firstBuy→closedAt (source/ledger.jsx:196 verbatim).
export function closeoutSummary(plan: Plan): CloseoutSummary {
  const execs = plan.executions || [];
  const buys = execs.filter((e) => e.side === "buy");
  const sells = execs.filter((e) => e.side === "sell");
  const buyQty = buys.reduce((a, e) => a + e.qty, 0);
  const sellQty = sells.reduce((a, e) => a + e.qty, 0);
  const L = computeLedger(plan);
  const invested = L.totals.invested || plan.totalInvested || 0;
  const realized = plan.realizedPL != null ? plan.realizedPL : L.totals.realized;
  const avgBuy = buyQty > 0 ? buys.reduce((a, e) => a + e.qty * e.price, 0) / buyQty : plan.avgPrice;
  const avgSell = sellQty > 0 ? sells.reduce((a, e) => a + e.qty * e.price, 0) / sellQty : null;
  const realizedPct = invested > 0 ? (realized / invested) * 100 : null;
  // execs는 최신-우선 저장이므로 가장 오래된 매수가 배열 끝.
  const firstBuy = buys.length ? buys[buys.length - 1].date : plan.createdAt;
  const closedT = trajMonthIdx(plan.closedAt);
  const firstT = trajMonthIdx(firstBuy);
  const holdDays =
    firstBuy && plan.closedAt && closedT != null && firstT != null
      ? Math.max(0, Math.round((closedT - firstT) * 30.4))
      : null;
  return { invested, realized, realizedPct, avgBuy, avgSell, buyQty, rounds: buys.length, holdDays, firstBuy, closedAt: plan.closedAt };
}
