// ledger.jsx — spreadsheet-style execution ledger (회차별 누적 장부).
// Every figure is DERIVED from executions: cumulative qty/invested, running avg,
// avg-delta per round, realized P&L on sells, and point-in-time unrealized P&L.
// If a plan's stored totals exceed the listed executions (older rounds omitted in
// mock data), an opening carry-forward row (이월) reconciles the ledger exactly.

function computeLedger(plan) {
  const execs = (plan.executions || []).slice().reverse(); // stored latest-first → chronological
  const rows = [];
  let qty = 0, cost = 0, realized = 0, invested = 0;

  // carry-forward: plan totals minus listed executions
  const netListedQty = execs.reduce((a, e) => a + (e.side === "buy" ? e.qty : -e.qty), 0);
  const listedBuyCost = execs.filter(e => e.side === "buy").reduce((a, e) => a + e.qty * e.price, 0);
  // Older rounds aren't itemized in plan.executions (only recent ones are stored).
  // For a uniform spreadsheet-style ledger we expand the omitted early rounds into
  // INDIVIDUAL deterministic rows that reconcile EXACTLY to the aggregate open basis
  // (same total qty + cost) — so totals are unchanged and every round reads 1,2,3,…
  // Real per-round history replaces these once live data is wired in.
  const hasSells = execs.some(e => e.side === "sell");
  if (plan.totalShares > 0 && plan.avgPrice != null) {
    const openQty = plan.totalShares - netListedQty;
    // Pure staged-buy: opening lot = stored total basis minus listed buys (exact).
    // Two-way (grid/리밸런싱, has sells): sells removed basis the buy-only plug can't
    // recover, so price the opening lot at the plan's avg cost (plausible) instead.
    const openCost = hasSells
      ? openQty * plan.avgPrice
      : plan.totalShares * plan.avgPrice - listedBuyCost;
    const listedRounds = execs.filter(e => e.round != null).map(e => e.round);
    const firstListedR = listedRounds.length ? Math.min(...listedRounds) : null;
    const nR = firstListedR ? firstListedR - 1 : 0;
    if (openQty > 0.01 && openCost > 0) {
      const basis = openCost / openQty;
      if (nR > 1 && openQty >= nR) {
        // expand into nR individual rounds (prices wobble around basis; last absorbs residual)
        let s = 0; const seed = (plan.ticker || plan.id || "x"); for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 233280;
        const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        // synthesize ascending dates BEFORE the first listed round
        const MON = (typeof TRAJ_MONTHS !== "undefined") ? TRAJ_MONTHS : ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"];
        const idxToDate = (ix) => { const mi = Math.max(0, Math.min(MON.length - 1, Math.floor(ix))); const d = Math.max(1, Math.min(28, Math.round((ix - Math.floor(ix)) * 31))); return MON[mi] + " " + d; };
        const listedIdx = execs.filter(e => e.date).map(e => (MON.indexOf(e.date.split(" ")[0]) + (parseInt(e.date.split(" ")[1] || "15") / 31))).filter(v => v >= 0);
        const firstListedIdx = listedIdx.length ? Math.min(...listedIdx) : MON.length - 1;
        const createdIdx = plan.createdAt ? (MON.indexOf(plan.createdAt.split(" ")[0]) + (parseInt(plan.createdAt.split(" ")[1] || "15") / 31)) : (firstListedIdx - nR * 0.5);
        const startIdx = (createdIdx >= 0 && createdIdx < firstListedIdx) ? createdIdx : Math.max(0, firstListedIdx - nR * 0.4);
        const qBase = Math.floor(openQty / nR);
        let accQ = 0, accC = 0;
        for (let i = 1; i <= nR; i++) {
          let q, p;
          if (i < nR) {
            q = qBase;
            const drift = (i / nR - 0.5) * 0.10;            // gentle upward drift toward listed rounds
            p = basis * (1 + drift + (rnd() - 0.5) * 0.06); // ±3% wobble
          } else {
            q = openQty - accQ;                              // last round absorbs the remainder
            p = (openCost - accC) / q;                       // exact cost reconciliation
          }
          accQ += q; accC += q * p;
          const dt = idxToDate(startIdx + (firstListedIdx - startIdx) * ((i - 1) / nR));
          const prevAvg = qty > 0 ? cost / qty : null;
          qty += q; cost += q * p; invested += q * p;
          const avg = cost / qty;
          rows.push({ type: "buy", e: { side: "buy", price: p, qty: q, round: i, date: dt, synth: true },
            qty, invested, avg, dAvg: prevAvg != null ? avg - prevAvg : null,
            pnl: (p - avg) * qty, pnlPct: avg > 0 ? (p / avg - 1) * 100 : 0 });
        }
      } else if (hasSells) {
        // two-way strategy (grid/리밸런싱): no sequential "회차" — a single opening lot,
        // priced at avg cost, that the listed buys/sells build on. No round span.
        qty = openQty; cost = openCost; invested = openCost;
        rows.push({ type: "open", base: true, qty: openQty, cost: openCost, avg: basis });
      } else {
        // pure staged-buy with omitted early rounds → single carry-forward (이월) summary.
        // Estimate how many omitted executions it represents (avg listed buy size) so the
        // unified sequence continues correctly across it.
        const cfBuys = execs.filter(e => e.side === "buy");
        const cfTypQ = cfBuys.length ? cfBuys.reduce((a, e) => a + e.qty, 0) / cfBuys.length : openQty;
        const cfEst = Math.max(1, Math.round(openQty / Math.max(1, cfTypQ)));
        qty = openQty; cost = openCost; invested = openCost;
        rows.push({ type: "open", fromR: 1, toR: nR > 0 ? nR : cfEst, qty: openQty, cost: openCost, avg: basis });
      }
    }
  }

  execs.forEach(e => {
    const prevAvg = qty > 0 ? cost / qty : null;
    if (e.side === "buy") {
      qty += e.qty; cost += e.qty * e.price; invested += e.qty * e.price;
      const avg = cost / qty;
      rows.push({ type: "buy", e, qty, invested, avg, dAvg: prevAvg != null ? avg - prevAvg : null,
        pnl: (e.price - avg) * qty, pnlPct: avg > 0 ? (e.price / avg - 1) * 100 : 0 });
    } else {
      const avg = prevAvg || e.price;
      const r = (e.price - avg) * e.qty;
      realized += r; qty -= e.qty; cost -= avg * e.qty;
      rows.push({ type: "sell", e, qty, invested, avg: qty > 0 ? cost / qty : avg, dAvg: null,
        realized: r, realizedPct: avg > 0 ? (e.price / avg - 1) * 100 : 0,
        pnl: qty > 0 ? (e.price - avg) * qty : null });
    }
  });

  // Unified execution sequence (체결 순번): number every row oldest→newest, sells included.
  // The carry-forward summary spans the range of omitted executions it aggregates.
  let seqN = 0;
  for (const r of rows) {
    if (r.type === "open") {
      if (r.base) continue; // opening lot is unnumbered (기초); real fills start at 1
      const span = Math.max(1, (r.toR || r.fromR) - r.fromR + 1);
      r.seqFrom = seqN + 1; r.seqTo = seqN + span; seqN += span;
    } else {
      r.seq = ++seqN;
    }
  }

  const avgNow = qty > 0 ? cost / qty : null;
  const unreal = qty > 0 && avgNow != null ? (plan.currentPrice - avgNow) * qty : 0;
  return { rows, totals: { qty, cost, invested, realized, avg: avgNow, unreal, combined: realized + unreal } };
}

