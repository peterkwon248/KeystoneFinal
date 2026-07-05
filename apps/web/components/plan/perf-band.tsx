// source/trajectory.jsx PerfBand 이식 — 상세 뷰 성과 궤적 밴드 (시장가 vs 평단가 + 체결 마커 + 호버).
// planTrajectory는 @/lib/trajectory(이미 이식). closeoutSummary는 원본(source/ledger.jsx)의 순수
// 파생 함수라 이 파일에 국소 이식(computeLedger + trajMonthIdx 기반) — 청산 플랜 푸터 통계용.
"use client";
import React, { useState } from "react";
import type { I18nDict, Lang } from "@keystone/core/types";
import { computeLedger, planReturn } from "@keystone/core/analytics";
import { fmtCompact, fmtDate } from "@keystone/core/format";
import { PLAN_STATUS } from "@keystone/core/reference";
import { planTrajectory, trajMonthIdx, TRAJ_MONTHS } from "@/lib/trajectory";
import type { UIPlan } from "@/lib/plan-mapper";

// source/ledger.jsx closeoutSummary — 청산 플랜 회고 요약 (executions + 저장 realizedPL 파생).
function closeoutSummary(plan: UIPlan) {
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
  const firstBuy = buys.length ? buys[buys.length - 1].date : plan.createdAt; // execs stored latest-first
  const holdDays = (firstBuy && plan.closedAt
    && trajMonthIdx(plan.closedAt) != null && trajMonthIdx(firstBuy) != null)
    ? Math.max(0, Math.round((trajMonthIdx(plan.closedAt)! - trajMonthIdx(firstBuy)!) * 30.4)) : null;
  return { invested, realized, realizedPct, avgBuy, avgSell, buyQty, rounds: buys.length, holdDays, firstBuy, closedAt: plan.closedAt };
}

