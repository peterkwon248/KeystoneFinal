// @keystone/core/analytics — plan-level derived metrics promoted from the prototype
// (source/data.jsx): return, tag, action lines, metric definitions, execution state,
// and gauge geometry. Ported verbatim; STRATEGIES / EXEC_STRATEGIES are imported from
// ../reference/index.ts (were globals guarded with `typeof … !== "undefined"`).

import type {
  ActionLines,
  GaugeData,
  L10n,
  Lang,
  Plan,
  PlanExecState,
  PlanReturn,
} from "../types/index.ts";
import { EXEC_STRATEGIES, STRATEGIES } from "../reference/index.ts";

// return rate from avg & current
export function planReturn(p: Plan): PlanReturn | null {
  if (p.avgPrice == null || !p.totalShares) return null;
  const rate = (p.currentPrice - p.avgPrice) / p.avgPrice * 100;
  const amt = (p.currentPrice - p.avgPrice) * p.totalShares;
  return { rate, amt };
}
// planTag — the distinguishing part of a plan name, with the ticker name stripped so it reads as a
// subtitle next to the (separately shown) ticker. "삼성전자 메모리 저평가" → "메모리 저평가".
// If the name doesn't contain the ticker name, return it whole (e.g. "코리아 디스카운트").
export function planTag(p: Plan, lang: Lang): string {
  const full = (p.name && (p.name[lang] || p.name.en)) || "";
  const tk = (p.tickerName && (p.tickerName[lang] || p.tickerName.en)) || "";
  if (!tk) return full;
  let out = full;
  // strip the ticker name wherever it sits, then tidy leftover separators/space
  out = out.split(tk).join(" ").replace(/\s{2,}/g, " ").replace(/^[\s·:,\-]+|[\s·:,\-]+$/g, "").trim();
  return out || full;
}
// gauge geometry: position of current price between bear & bull targets
export const SC_LABEL_MAP: Record<string, L10n> = { Bull: { en: "Bull", ko: "상단" }, Base: { en: "Base", ko: "중간" }, Bear: { en: "Bear", ko: "하단" } };
export function scLabel(enKey: string, lang: Lang): string { return (SC_LABEL_MAP[enKey] || ({} as Partial<L10n>))[lang] || enKey; }
// derive take-profit / stop-loss price from a plan's strategy fields (if defined)
export function planActionLines(p: Plan): ActionLines {
  const out: ActionLines = {};
  // per-plan overrides (set by dragging the SL/TP ticks) win over strategy-field defaults
  const st = STRATEGIES.find(s => s.id === p.strategyId);
  if (st && p.avgPrice != null) {
    const fieldPct = (key: string) => { const f = st.fields.find(x => x.key === key); if (!f) return null; const n = parseFloat(String(f.default).replace('%','')); return isNaN(n) ? null : n / 100; };
    const tp = fieldPct('tp_pct'); if (tp != null) out.tp = p.avgPrice * (1 + tp);
    const sl = fieldPct('stop_line'); if (sl != null) out.sl = p.avgPrice * (1 + sl);
  }
  if (p.tpPrice != null) out.tp = p.tpPrice;
  if (p.slPrice != null) out.sl = p.slPrice;
  return out;
}

// Scenario auto-status from current price vs its target — promoted verbatim from source/icons.jsx.
// tracking(추적) · approaching(근접) · realized(돌파, upside reached) · invalidated(이탈, downside reached)
export type ScAutoStatus = "tracking" | "approaching" | "realized" | "invalidated";
export function scAutoStatus(plan: { currentPrice?: number | null } | null | undefined, target: number | null | undefined): ScAutoStatus {
  const px = plan && plan.currentPrice;
  if (px == null || target == null) return "tracking";
  const up = target >= px;
  if (up) {
    if (px >= target) return "realized";
    if (px >= target * 0.97) return "approaching";
    return "tracking";
  }
  if (px <= target) return "invalidated";
  if (px <= target * 1.03) return "approaching";
  return "tracking";
}

