-- 장중 인트라데이 시세 시계열(intraday_prices) — WS 워커가 틱마다 append.
-- live_quotes(최신 스냅샷 1행/티커, upsert 덮어쓰기)와 달리 이력을 누적 → 종목상세 차트의
-- 당일 인트라데이 라인 소스. 리로드/기기간 유지. 참조데이터 패턴: 전역읽기·service_role 쓰기.
--
-- 차트 소비 = 이 테이블(당일 페치, 리로드 이력) + live_quotes Realtime(세션 중 신규 틱 append).
-- → intraday_prices 자체엔 Realtime publication 불필요(live_quotes가 이미 브로드캐스트).
-- ⚠️ 리텐션: 무한 누적 방지 정리(오래된 행 prune)는 후속 cron 몫. 쿼리는 당일만 읽어 정확성엔 무관.

create table intraday_prices (
  ticker      text not null references securities(ticker) on delete cascade,
  ts          timestamptz not null,
  price       numeric not null,
  change_pct  numeric,
  primary key (ticker, ts)
);

-- 당일 시계열 조회(ticker + ts 범위, 오름차순).
create index intraday_prices_ticker_ts on intraday_prices (ticker, ts);

alter table intraday_prices enable row level security;
create policy r_intraday_prices on intraday_prices for select using (true);
grant select on intraday_prices to anon, authenticated;
grant all on intraday_prices to service_role;