export function PerfBand({ plan, lang, t }: { plan: UIPlan; lang: Lang; t: I18nDict }) {
  const tj = planTrajectory(plan, plan.priceCloses);
  const [hov, setHov] = useState<{ s: typeof tj.samples[number]; ex: typeof tj.execs[number] | null; frac: number } | null>(null);
  const W = 760, H = 200, padL = 8, padR = 8, padT = 26, padB = 26;
  const t0 = tj.startT, t1 = Math.max(tj.endT, tj.todayT);
  const tspan = Math.max(0.5, t1 - t0);
  const x = (tt: number) => padL + ((tt - t0) / tspan) * (W - padL - padR);
  const vals = tj.samples.map((s) => s.mkt).concat(tj.samples.filter((s) => s.avg != null).map((s) => s.avg as number));
  const lo = Math.min(...vals), hi = Math.max(...vals), vspan = (hi - lo) || 1;
  const y = (v: number) => padT + (H - padT - padB) - ((v - lo) / vspan) * (H - padT - padB);
  const pts = tj.samples;
  const mktLine = pts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`).join(" ");
  const avgPts = pts.filter((s) => s.avg != null);
  const avgLine = avgPts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.avg as number).toFixed(1)}`).join(" ");
  // win/loss band segments
  const segs: { win: boolean; rows: typeof pts }[] = []; let cur: { win: boolean; rows: typeof pts } | null = null;
  pts.forEach((s) => {
    if (s.avg == null) { if (cur) { segs.push(cur); cur = null; } return; }
    const win = s.mkt >= s.avg;
    if (!cur || cur.win !== win) { if (cur) segs.push(cur); cur = { win, rows: [] }; }
    cur.rows.push(s);
  });
  if (cur) segs.push(cur);
  const won = tj.won;
  const lineColor = won == null ? "var(--fg-3)" : won ? "var(--pos)" : "var(--neg)";
  const money = (v: number) => fmtCompact(v, plan.cur);
  const todayX = x(tj.todayT);

  // hover crosshair: nearest sample (+ nearby execution) from mouse position
  const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const fx = ((ev.clientX - r.left) / r.width) * W;
    const tt = t0 + ((fx - padL) / (W - padL - padR)) * tspan;
    let s = pts[0];
    pts.forEach((p2) => { if (Math.abs(p2.t - tt) < Math.abs(s.t - tt)) s = p2; });
    let ex: typeof tj.execs[number] | null = null;
    tj.execs.forEach((e) => { if (Math.abs(e.t - tt) < tspan * 0.03 && (!ex || Math.abs(e.t - tt) < Math.abs(ex.t - tt))) ex = e; });
    setHov({ s, ex, frac: (x(s.t) - padL) / (W - padL - padR) });
  };
  const trajDate = (tt: number) => {
    const mi = Math.max(0, Math.min(TRAJ_MONTHS.length - 1, Math.floor(tt)));
    const day = Math.max(1, Math.min(31, Math.round((tt - mi) * 31) || 1));
    return fmtDate(TRAJ_MONTHS[mi] + " " + day, lang);
  };
  const hovRet = hov && hov.s.avg != null ? (hov.s.mkt / hov.s.avg - 1) * 100 : null;
  return (
    <div className="perfband">
      <div className="perfband-head">
        <span className="pb-title">{lang === "ko" ? "성과 궤적" : "Performance"}</span>
        <span className="pb-legend">
          <span><i className="pb-li mkt" style={{ background: lineColor }} />{lang === "ko" ? "시장가" : "Market"}</span>
          <span><i className="pb-li avg" />{lang === "ko" ? "평단가" : "Avg cost"}</span>
        </span>
      </div>
      <div className="perfband-plot" onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="perfband-svg" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={padL} y1={padT + (H - padT - padB) * g} x2={W - padR} y2={padT + (H - padT - padB) * g} stroke="var(--border)" strokeWidth="1" />)}
        {segs.map((seg, i) => {
          if (seg.rows.length < 2) return null;
          const top = seg.rows.map((s) => `${x(s.t).toFixed(1)} ${y(s.mkt).toFixed(1)}`);
          const bot = seg.rows.slice().reverse().map((s) => `${x(s.t).toFixed(1)} ${y(s.avg as number).toFixed(1)}`);
          return <path key={i} d={`M${top.join(" L")} L${bot.join(" L")} Z`} fill={seg.win ? "var(--pos)" : "var(--neg)"} opacity="0.15" />;
        })}
        {avgPts.length > 1 && <path d={avgLine} fill="none" stroke="var(--fg-3)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />}
        <path d={mktLine} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {tj.transitions.map((tr, i) => <line key={"t" + i} x1={x(tr.t)} y1={padT - 4} x2={x(tr.t)} y2={H - padB + 4} stroke={(PLAN_STATUS[tr.status as keyof typeof PLAN_STATUS] || {}).color} strokeWidth="1.5" opacity="0.4" strokeDasharray="2 2" />)}
        {tj.execs.map((e, i) => { const s = pts.reduce((a, b) => Math.abs(b.t - e.t) < Math.abs(a.t - e.t) ? b : a); return <circle key={"e" + i} cx={x(e.t)} cy={y(s.mkt)} r="3.5" fill={e.side === "buy" ? "var(--r-active)" : "var(--r-closing)"} stroke="var(--bg-app)" strokeWidth="1.5" />; })}
        <line x1={todayX} y1={padT - 4} x2={todayX} y2={H - padB + 4} stroke="var(--accent)" strokeWidth="1.5" opacity="0.55" />
        {plan.closedAt && <circle cx={x(tj.endT)} cy={y(tj.endPrice)} r="4.5" fill="var(--r-closed)" stroke="var(--bg-app)" strokeWidth="2" />}
        {hov && <g className="pb-hov">
          <line x1={x(hov.s.t)} y1={padT - 4} x2={x(hov.s.t)} y2={H - padB + 4} stroke="var(--fg-3)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
          <circle cx={x(hov.s.t)} cy={y(hov.s.mkt)} r="3.2" fill={lineColor} stroke="var(--bg-app)" strokeWidth="1.5" />
          {hov.s.avg != null && <circle cx={x(hov.s.t)} cy={y(hov.s.avg)} r="2.6" fill="var(--fg-3)" stroke="var(--bg-app)" strokeWidth="1.5" />}
        </g>}
      </svg>
      {hov && (
        <div className={"pb-tip" + (hov.frac > 0.62 ? " flip" : "")} style={{ left: (hov.frac * 100) + "%" }}>
          <div className="pb-tip-date">{trajDate(hov.s.t)}</div>
          <div className="gtip-row"><span className="gtip-lab">{lang === "ko" ? "시장가" : "Market"}</span><span className="gtip-val">{money(hov.s.mkt)}</span></div>
          {hov.s.avg != null && <div className="gtip-row"><span className="gtip-lab">{lang === "ko" ? "평단가" : "Avg cost"}</span><span className="gtip-val">{money(hov.s.avg)}</span></div>}
          {hovRet != null && <div className="gtip-row"><span className="gtip-lab">{t.retRate}</span><span className={"gtip-val " + (hovRet >= 0 ? "pos" : "neg")}>{(hovRet >= 0 ? "+" : "") + hovRet.toFixed(1) + "%"}</span></div>}
          {hov.ex && <>
            <div className="gtip-sep"></div>
            <div className="gtip-row"><span className="gtip-lab" style={{ color: hov.ex.side === "buy" ? "var(--r-active)" : "var(--r-closing)" }}>{hov.ex.side === "buy" ? (lang === "ko" ? "매수 체결" : "Buy") : (lang === "ko" ? "매도 체결" : "Sell")}</span><span className="gtip-val">{money(hov.ex.price)} × {hov.ex.qty}</span></div>
          </>}
        </div>
      )}
      </div>
      <div className="perfband-foot">
        {(() => {
          const r = planReturn(plan);
          const closed = plan.status === "closed";
          const closing = plan.status === "closing";
          const co = closed ? closeoutSummary(plan) : null;
          const sgn = (v: number) => (v >= 0 ? "+" : "");
          const holdCell = tj.holdDays != null
            ? <span key="hold" className="pb-stat" title={t.tip_pb_hold}><span className="pb-k">{t.holdPeriod}</span><span className="pb-v mono">{tj.holdDays}{lang === "ko" ? "일" : "d"}</span></span> : null;
          // total purchases (gross buys incl. carried-forward rounds) — money + share count
          const Lg = computeLedger(plan);
          const buyQty = Lg.rows.filter((rw) => rw.type === "buy").reduce((a, rw) => a + rw.e!.qty, 0);
          const buyAmt = Lg.totals.invested;
          const boughtCell = buyQty > 0
            ? <span key="bought" className="pb-stat" title={t.tip_bought}><span className="pb-k">{t.pb_bought}</span><span className="pb-v mono">{money(buyAmt)}<em className="pb-sub">{Math.round(buyQty).toLocaleString("en-US")}{lang === "ko" ? "주" : "sh"}</em></span></span> : null;
          // anchor: avg cost + current/exit price
          const stats: (React.ReactNode)[] = [
            <span key="avg" className="pb-stat" title={t.tip_avgCost}><span className="pb-k">{t.avg}</span><span className="pb-v mono">{money(plan.avgPrice ?? 0)}</span></span>,
            <span key="cur" className="pb-stat" title={closed ? t.tip_exitPrice : t.tip_current}><span className="pb-k">{closed ? t.exitL : t.current}</span><span className="pb-v mono">{money(closed && co ? (co.avgSell ?? 0) : tj.endPrice)}</span></span>,
          ];
          if (closed) {
            const rp = co ? co.realizedPct : null;
            stats.push(
              <span key="rret" className="pb-stat"><span className="pb-k">{t.realizedRet}</span><span className={"pb-v mono " + (rp == null ? "" : rp >= 0 ? "pos" : "neg")}>{rp == null ? "—" : sgn(rp) + rp.toFixed(1) + "%"}</span></span>,
              <span key="rpl" className="pb-stat" title={t.tip_pb_realizedSoFar}><span className="pb-k">{t.realizedPL}</span><span className={"pb-v mono " + (co && co.realized >= 0 ? "pos" : "neg")}>{co ? sgn(co.realized) + money(co.realized) : "—"}</span></span>,
              boughtCell,
              holdCell,
            );
          } else if (closing) {
            stats.push(
              <span key="rpl" className="pb-stat" title={t.tip_pb_realizedSoFar}><span className="pb-k">{t.pb_realizedSoFar}</span><span className={"pb-v mono " + ((plan.realizedPL || 0) >= 0 ? "pos" : "neg")}>{plan.realizedPL ? sgn(plan.realizedPL) + money(plan.realizedPL) : "—"}</span></span>,
              <span key="open" className="pb-stat" title={t.tip_pb_remain}><span className="pb-k">{t.pb_remainPL}</span><span className={"pb-v mono " + (r ? (r.amt >= 0 ? "pos" : "neg") : "")}>{r ? sgn(r.amt) + money(r.amt) : "—"}</span></span>,
              boughtCell,
              holdCell,
            );
          } else {
            // active / paused — return (% + ₩ sub), holding period, cost-basis change
            stats.push(
              <span key="ret" className="pb-stat" title={t.tip_retRate}><span className="pb-k">{t.retRate}</span><span className={"pb-v mono " + (tj.curRet == null ? "" : tj.curRet >= 0 ? "pos" : "neg")}>{tj.curRet == null ? "—" : sgn(tj.curRet) + tj.curRet.toFixed(1) + "%"}{r && <em className="pb-sub">{sgn(r.amt)}{money(r.amt)}</em>}</span></span>,
              boughtCell,
              holdCell,
              tj.avgImprovePct != null
                ? <span key="imp" className="pb-stat" title={t.tip_pb_avgImprove}><span className="pb-k">{t.pb_avgImprove}</span><span className={"pb-v mono " + (tj.avgImprovePct <= 0 ? "pos" : "neg")}>{sgn(tj.avgImprovePct)}{tj.avgImprovePct.toFixed(1)}%</span></span> : null,
            );
          }
          return stats.filter(Boolean);
        })()}
      </div>
      {tj.hasPosition && tj.peakRet != null && (
        <div className="perfband-journey">
          <span className="pbj-k" title={tj.isMockPath ? t.tip_pb_mock : undefined}>{t.pb_journey}{tj.isMockPath && <i className="pbj-mock">{t.pb_mock}</i>}</span>
          <span className="pbj-stat" title={t.tip_pb_peak}>{t.pb_peak}<b className="mono pos">+{tj.peakRet.toFixed(1)}%</b></span>
          <span className="pbj-stat" title={t.tip_pb_trough}>{t.pb_trough}<b className={"mono " + (tj.troughRet! >= 0 ? "pos" : "neg")}>{tj.troughRet! >= 0 ? "+" : ""}{tj.troughRet!.toFixed(1)}%</b></span>
          <span className="pbj-stat" title={t.tip_pb_mdd}>{t.pb_mdd}<b className="mono neg">{tj.mdd.toFixed(1)}%</b></span>
        </div>
      )}
    </div>
  );
}