// Scenario probability — explicit prob, else defaulted by case label. Promoted from source/DetailView.jsx.
export function scProbOf(s: { prob?: number; label?: { en?: string } }): number {
  if (typeof s.prob === "number") return s.prob;
  const en = (s.label && s.label.en) || "";
  return en === "Base" ? 50 : (en === "Bull" || en === "Bear") ? 25 : 20;
}

// METRIC_DEFS — plain-language definitions for the metrics shown on strategy / position / closeout cards.
// Hovering a metric label reveals its def. Keep them terse (Vector voice). Keyed by a stable id.
export const KS_METRIC_DEFS: Record<string, L10n> = {
  avg_cost:      { ko: "평균 매수 단가 — 취득원가 기준선. 현재가가 이보다 높으면 평가이익.", en: "Average buy price — your cost basis." },
  cur_price:     { ko: "현재 시장가격.", en: "Current market price." },
  eval_value:    { ko: "현재가 × 보유수량 — 지금 청산 시 평가액.", en: "Price × shares held — value if sold now." },
  invested:      { ko: "지금까지 투입한 총 원금.", en: "Total capital deployed so far." },
  pl:            { ko: "평가액 − 투자금. 아직 실현되지 않은 손익.", en: "Value minus cost — unrealized P/L." },
  next_buy:      { ko: "현재가가 이 가격 이하로 내려오면 다음 분할 매수가 발동 (평단 × (1 − LOC 기준)).", en: "Drops here → the next split buy triggers." },
  take_profit:   { ko: "평단 대비 목표 수익률에 닿는 가격. 도달 시 청산을 검토.", en: "Price at the target return — consider closing." },
  progress:      { ko: "전체 분할 회차 중 지금까지 매수한 비율.", en: "Share of total split rounds completed." },
  per_buy:       { ko: "정기 매수마다 투입하는 고정 금액.", en: "Fixed amount bought each period." },
  dca_interval:  { ko: "정기 매수 주기 — 가격과 무관하게 이 주기마다 매수.", en: "Scheduled buy cadence, regardless of price." },
  value_path:    { ko: "매월 목표로 하는 평가액 증가분. 부족하면 더, 넘으면 덜 매수.", en: "Target monthly value growth to track." },
  band_pos:      { ko: "설정 박스권에서 현재가 위치 (하단 0% ~ 상단 100%).", en: "Where price sits in the band (0–100%)." },
  buy_rung:      { ko: "한 칸 아래 그리드 라인 — 닿으면 한 단위 매수.", en: "Next grid line below — buy one rung." },
  sell_rung:     { ko: "한 칸 위 그리드 라인 — 닿으면 한 단위 매도.", en: "Next grid line above — sell one rung." },
  grid_step:     { ko: "한 칸(매수~매도) 사이 가격 간격. (상단 − 하단) ÷ 그리드 수.", en: "Price gap between rungs — (upper − lower) ÷ grids." },
  value_line:    { ko: "매년 일정 비율로 커지는 목표 평가액 경로. 이 선의 상·하단 밴드를 벗어나면 매도/매수.", en: "A target value path that grows yearly; trade when price leaves its bands." },
  sell_band:     { ko: "가치선 상단 밴드에 해당하는 주가 — 넘으면 일부 매도(트림).", en: "Upper-band price — trim above it." },
  buy_band:      { ko: "가치선 하단 밴드에 해당하는 주가 — 이탈하면 현금풀로 매수.", en: "Lower-band price — add below it." },
  rebal_state:   { ko: "가치선 밴드 대비 현재 위치 — 상단 초과면 매도, 하단 이탈이면 매수 신호.", en: "Position vs the value bands — trim above, add below." },
  trailing_stop: { ko: "고점 대비 일정 % 하락하면 청산하는 이탈선. 고점이 오르면 함께 올라감.", en: "Exit line trailing the high by a set %." },
  recent_high:   { ko: "보유 이후 기록한 최고가 — 트레일링 스탑 계산 기준.", en: "Highest price since entry — the stop's anchor." },
  cushion:       { ko: "현재가가 트레일링 스탑보다 얼마나 위에 있는지. 0에 가까울수록 청산 임박.", en: "How far price sits above the trailing stop." },
  lookback:      { ko: "모멘텀(상대강도)을 측정하는 과거 기간.", en: "Window used to measure momentum." },
  equity_target: { ko: "리밸런싱 시 맞추는 주식 비중 목표.", en: "Target equity weight at each rebalance." },
  rebal_cycle:   { ko: "포트폴리오 비중을 다시 맞추는 주기.", en: "How often the allocation is rebalanced." },
  realized_pl:   { ko: "청산으로 확정된 손익 (매도금 − 매수원가).", en: "Locked-in profit/loss from the close." },
  total_bought:  { ko: "보유 기간 동안 매수한 총 수량.", en: "Total shares bought over the holding." },
  hold_period:   { ko: "첫 매수부터 청산까지 보유한 일수.", en: "Days held from first buy to close." },
  shares:        { ko: "현재 보유 중인 주식 수.", en: "Shares currently held." },
};
export function metricDef(key: string | null | undefined): L10n | null { return key ? (KS_METRIC_DEFS[key] || null) : null; }

