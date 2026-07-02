-- Keystone 마일스톤 2 — 테이블 전체 (DATA_MODEL.md §2~§6)

-- §2 계정/프로필 — Supabase auth.users 는 내장. 앱 프로필은 1:1 확장.
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

-- §3 포트폴리오
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

-- §4 공유 참조 데이터 (user 소유 아님 — 서버/시드가 채움)
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

-- security_financials (= 프로토타입 FIN_SEED)
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

-- strategies (관점/lens) · exec_strategies (전략) · exec_categories
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

-- §5 플랜 & 하위 (사용자 소유 — 최우선)
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

-- §6 일지 · 저장된 뷰 · 관심종목
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
