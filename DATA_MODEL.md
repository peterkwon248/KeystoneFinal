# Keystone — 데이터 모델 (Postgres DDL + RLS)

> **목적.** `ARCHITECTURE.md` §4의 산문 스키마를 **Claude Code가 그대로 마이그레이션으로 옮길 수 있는 구체 DDL**로 확정한다. 대상 = **Supabase Postgres**. 모든 사용자 소유 테이블은 `user_id uuid` + **RLS(`user_id = auth.uid()`)** 로 격리한다.
>
> **규칙**
> - 사용자 소유 테이블 PK = `uuid default gen_random_uuid()`. 참조/공유 테이블(securities/strategies/…) PK = 안정적 `text`(ticker, slug).
> - 금액·가격 = `numeric`(부동소수 금지). 통화는 **종목 네이티브로 저장**, 표시통화 환산은 클라이언트 포맷 시(§ARCHITECTURE 12).
> - 다국어 필드(name/label/thesis 등)는 `jsonb` `{"en": "...", "ko": "..."}`.
> - 파생값(현재가·평단·손익·시나리오 상태)은 **저장하지 않고** executions/시세에서 롤업. 예외: 성능상 캐시가 필요하면 명시적 `*_cached` 컬럼 + 트리거.
> - 모든 테이블에 `created_at timestamptz default now()`, 변경형은 `updated_at`(트리거로 갱신).

---

## 0. 확장 & 공통

```sql
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- updated_at 자동 갱신 트리거 (모든 변경형 테이블에 부착)
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
```

---

## 1. Enum 타입

```sql
create type market_t        as enum ('KR', 'US');
create type plan_status_t   as enum ('research', 'planning', 'active', 'paused', 'closing', 'closed');
create type scenario_case_t as enum ('bull', 'base', 'bear');
create type scenario_status_t as enum ('pending', 'tracking', 'approaching', 'realized', 'invalidated');
create type exec_side_t     as enum ('buy', 'sell');
create type auth_provider_t as enum ('google', 'apple', 'kakao', 'naver', 'email');
create type sub_tier_t      as enum ('free', 'pro');           -- 추후 확장
create type view_scope_t    as enum ('plans', 'screener');
create type fin_source_t    as enum ('dart', 'edgar', 'seed'); -- seed = 프로토타입 잔재
```

> **케이스 매핑:** 프로토타입은 `label {en:"Base",ko:"중간"}` 로 표시하지만 저장 enum은 `bull/base/bear`. UI 라벨은 i18n에서(상단/중간/하단). 저장은 enum, 표시는 파생.

---

## 2. 계정 / 프로필

```sql
-- Supabase auth.users 는 내장. 앱 프로필은 1:1 확장.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  provider      auth_provider_t not null default 'email',
  email_verified boolean not null default false,
  display_name  text,
  prefs         jsonb not null default '{"lang":"ko","theme":"dark","displayCurrency":null,"markets":["KR","US"]}',
  sidebar       jsonb not null default '{}',          -- {cfg, order, pinned}  (keystone-sidebar-v2)
  subscription_tier sub_tier_t not null default 'free',
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger t_profiles_upd before update on profiles for each row execute function set_updated_at();
```

---

## 3. 포트폴리오

```sql
create table portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  base_currency text not null default 'KRW',
  sort          int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_portfolios_user on portfolios(user_id);
create trigger t_portfolios_upd before update on portfolios for each row execute function set_updated_at();
```

---

## 4. 공유 참조 데이터 (user 소유 아님 — 서버/시드가 채움)

### securities

```sql
create table securities (
  ticker      text primary key,                 -- "005930", "AAPL"
  name        jsonb not null,                    -- {en, ko}
  market      market_t not null,
  currency    text not null,                     -- "KRW" | "USD"
  sector      jsonb,                             -- 세부 산업 {en, ko} (레거시 표시용)
  gics        jsonb,                             -- GICS 11 섹터 {en, ko}  ← 필터/그룹의 정본
  exchange    text,                              -- KOSPI/KOSDAQ/NYSE/NASDAQ (ADR 대비, 표시 안 함)
  shares_out  numeric,
  last_close  numeric,                           -- 최근 종가 캐시(시세는 실시간/캐시)
  updated_at  timestamptz not null default now()
);
create index idx_securities_market on securities(market);
create trigger t_securities_upd before update on securities for each row execute function set_updated_at();
```