// planExecState — normalized "execution state + next signal" per strategy type.
// One place that knows how each strategy's next action is computed, so the strip/tooltip just renders.
// Shape: { ex, type, progress?{round,divisions,pct}, metrics:[{label,value,isMoney?}], signals:[{dir,label,value?,isMoney?,pctText?,sub?}] }
// dir ∈ buy | sell | tp | stop | time | info.  Labels are {en,ko}; values numeric (caller formats with plan.cur).
export function planExecState(p: Plan): PlanExecState | null {
  const ex = EXEC_STRATEGIES.find(s => s.id === p.execId);
  if (!ex) return null;
  const field = (k: string) => ex.fields ? ex.fields.find(x => x.key === k) : null;
  const fNum = (k: string, d: number) => { const f = field(k); if (!f) return d; const n = parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? d : n; };
  const fSel = (k: string) => { const f = field(k); if (!f) return null; if (Array.isArray(f.options)) { const o = f.options.find(o => o.en === f.default); if (o) return o; } return { en: f.default, ko: f.default }; };
  const avg = p.avgPrice || 0, cur = p.currentPrice, shares = p.totalShares || 0;
  const hasPos = shares > 0 && avg > 0;
  // hero = the headline figure for the card; tagline = short type descriptor; cells = stat-grid items.
  const out: PlanExecState = { ex, type: "generic", progress: null, hero: null, tagline: null, cells: [] };

  switch (p.execId) {
    case "ex1": { // 무한매수법 — split accumulation, price-triggered buys
      out.type = "split";
      out.tagline = { en: "Split accumulation", ko: "분할 누적 매수" };
      if (p.divisions && p.round != null) {
        const pct = Math.min(100, Math.round(p.round / p.divisions * 100));
        out.progress = { round: p.round, divisions: p.divisions, pct };
        out.hero = { kind: "pct", value: pct, dp: 0, tone: "accent", sub: { en: `round ${p.round}/${p.divisions}`, ko: `${p.round}/${p.divisions}회 진행` }, tip: "progress" };
      }
      if (avg > 0) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      const nextBuy = avg > 0 ? avg * (1 + fNum("loc_pct", -5) / 100) : null;
      if (nextBuy != null && cur > nextBuy) out.cells.push({ dir: "buy", label: { en: "Next buy", ko: "다음 매수가" }, value: nextBuy, isMoney: true, tip: "next_buy" });
      const tp = avg > 0 ? avg * (1 + fNum("tp_pct", 10) / 100) : null;
      if (tp != null) out.cells.push({ dir: "tp", label: { en: "Take profit", ko: "익절" }, value: tp, isMoney: true, tip: "take_profit" });
      break;
    }
    case "ex2": { // 정액분할매수 (DCA) — time-triggered fixed-amount buys
      out.type = "dca";
      out.tagline = { en: "Dollar-cost averaging", ko: "정액 분할" };
      const interval = fSel("interval") || { en: "Weekly", ko: "매주" };
      const amount = fNum("amount", 0);
      out.hero = { kind: "text", value: interval, tone: "accent", sub: { en: "scheduled buy", ko: "정기 매수" }, tip: "dca_interval" };
      out.cells.push({ dir: "time", label: { en: "Per buy", ko: "회당 매수금" }, value: amount, isMoney: true, tip: "per_buy" });
      if (hasPos) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      break;
    }
    case "ex3": { // 밸류애버리징 — buy toward a growing target value path
      out.type = "value_avg";
      out.tagline = { en: "Value averaging", ko: "경로 추종" };
      const path = fNum("target_path", 0);
      out.hero = { kind: "money", value: path, tone: "accent", sub: { en: "target / month", ko: "월 목표 경로" }, tip: "value_path" };
      if (hasPos) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      break;
    }
    case "ex4": { // 그리드 — two-sided rungs across a price band
      out.type = "grid";
      out.tagline = { en: "Grid band", ko: "박스권 격자" };
      const up = fNum("upper", 0), lo = fNum("lower", 0), grids = Math.max(1, fNum("grids", 10));
      const step = (up - lo) / grids;
      if (step > 0) {
        const posPct = Math.max(0, Math.min(100, (cur - lo) / ((up - lo) || 1) * 100));
        out.hero = { kind: "pct", value: posPct, dp: 0, tone: "neutral", sub: { en: "position in band", ko: "밴드 내 위치" }, tip: "band_pos" };
        let buyLine = null, sellLine = null;
        for (let i = 0; i <= grids; i++) { const line = lo + i * step; if (line < cur - 1e-6) buyLine = line; if (line > cur + 1e-6 && sellLine == null) sellLine = line; }
        if (buyLine != null) out.cells.push({ dir: "buy", label: { en: "Buy rung", ko: "하단 매수" }, value: buyLine, isMoney: true, tip: "buy_rung" });
        if (sellLine != null) out.cells.push({ dir: "sell", label: { en: "Sell rung", ko: "상단 매도" }, value: sellLine, isMoney: true, tip: "sell_rung" });
        out.cells.push({ label: { en: "Rung gap", ko: "그리드 간격" }, value: step, isMoney: true, tip: "grid_step" });
      }
      break;
    }
    case "ex5": { // 밸류리밸런싱 — trim above upper band / add below lower band of a value line
      out.type = "rebal";
      out.tagline = { en: "Value rebalance", ko: "가치선 밴드" };
      const upBand = fNum("vr_upper", 15) / 100, loBand = fNum("vr_lower", 15) / 100;
      let V = fNum("vr_vline", 0);
      if (!V) V = p.totalInvested || (avg * shares) || (cur * shares);
      if (V > 0 && shares > 0) {
        const sellPx = (V * (1 + upBand)) / shares, buyPx = (V * (1 - loBand)) / shares;
        if (cur > sellPx) out.hero = { kind: "pct", value: (cur / sellPx - 1) * 100, dp: 1, sign: "+", tone: "neg", sub: { en: "above band · trim", ko: "상단 초과 · 매도" }, tip: "rebal_state" };
        else if (cur < buyPx) out.hero = { kind: "pct", value: (1 - cur / buyPx) * 100, dp: 1, sign: "−", tone: "pos", sub: { en: "below band · add", ko: "하단 이탈 · 매수" }, tip: "rebal_state" };
        else out.hero = { kind: "text", value: { en: "In band", ko: "밴드 내" }, tone: "neutral", sub: { en: "holding", ko: "리밸런싱 대기" }, tip: "rebal_state" };
        out.cells.push({ dir: "sell", label: { en: "Sell band", ko: "상단 매도" }, value: sellPx, isMoney: true, tip: "sell_band" });
        out.cells.push({ dir: "buy", label: { en: "Buy band", ko: "하단 매수" }, value: buyPx, isMoney: true, tip: "buy_band" });
        out.cells.push({ label: { en: "Value line", ko: "가치선" }, value: V, isMoney: true, tip: "value_line" });
      }
      break;
    }
    case "ex6": { // 6:4 자산배분 — periodic allocation target (portfolio-level)
      out.type = "alloc";
      out.tagline = { en: "Asset allocation", ko: "자산배분" };
      const eq = fNum("equity_w", 60); const cyc = fSel("rebal") || { en: "Quarterly", ko: "분기마다" };
      out.hero = { kind: "pct", value: eq, dp: 0, tone: "neutral", sub: { en: "equity target", ko: "주식 목표비중" }, tip: "equity_target" };
      out.cells.push({ dir: "time", label: { en: "Rebalance", ko: "리밸런싱" }, value: cyc, isText: true, tip: "rebal_cycle" });
      break;
    }
    case "ex7": { // 모멘텀 — ride trend, exit on trailing stop (a SELL/exit line, not a buy)
      out.type = "momentum";
      out.tagline = { en: "Trend follow", ko: "추세 추종" };
      const stopPct = fNum("stop", -15) / 100;
      let high = cur;
      const ph = p.priceHistory;
      if (Array.isArray(ph) && ph.length) high = Math.max(high, ...ph.map(x => typeof x === "number" ? x : (x && (x.v ?? (x as any).price ?? (x as any).close)) || 0));
      high = Math.max(high, avg || 0);
      const stopPx = high * (1 + stopPct);
      const cushion = (cur - stopPx) / cur * 100;
      out.hero = { kind: "pct", value: cushion, dp: 1, sign: cushion >= 0 ? "+" : "−", tone: cushion >= 0 ? "pos" : "neg", sub: { en: "cushion to stop", ko: "스탑까지 여력" }, tip: "cushion" };
      out.cells.push({ label: { en: "Recent high", ko: "고점" }, value: high, isMoney: true, tip: "recent_high" });
      out.cells.push({ dir: "stop", label: { en: "Trailing stop", ko: "트레일링 스탑" }, value: stopPx, isMoney: true, tip: "trailing_stop" });
      const lb = field("lookback");
      if (lb) out.cells.push({ label: { en: "Lookback", ko: "조회 기간" }, value: String(lb.default), isText: true, tip: "lookback" });
      break;
    }
  }
  return out;
}
export function gaugeData(p: Plan): GaugeData | null {
  const bull = p.scenarios.find(s => s.label.en === "Bull");
  const base = p.scenarios.find(s => s.label.en === "Base");
  const bear = p.scenarios.find(s => s.label.en === "Bear");
  if (!bull || !bear) return null;
  // exit price for closed plans = last sell execution
  const sells = (p.executions || []).filter(e => e.side === "sell");
  const exitPrice = sells.length ? sells[0].price : null;
  // primary price: closed → exit, else current
  const primary = (p.status === "closed" && exitPrice != null) ? exitPrice : p.currentPrice;
  const hasAvg = p.avgPrice != null && ["active", "paused", "closing", "closed"].includes(p.status);
  const cand = [bear.target, bull.target, primary, p.currentPrice, ...p.scenarios.map(s => s.target)];
  if (hasAvg) cand.push(p.avgPrice as number);
  const lo = Math.min(...cand) * 0.99;
  const hi = Math.max(...cand) * 1.01;
  const span = (hi - lo) || 1;
  const at = (v: number) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  return {
    lo, hi, bull, base, bear,
    bearPos: at(bear.target), basePos: base ? at(base.target) : 50, bullPos: at(bull.target),
    pos: at(primary), primary, exitPrice,
    avgPos: hasAvg ? at(p.avgPrice as number) : null, avgPrice: hasAvg ? p.avgPrice : null,
    isExit: p.status === "closed" && exitPrice != null,
    dim: p.status === "closed",
  };
}
