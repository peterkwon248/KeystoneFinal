-- Keystone 마일스톤 2 — RLS 정책 (DATA_MODEL.md §7)

-- 사용자 소유 테이블: 본인 행만
alter table profiles         enable row level security;
alter table portfolios       enable row level security;
alter table plans            enable row level security;
alter table scenarios        enable row level security;
alter table executions       enable row level security;
alter table rules            enable row level security;
alter table journal_entries  enable row level security;
alter table saved_views      enable row level security;
alter table watchlist        enable row level security;

-- profiles: 본인 = id
create policy p_profiles on profiles using (id = auth.uid()) with check (id = auth.uid());

-- user_id 직접 보유 테이블 공통 패턴
create policy p_portfolios  on portfolios  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_plans       on plans       using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_journal     on journal_entries using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_views       on saved_views using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_watchlist   on watchlist   using (user_id = auth.uid()) with check (user_id = auth.uid());

-- plan 하위(부모 소유로 판정)
create policy p_scenarios on scenarios using (
  exists (select 1 from plans where plans.id = scenarios.plan_id and plans.user_id = auth.uid())
) with check (
  exists (select 1 from plans where plans.id = scenarios.plan_id and plans.user_id = auth.uid())
);
create policy p_executions on executions using (
  exists (select 1 from plans where plans.id = executions.plan_id and plans.user_id = auth.uid())
) with check (
  exists (select 1 from plans where plans.id = executions.plan_id and plans.user_id = auth.uid())
);
create policy p_rules on rules using (
  exists (select 1 from plans where plans.id = rules.plan_id and plans.user_id = auth.uid())
) with check (
  exists (select 1 from plans where plans.id = rules.plan_id and plans.user_id = auth.uid())
);

-- 공유 참조 데이터: 읽기 전역, 쓰기 서비스롤 전용(RLS로 익명/유저 쓰기 차단)
alter table securities          enable row level security;
alter table security_financials enable row level security;
alter table strategies          enable row level security;
alter table exec_strategies     enable row level security;
alter table exec_categories     enable row level security;

create policy r_securities  on securities          for select using (true);
create policy r_financials  on security_financials for select using (true);
create policy r_strategies  on strategies          for select using (true);
create policy r_execstrat   on exec_strategies     for select using (true);
-- exec_categories: 전역(user_id null) + 본인 커스텀 읽기, 본인 것만 쓰기
create policy r_execcat_sel on exec_categories for select using (user_id is null or user_id = auth.uid());
create policy r_execcat_mod on exec_categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- 참조 데이터 쓰기는 service_role 키(서버 어댑터)만 → 별도 정책 없이 RLS가 기본 차단
