-- Keystone S1+S2 — 보관함(archived_at) + adhoc 종목단독 시나리오
-- S1: plans.archived_at — 청산(status closed)과 별개 축. 어떤 상태의 플랜이든 보관/복구 가능.
-- S2: scenarios.plan_id nullable + ticker + user_id — 플랜 없이 종목 단독 시나리오(SECURITY_SCENARIOS 부활).

-- ── S1: 플랜 보관 (archived_at) ──────────────────────────────────────────────
alter table plans add column archived_at timestamptz;

-- 보관함 목록 조회용 부분 인덱스 (archived + 미삭제)
create index idx_plans_archived on plans(user_id, archived_at)
  where archived_at is not null and deleted_at is null;

-- ── S2: adhoc 종목단독 시나리오 ──────────────────────────────────────────────
alter table scenarios alter column plan_id drop not null;
alter table scenarios add column ticker  text references securities(ticker);
alter table scenarios add column user_id uuid references auth.users(id) on delete cascade;

-- 무결성: plan-scoped(plan_id 보유) 또는 adhoc(ticker+user_id 보유) 중 하나는 반드시 만족.
alter table scenarios add constraint scenarios_plan_or_adhoc check (
  plan_id is not null
  or (ticker is not null and user_id is not null)
);

-- adhoc 조회용 부분 인덱스
create index idx_scenarios_ticker on scenarios(user_id, ticker) where plan_id is null;

-- RLS 개정: plan_id 있으면 부모 플랜 소유로 판정, 없으면(adhoc) user_id 본인.
-- (기존 p_scenarios는 plan_id 조인만 봐서 adhoc(plan_id null) 행이 소유권 경로를 잃음 → 재정의 필수)
drop policy p_scenarios on scenarios;
create policy p_scenarios on scenarios using (
  (plan_id is not null and exists (select 1 from plans where plans.id = scenarios.plan_id and plans.user_id = auth.uid()))
  or (plan_id is null and user_id = auth.uid())
) with check (
  (plan_id is not null and exists (select 1 from plans where plans.id = scenarios.plan_id and plans.user_id = auth.uid()))
  or (plan_id is null and user_id = auth.uid())
);
-- GRANT: scenarios 는 이미 authenticated 전체 DML 부여됨(20260702000400_grants.sql) → 변경 불필요.
