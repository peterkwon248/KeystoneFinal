-- Keystone 마일스톤 3 — 상태 자동전이 트리거 (DATA_MODEL.md §8, App.jsx addExecution 이관)
-- 프로토타입 로직 (source/App.jsx:620-622):
--   매수 체결 + status research/planning        → active
--   전량 매도(보유>0 → 0) + status active/paused → closing
-- 시나리오 status(tracking→approaching→realized/invalidated)는 시세가 필요하므로
-- 서버 워커(§API 실시간)가 정본 — 여기서 다루지 않음.

-- 첫 매수 체결 시 활성화
create or replace function plan_activate_on_first_buy() returns trigger as $$
begin
  update plans set status = 'active'
   where id = new.plan_id and status in ('research','planning');
  return new;
end; $$ language plpgsql;

create trigger t_exec_activate after insert on executions
  for each row when (new.side = 'buy') execute function plan_activate_on_first_buy();

-- 전량 매도 시 청산중으로
-- App.jsx 가드 재현: 매도 전 보유수량 > 0 이었고, 매도 후 0 이하가 됐을 때만.
-- (quantity null = 정액매수 등 수량 미상 체결은 0으로 취급 — App.jsx도 qty 필수)
create or replace function plan_close_on_full_sell() returns trigger as $$
declare
  net_after numeric;
begin
  select coalesce(sum(case when side = 'buy' then coalesce(quantity, 0)
                           else -coalesce(quantity, 0) end), 0)
    into net_after
    from executions where plan_id = new.plan_id;

  if net_after <= 0 and (net_after + coalesce(new.quantity, 0)) > 0 then
    update plans set status = 'closing'
     where id = new.plan_id and status in ('active','paused');
  end if;
  return new;
end; $$ language plpgsql;

create trigger t_exec_close after insert on executions
  for each row when (new.side = 'sell') execute function plan_close_on_full_sell();
