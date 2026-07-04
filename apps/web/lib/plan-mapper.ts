// DB rows(plans + scenarios + executions + securities) → 프로토타입 Plan 형태.
// core의 순수 로직(planReturn/gaugeData/planExecState/fmtRel…)이 기대하는 필드로 변환한다.
// ARCHITECTURE §7: 뷰/계산 로직은 그대로, 데이터 소스만 교체 — 이 파일이 그 이음새.
import type { Currency, L10n, Plan, PlanNote, PlanStatus, Scenario, ScenarioStatus, Execution, Rule } from "@keystone/core/types";
import { MON_EN } from "@keystone/core/format";
import { SC_LABEL_MAP } from "@keystone/core/analytics";
import { RULE_TRIGS } from "@keystone/core/reference";

// 커스텀 필드는 디자인에서 제거됨(source PropsSidebar 에 핸들러만 남은 vestigial 코드) — 웹에 이식하지 않음.

/** 사이드바 메모(투자 일지) 항목 — core PlanNote 에 프로토타입의 price/editedAt 부가필드 추가.
 *  core 타입은 골든 보호라 수정 불가 → 웹 이음새에서 확장한다. */
export interface UINote extends PlanNote {
  price?: number;
  editedAt?: number;
}

/** 리스트/보드/타임라인이 쓰는 Plan + DB 식별자 */
export interface UIPlan extends Plan {
  dbId: string;
  // 대시보드 히트맵 섹터 그룹핑용 — securities.sector({en,ko}) 또는 없으면 null.
  sector: { en: string; ko: string } | null;
}

/* DB scenario case → 프로토타입 시나리오 라벨/색.
   gaugeData는 label.en === "Bull"/"Base"/"Bear" 정확 일치로 찾으므로 라벨은 case에서 재구성한다. */
const SC_CASE: Record<string, { en: "Bull" | "Base" | "Bear"; color: string }> = {
  bull: { en: "Bull", color: "var(--r-bull)" },
  base: { en: "Base", color: "var(--r-base)" },
  bear: { en: "Bear", color: "var(--r-bear)" },
};