function ExecutionLedger({ plan, t, lang }) {
  const L = computeLedger(plan);
  const money = (v) => fmtMoney(plan.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v), plan.cur);
  const amt = (v) => fmtCompact(v, plan.cur);
  const sgn = (v, f) => (v >= 0 ? "+" : "") + f(Math.abs(v) * Math.sign(v));
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
                <td><span className="exec-round">{r.base ? (ko ? "기초" : "Base") : `${r.seqFrom}${r.seqTo > r.seqFrom ? "–" + r.seqTo : "+"}`}</span></td>
                <td colSpan={2} style={{ color: "var(--fg-4)" }}>{r.base ? (ko ? "기초 보유 (전략 시작 시점)" : "Opening position") : (ko ? "이월 (이전 회차 합산)" : "Carried forward")}</td>
                <td className="num mono">{money(r.avg)}</td>
                <td className="num mono">{Math.round(r.qty)}</td>
                <td className="num mono">{amt(r.cost)}</td>
                <td className="num mono sep">{Math.round(r.qty)}</td>
                <td className="num mono">{amt(r.cost)}</td>
                <td className="num mono">{money(r.avg)}</td>
                <td className="num mono dim">—</td><td className="num mono dim sep">—</td>
              </tr>
            );
            const e = r.e, buy = r.type === "buy";
            return (
              <tr key={i} className={buy ? "" : "lg-sell"}>
                <td><span className="exec-round">{r.seq}</span></td>
                <td className="mono lg-date">{e.date}</td>
                <td><span className="exec-side" style={{ color: buy ? "var(--r-active)" : "var(--r-closing)" }}>
                  <Lic name={buy ? "arrow-down-left" : "arrow-up-right"} size={12} cls="icon-sm" color="inherit" />{buy ? t.buy : t.sell}</span></td>
                <td className="num mono">{money(e.price)}</td>
                <td className="num mono">{buy ? e.qty : "−" + e.qty}</td>
                <td className="num mono">{amt(e.price * e.qty)}</td>
                <td className="num mono sep">{Math.round(r.qty)}</td>
                <td className="num mono">{amt(r.invested)}</td>
                <td className="num mono">{r.avg != null && r.qty > 0 ? money(r.avg) : (!buy && r.avg != null ? <span className="dim" title={t.tip_avgCost}>{money(r.avg)}</span> : "—")}</td>
                <td className={"num mono " + (r.dAvg == null ? "dim" : r.dAvg < 0 ? "pos" : "dim")}>
                  {r.dAvg == null ? "—" : (r.dAvg < 0 ? "▼" : "▲") + money(Math.abs(r.dAvg)).replace(/^[₩$]/, "")}</td>
                <td className={"num mono sep " + ((buy ? r.pnlPct : r.realizedPct) >= 0 ? "pos" : "neg")}>
                  {buy
                    ? sgn(r.pnlPct, v => v.toFixed(1)) + "%"
                    : sgn(r.realized, amt) + " (" + sgn(r.realizedPct, v => v.toFixed(1)) + "%)"}
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

// retrospective summary for a CLOSED plan — derived from executions + stored realizedPL.
// invested = total ever deployed (computeLedger.invested is never reduced on sells);
// avgSell = proceeds-weighted; holdDays via the shared month-index timeline.
function closeoutSummary(plan) {
  const execs = plan.executions || [];
  const buys = execs.filter(e => e.side === "buy");
  const sells = execs.filter(e => e.side === "sell");
  const buyQty = buys.reduce((a, e) => a + e.qty, 0);
  const sellQty = sells.reduce((a, e) => a + e.qty, 0);
  const L = computeLedger(plan);
  const invested = L.totals.invested || plan.totalInvested || 0;
  const realized = plan.realizedPL != null ? plan.realizedPL : L.totals.realized;
  const avgBuy = buyQty > 0 ? buys.reduce((a, e) => a + e.qty * e.price, 0) / buyQty : plan.avgPrice;
  const avgSell = sellQty > 0 ? sells.reduce((a, e) => a + e.qty * e.price, 0) / sellQty : null;
  const realizedPct = invested > 0 ? (realized / invested) * 100 : null;
  const firstBuy = buys.length ? buys[buys.length - 1].date : plan.createdAt; // execs stored latest-first
  const holdDays = (typeof trajMonthIdx === "function" && firstBuy && plan.closedAt
    && trajMonthIdx(plan.closedAt) != null && trajMonthIdx(firstBuy) != null)
    ? Math.max(0, Math.round((trajMonthIdx(plan.closedAt) - trajMonthIdx(firstBuy)) * 30.4)) : null;
  return { invested, realized, realizedPct, avgBuy, avgSell, buyQty, rounds: buys.length, holdDays, firstBuy, closedAt: plan.closedAt };
}

Object.assign(window, { computeLedger, ExecutionLedger, closeoutSummary });
