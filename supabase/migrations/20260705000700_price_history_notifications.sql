-- 마일스톤 6 (Phase C) 스키마 기반 — 과거 시세 히스토리(OHLCV) + 규칙 발동 알림 저장소.
-- 데이터는 후속(어댑터/워커, API 키 전제)에서 채운다. 여기선 테이블·RLS·GRANT만.

-- 1) 과거 시세 (일봉 OHLCV) — 차트/계절성/성과밴드 실데이터의 소스. 참조데이터(전역읽기·서비스롤쓰기).
create table security_price_history (
  ticker  text not null references securities(ticker) on delete cascade,
  date    date not null,
  open    numeric,
  high    numeric,
  low     numeric,
  close   numeric not null,
  volume  numeric,
  source  text,                                  -- kis | finnhub | alpha_vantage | ...
  as_of   timestamptz not null default now(),
  primary key (ticker, date)
);
create index idx_price_hist_ticker_date on security_price_history(ticker, date desc);

alter table security_price_history enable row level security;
create policy r_price_history on security_price_history for select using (true);
grant select on security_price_history to anon, authenticated;
grant all on security_price_history to service_role;

-- 2) 알림(규칙 발동 등) — 서버 워커가 rules 평가 후 발동 시 insert. 사용자 소유(RLS).
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan_id    uuid references plans(id) on delete cascade,
  rule_id    uuid references rules(id) on delete cascade,
  ticker     text,
  kind       text not null,                      -- 'rule_fired' | 'scenario_hit' | 'schedule_due' | ...
  title      jsonb,                              -- L10n {en,ko}
  body       jsonb,                              -- L10n {en,ko}
  payload    jsonb,                              -- 발동 스냅샷(발동가/규칙조건/갭 등)
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications(user_id, created_at desc) where read_at is null;

alter table notifications enable row level security;
create policy p_notifications on notifications
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant select, insert, update, delete on notifications to authenticated;
grant all on notifications to service_role;
