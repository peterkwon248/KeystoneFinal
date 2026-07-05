-- Stage A — 실시간 시세 라이브 스냅샷(live_quotes). worker(KIS/Finnhub WS)가
-- 1.5초 스로틀 배치로 upsert, Supabase Realtime이 브라우저로 방송(Stage B).
-- 참조데이터 패턴: 전역읽기(select using true) · 쓰기 service_role 전용.

create table live_quotes (
  ticker      text primary key references securities(ticker) on delete cascade,
  price       numeric not null,
  change_pct  numeric,
  ts          timestamptz not null default now()
);

alter table live_quotes enable row level security;
create policy r_live_quotes on live_quotes for select using (true);
grant select on live_quotes to anon, authenticated;
grant all on live_quotes to service_role;

-- Supabase Realtime 발행: live_quotes upsert를 구독 브라우저로 방송.
-- publication이 없으면 생성(멱등). replica identity는 PK(default)로 충분.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table live_quotes;
