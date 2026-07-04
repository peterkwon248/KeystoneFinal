"use server";
// 플랜 생성(compose) + 포트폴리오 인라인 생성 서버액션 — source/App.jsx createPlan/createPortfolioNamed 이식.
// createPlan: plans insert + Bull/Base/Bear 자동 시나리오(scenFromSec 가격배수 폴백) insert. memo→Base 근거.
// ⚠ 웹 적응: plans.ticker는 securities FK → 실 종목만(미등록 티커 mock 분기 제거). currency/shares_out은 securities에서.
//   eps는 securities/financials에 없어(마일스톤6) null — 자동 시나리오 target은 가격배수라 eps 불필요.
// supabase-js 빌더는 lazy thenable 이라 반드시 await. RLS로 소유자만.
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json, PlanStatus, ScenarioStatus } from "@keystone/core/types";
import { autoRulesFor } from "@/lib/rules-from-strategy";

export type CreatePlanInput = {
  name: string;
  ticker: string;
  memo?: string;
  status?: PlanStatus;  // 기본 research
  portfolioId?: string | null;
  execId?: string | null; // 전략(실행: 무한매수법·그리드 등) → plans.exec_id
};

/** 다음 human_id(PLN-NNN) — 유저 스코프 최대치 +1. */
function nextHumanId(existing: (string | null)[]): string {
  const max = existing.reduce((m, h) => {
    const n = h && /^PLN-(\d+)$/.exec(h);
    return n ? Math.max(m, parseInt(n[1], 10)) : m;
  }, 0);
  return "PLN-" + String(max + 1).padStart(3, "0");
}

/** 가격배수 폴백 자동 시나리오(scenFromSec의 !hasBand 분기) — target은 가격×(bull1.3/base1.1/bear0.75), 반올림. */
function autoScenarios(price: number, cur: string, memo: string) {
  const rnd = (v: number) => (cur === "USD" ? Math.round(v) : Math.round(v / 100) * 100);
  const base = (kind: "bull" | "base" | "bear") => rnd(price * (kind === "bull" ? 1.3 : kind === "base" ? 1.1 : 0.75));
  const mk = (
    caseT: "bull" | "base" | "bear", color: string, status: ScenarioStatus,
    label: { en: string; ko: string }, thesis: { en: string; ko: string },
  ) => ({ case_t: caseT, label, target: base(caseT), thesis, status, color, is_auto: true, sort: 0 });
  return [
    mk("bull", "var(--r-bull)", "tracking", { en: "Bull", ko: "상단" }, { en: "Upside case.", ko: "상승 시나리오." }),
    mk("base", "var(--r-base)", "approaching", { en: "Base", ko: "중간" },
      memo ? { en: memo, ko: memo } : { en: "Base case.", ko: "기본 시나리오." }),
    mk("bear", "var(--r-bear)", "tracking", { en: "Bear", ko: "하단" }, { en: "Downside case.", ko: "하락 시나리오." }),
  ];
}

/** 플랜 생성 → 새 플랜 dbId 반환(호출측이 상세로 네비게이션). */
export async function createPlan(input: CreatePlanInput): Promise<string> {
  const name = input.name.trim();
  const ticker = input.ticker.trim().toUpperCase();
  if (!name) throw new Error("플랜 이름이 필요합니다.");
  if (!ticker) throw new Error("종목을 선택하세요.");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 종목(FK) — currency/shares_out/last_close. 미등록 티커면 실패(웹은 실 종목만).
  const { data: sec, error: secErr } = await supabase
    .from("securities").select("ticker, currency, shares_out, last_close").eq("ticker", ticker).maybeSingle();
  if (secErr) throw new Error(secErr.message);
  if (!sec) throw new Error("등록되지 않은 종목입니다.");

  const { data: existing, error: exErr } = await supabase
    .from("plans").select("human_id").eq("user_id", user.id);
  if (exErr) throw new Error(exErr.message);
  const humanId = nextHumanId((existing ?? []).map((r) => r.human_id));

  const price = Number(sec.last_close ?? 0);
  const { data: planRow, error: planErr } = await supabase.from("plans").insert({
    user_id: user.id,
    human_id: humanId,
    ticker: sec.ticker,
    currency: sec.currency,
    name: { en: name, ko: name },
    status: input.status ?? "research",
    portfolio_id: input.portfolioId ?? null,
    exec_id: input.execId ?? null,
    shares_out: sec.shares_out,
  }).select("id").single();
  if (planErr) throw new Error(planErr.message);

  // 자동 시나리오 3건(가격 있을 때만 — 가격 0이면 target 0이라 생략).
  if (price > 0) {
    const scens = autoScenarios(price, sec.currency, (input.memo ?? "").trim())
      .map((s) => ({ ...s, plan_id: planRow.id }));
    const { error: scErr } = await supabase.from("scenarios").insert(scens);
    if (scErr) throw new Error(scErr.message);
  }

  // 전략 자동 규칙 물질화(생성 시점엔 목표 없음 → 전략 규칙만). 무한매수법 등 → LOC매수+익절.
  const ruleSpecs = autoRulesFor(input.execId ?? null, null);
  if (ruleSpecs.length) {
    const { error: rErr } = await supabase.from("rules").insert(
      ruleSpecs.map((s) => ({
        plan_id: planRow.id, enabled: true,
        condition: s.condition as unknown as Json, action: s.action as unknown as Json,
        is_auto: true, edited: false, source: s.source,
      })),
    );
    if (rErr) throw new Error(rErr.message);
  }

  revalidatePath("/plans");
  return planRow.id;
}

/** 포트폴리오 인라인 생성(ComposeModal 포트폴리오 드롭다운) → {id, name}. */
export async function createPortfolio(name: string): Promise<{ id: string; name: string }> {
  const nm = name.trim();
  if (!nm) throw new Error("포트폴리오 이름이 필요합니다.");
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("portfolios").insert({ user_id: user.id, name: nm }).select("id, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/plans");
  return { id: data.id, name: data.name };
}