### security_financials  (= 프로토타입 FIN_SEED)

```sql
create table security_financials (
  ticker           text not null references securities(ticker) on delete cascade,
  fiscal_year      int  not null,
  revenue          numeric,
  operating_margin numeric,
  net_margin       numeric,
  roe              numeric,
  gross_margin     numeric,
  debt_ratio       numeric,
  current_ratio    numeric,
  dividend_yield   numeric,
  revenue_growth   numeric,
  unit             text,                          -- 억원 | 백만$ 등
  source           fin_source_t not null default 'seed',
  as_of            date,
  primary key (ticker, fiscal_year)
);
```
> K-IFRS(KR) vs US-GAAP(US) 차이는 `securities.market` 으로 분기. 프로토타입이 이미 `plan.cur` 로 분기하는 스키마를 가짐 — 어댑터(§API)가 각 표준을 이 공통 컬럼으로 정규화.

### strategies (관점/lens) · exec_strategies (전략) · exec_categories

```sql
create table strategies (           -- 관점 (밸류에이션 프레임)
  id          text primary key,      -- "st1"
  name        jsonb not null,        -- {en, ko}
  color       text,
  model       text,                  -- 'PER'|'PBR'|'PSR'|'DDM'|'EV'|null
  thresholds  jsonb,                 -- { METRIC: {dir, good, warn} }  채점 임계값
  grade_focus text[],                -- 강조 지표 키
  sort        int not null default 0
);

create table exec_categories (       -- 전략 카테고리
  id       text primary key,
  label    jsonb not null,           -- {en, ko}
  user_id  uuid references auth.users(id) on delete cascade,  -- null = 전역 프리셋; 값 있으면 유저 커스텀
  sort     int not null default 0
);

create table exec_strategies (       -- 전략 (실행 방식)
  id          text primary key,      -- "ex1"
  name        jsonb not null,        -- {en, ko}
  color       text,
  category_id text references exec_categories(id),
  sort        int not null default 0
);
```
> `strategies.thresholds` 가 스크리너/재무 채점의 **단일 소스**(프로토타입도 이 하나만 고치면 전 화면 반영). `metric_dictionary`(지표 개념/공식/등급밴드)는 정적이라 `packages/core` 상수로 두고 DB 테이블화하지 않아도 됨.

---

## 5. 플랜 & 하위 (사용자 소유 — 최우선)

```sql
create table plans (
  id           uuid primary key default gen_random_uuid(),
  human_id     text,                              -- "PLN-001" 표시용(팀/유저 스코프 유니크는 앱에서)
  user_id      uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid references portfolios(id) on delete set null,
  ticker       text not null references securities(ticker),
  currency     text not null,                     -- 종목 네이티브 고정
  name         jsonb not null,                    -- {en, ko}
  status       plan_status_t not null default 'research',
  strategy_id  text references strategies(id),      -- 관점(lens)
  exec_id      text references exec_strategies(id), -- 전략(실행)
  eps          numeric,
  shares_out   numeric,
  realized_pl  numeric,
  custom_fields jsonb not null default '{}',
  closed_at    timestamptz,
  deleted_at   timestamptz,                        -- 소프트삭제(휴지통)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_plans_user   on plans(user_id) where deleted_at is null;
create index idx_plans_ticker on plans(ticker);
create index idx_plans_status on plans(user_id, status) where deleted_at is null;
create trigger t_plans_upd before update on plans for each row execute function set_updated_at();

create table scenarios (
  id       uuid primary key default gen_random_uuid(),
  plan_id  uuid not null references plans(id) on delete cascade,
  case_t   scenario_case_t not null,
  label    jsonb not null,                         -- {en, ko}
  target   numeric not null,
  thesis   jsonb,                                  -- {en, ko}
  status   scenario_status_t not null default 'pending',
  color    text,
  is_auto  boolean not null default false,
  sort     int not null default 0
);
create index idx_scenarios_plan on scenarios(plan_id);

create table executions (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references plans(id) on delete cascade,
  side      exec_side_t not null,
  exec_date date not null,
  price     numeric not null,
  quantity  numeric,
  amount    numeric,                               -- price*qty 또는 정액매수 금액
  round_no  int,
  note      text,
  created_at timestamptz not null default now()
);
create index idx_executions_plan on executions(plan_id);

create table rules (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references plans(id) on delete cascade,
  enabled   boolean not null default true,
  condition jsonb not null,                        -- {type, metric?, op, value, scenarioCase?}
  action    jsonb not null,                        -- {type: notify|status_transition|..., ...}
  last_fired timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_rules_plan on rules(plan_id);
create trigger t_rules_upd before update on rules for each row execute function set_updated_at();
```