/** ISO date/timestamp → 프로토타입 "Mon D" (trajectory·fmtDate가 파싱하는 형식) */
export function toMonD(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${MON_EN[d.getMonth()]} ${d.getDate()}`;
}

/** ISO timestamp → 프로토타입 상대시간 토큰("now"|"3h"|"2d"|"1mo"|"1y") — fmtRel이 그대로 소화 */
export function toRelToken(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (isNaN(then.getTime())) return "";
  const s = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (s < 3600) return "now";
  const h = Math.floor(s / 3600);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 31) return `${d}d`;
  const mo = Math.floor(d / 30.4);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

/* supabase select 결과 행 (관계 포함) — 쿼리와 짝을 이루는 최소 타입 */
export interface DbPlanRow {
  id: string;
  human_id: string | null;
  portfolio_id: string | null;
  ticker: string;
  currency: string;
  name: L10n;
  status: PlanStatus;
  strategy_id: string | null;
  exec_id: string | null;
  eps: number | null;
  shares_out: number | null;
  realized_pl: number | null;
  custom_fields: Record<string, unknown>;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  securities: { name: L10n; market: string; last_close: number | null; shares_out: number | null; sector: L10n | null } | null;
  scenarios: {
    case_t: string; label: L10n | null; target: number; thesis: L10n | null;
    status: ScenarioStatus; color: string | null; is_auto: boolean; sort: number;
  }[];
  executions: { side: "buy" | "sell"; exec_date: string; price: number; quantity: number | null; amount: number | null; round_no: number | null }[];
  rules: { id: string; enabled: boolean; condition: DbRuleCondition | null; action: DbRuleAction | null; last_fired: string | null }[];
}

/* DB rules.condition jsonb — 트리거 인코딩 (dev-seed-plans.mjs가 쓰고 여기서 디코드) */
interface DbRuleCondition { type: string; op?: string; value?: number }
/* DB rules.action jsonb — 액션 인코딩 (action.type = RULE_ACTS id) */
interface DbRuleAction { type: string }

/* condition(type/op) → Rule.trig (strategy-web-spec 디코드 표) */
function decodeTrig(c: DbRuleCondition | null): { trig?: string; trigVal?: string } {
  if (!c) return {};
  switch (c.type) {
    case "price":
      return { trig: c.op === "gte" ? "price_ge" : "price_le", trigVal: c.value != null ? String(c.value) : undefined };
    case "return":
      return { trig: c.op === "lte" ? "ret_le" : "ret_ge", trigVal: c.value != null ? String(c.value) : undefined };
    case "loc": return { trig: "loc_hit" };
    case "bull_target": return { trig: "target_hit" };
    case "buy_fill": return { trig: "buy_exec" };
    default: return {};
  }
}

export function mapDbPlan(row: DbPlanRow, now: Date = new Date()): UIPlan {
  const cur = (row.currency === "KRW" ? "KRW" : "USD") as Currency;
  const currentPrice = Number(row.securities?.last_close ?? 0);
  const epsN = Number(row.eps ?? 0);

  // 체결 → 프로토타입 Execution + 평단/보유수량 롤업 (plan_positions 뷰와 같은 산식)
  const execRows = (row.executions ?? [])
    .slice()
    .sort((a, b) => a.exec_date.localeCompare(b.exec_date));
  const executions: Execution[] = [];
  let qty = 0, cost = 0, invested = 0, maxRound = 0, buys = 0;
  for (const e of execRows) {
    const p = Number(e.price);
    const q = e.quantity != null ? Number(e.quantity) : (e.amount != null && p > 0 ? Number(e.amount) / p : 0);
    executions.push({ side: e.side, price: p, qty: q, date: toMonD(e.exec_date), round: e.round_no });
    if (e.side === "buy") {
      cost += p * q; qty += q; invested += p * q; buys++;
      if (e.round_no != null) maxRound = Math.max(maxRound, e.round_no);
    } else {
      const avg = qty > 0 ? cost / qty : 0;
      cost -= avg * q; qty -= q;
    }
  }
  const avgPrice = qty > 0 ? cost / qty : null;

  // 시나리오: case_t 기준 Bull→Base→Bear 순 정렬 (프로토타입 배열 순서)
  const order = ["bull", "base", "bear"];
  const scenarios: Scenario[] = (row.scenarios ?? [])
    .slice()
    .sort((a, b) => order.indexOf(a.case_t) - order.indexOf(b.case_t))
    .map((s) => {
      const c = SC_CASE[s.case_t] ?? SC_CASE.base;
      const target = Number(s.target);
      return {
        label: SC_LABEL_MAP[c.en] ?? { en: c.en, ko: c.en },
        color: s.color || c.color,
        target,
        // 함의 PER = 목표가 / EPS (프로토타입 저장 s.per와 동치 — Simulator 산식). eps 없으면 0.
        per: epsN > 0 ? target / epsN : 0,
        status: s.status === "pending" ? "tracking" : s.status,
        thesis: s.thesis ?? undefined,
        isAuto: s.is_auto,
      };
    });
  // 내재가치(iv) 시드 = 기준(Base) 시나리오 target (source/data.jsx:809 문서화된 시드 의도).
  // ivHistory(가치 추세 궤적)는 GapTab 이식 때 mock 이음새로 (마일스톤 6 실데이터 교체).
  const baseSc = scenarios.find((s) => s.label.en === "Base");
  const iv = baseSc ? baseSc.target : undefined;

  // DB rules(condition/action/last_fired) → 리치 Rule (StrategyTab이 trig/act 드롭다운·evalRule에 사용).
  // name은 DB에 없어(코스메틱) trig의 RULE_TRIGS ko/en에서 파생. 시드 룰은 모두 custom/edited=false.
  const rules: Rule[] = (row.rules ?? []).map((r) => {
    const { trig, trigVal } = decodeTrig(r.condition);
    const act = r.action?.type;
    const td = trig ? RULE_TRIGS.find((x) => x.id === trig) : null;
    const name: L10n = td ? { en: td.en, ko: td.ko } : { en: "Rule", ko: "규칙" };
    return {
      id: r.id, on: r.enabled,
      last: r.last_fired ? toMonD(r.last_fired) : "Never",
      name, trig, trigVal, act,
      when: { en: "", ko: "" }, then: { en: "", ko: "" },
      custom: false, edited: false,
    };
  });

  const cf = row.custom_fields ?? {};
  // custom_fields.goal → plan.goal ({type:'return'|'price', value:number}) — 유효할 때만.
  const goalCf = cf.goal as { type?: unknown; value?: unknown } | undefined;
  const goal: Plan["goal"] | undefined =
    goalCf && (goalCf.type === "return" || goalCf.type === "price") && typeof goalCf.value === "number"
      ? { type: goalCf.type, value: goalCf.value }
      : undefined;
  const divisions = typeof cf.divisions === "number" ? cf.divisions
    : typeof cf.divisions === "string" && cf.divisions !== "" ? Number(cf.divisions) : undefined;

  // custom_fields.notes(배열) → plan.notes (사이드바 투자 일지). when 은 L10n({en,ko}) 저장이
  // 정본이나 옛 문자열도 렌더가 처리하므로 통과시킨다(유효성만 가드).
  const notesRaw = Array.isArray(cf.notes) ? (cf.notes as unknown[]) : [];
  const notes: UINote[] = notesRaw
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n) => {
      const when = n.when;
      const asL10n: L10n =
        when && typeof when === "object" && "en" in when
          ? (when as L10n)
          : { en: typeof when === "string" ? when : "", ko: typeof when === "string" ? when : "" };
      return {
        id: String(n.id ?? `nt${Math.random().toString(36).slice(2)}`),
        when: asL10n,
        text: String(n.text ?? ""),
        price: typeof n.price === "number" ? n.price : undefined,
        editedAt: typeof n.editedAt === "number" ? n.editedAt : undefined,
      };
    });

  return {
    dbId: row.id,
    id: row.human_id ?? `PLN-${row.id.slice(0, 4).toUpperCase()}`,
    ticker: row.ticker,
    tickerName: row.securities?.name ?? { en: row.ticker, ko: row.ticker },
    cur,
    name: row.name,
    status: row.status,
    portfolioId: row.portfolio_id,
    strategyId: row.strategy_id,
    execId: row.exec_id,
    currentPrice,
    avgPrice,
    totalShares: qty,
    totalInvested: invested,
    round: maxRound || (buys || null),
    divisions: divisions && divisions > 0 ? divisions : undefined,
    createdAt: toMonD(row.created_at),
    updatedAt: toRelToken(row.updated_at, now),
    closedAt: row.closed_at ? toMonD(row.closed_at) : undefined,
    realizedPL: row.realized_pl ?? undefined,
    eps: epsN,
    sharesOut: Number(row.shares_out ?? row.securities?.shares_out ?? 0),
    iv,
    goal,
    scenarios,
    executions,
    rules,
    notes,
    tpPrice: typeof cf.tpPrice === "number" ? cf.tpPrice : null,
    slPrice: typeof cf.slPrice === "number" ? cf.slPrice : null,
    sector: row.securities?.sector ?? null,
  };
}

/** plans 테이블 select 절 — mapDbPlan(DbPlanRow)과 짝 */
export const PLAN_SELECT = `
  id, human_id, portfolio_id, ticker, currency, name, status, strategy_id, exec_id,
  eps, shares_out, realized_pl, custom_fields, closed_at, created_at, updated_at,
  securities(name, market, last_close, shares_out, sector),
  scenarios(case_t, label, target, thesis, status, color, is_auto, sort),
  executions(side, exec_date, price, quantity, amount, round_no),
  rules(id, enabled, condition, action, last_fired)
`;