> **롤업(파생값):** 현재가·평단·투입액·미실현손익·시나리오 status 는 저장하지 않고 executions + 실시간 시세로 계산(프로토타입 Dashboard 방식). 필요 시 뷰로:
> ```sql
> create view plan_positions as
> select p.id as plan_id, p.ticker,
>   sum(case when e.side='buy'  then coalesce(e.amount, e.price*e.quantity) else 0 end) as bought,
>   sum(case when e.side='sell' then coalesce(e.amount, e.price*e.quantity) else 0 end) as sold,
>   sum(case when e.side='buy' then e.quantity else -e.quantity end) as net_qty
> from plans p left join executions e on e.plan_id = p.id
> where p.deleted_at is null group by p.id, p.ticker;
> ```

---

## 6. 일지 · 저장된 뷰 · 관심종목

```sql
create table journal_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plan_id        uuid references plans(id) on delete set null,
  ticker         text references securities(ticker),
  body           text not null,
  price_snapshot numeric,                          -- 작성 시점 주가(실앱은 실제 stamp)
  tags           jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_journal_user on journal_entries(user_id, created_at desc);
create trigger t_journal_upd before update on journal_entries for each row execute function set_updated_at();

create table saved_views (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  scope     view_scope_t not null,
  name      text not null,
  filters   jsonb not null default '{}',
  grouping  text,
  ordering  text,
  sort      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_views_user on saved_views(user_id, scope);
create trigger t_views_upd before update on saved_views for each row execute function set_updated_at();

create table watchlist (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  ticker    text not null references securities(ticker),
  group_name text,
  sort      int not null default 0,
  added_at  timestamptz not null default now(),
  unique (user_id, ticker)
);
create index idx_watchlist_user on watchlist(user_id);
```

---

## 7. RLS 정책

```sql
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
```

---

## 8. 상태 전이 트리거 (선택 — 프로토타입 App.jsx auto-transition 이관)

```sql
-- 예: 첫 매수 체결 시 plan.status research/planning → active
create or replace function plan_activate_on_first_buy() returns trigger as $$
begin
  update plans set status = 'active'
   where id = new.plan_id and status in ('research','planning');
  return new;
end; $$ language plpgsql;

create trigger t_exec_activate after insert on executions
  for each row when (new.side = 'buy') execute function plan_activate_on_first_buy();
```
> 시나리오 status(tracking→approaching→realized/invalidated)는 **실시간 시세 대비 target** 으로 판정 → 서버 워커(§API 실시간)에서 주기 평가 후 `scenarios.status` 갱신. DB 트리거만으론 시세를 모르므로 서버 로직이 정본.

---

## 9. 시드 데이터

- `strategies`, `exec_strategies`, `exec_categories` = 프로토타입 `data.jsx`의 `STRATEGIES`/`EXEC_STRATEGIES`/`EXEC_CATS` 를 그대로 INSERT.
- `securities` 초기 목록 + `security_financials` = 어댑터 첫 동기화(DART/EDGAR) 또는 프로토타입 `securities.jsx`/`FIN_SEED` 로 부트스트랩 후 실데이터로 덮어씀(`source` 로 구분).
- 신규 유저 온보딩 = `profiles` upsert + `portfolios` 1행(+선택 첫 `plans`).

---

*이 DDL은 `ARCHITECTURE.md` §4를 구체화한 것. 컬럼/enum 변경 시 두 문서를 함께 갱신.*
