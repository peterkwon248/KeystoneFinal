-- Keystone 마일스톤 3 — 체결 롤업 뷰 (DATA_MODEL.md §5)
-- 파생값(투입/회수/보유수량)은 저장하지 않고 executions에서 계산.
-- 평단·미실현손익 같은 순서 의존 계산(매도 시 평단가 기준 차감)은 packages/core(analytics) 몫.
-- security_invoker: 뷰가 소유자(postgres) 권한으로 실행되면 RLS를 우회해
-- 타 유저 플랜이 노출되므로, 호출자 권한으로 실행해 기저 테이블 RLS를 적용한다.

create view plan_positions
with (security_invoker = true) as
select p.id as plan_id, p.ticker,
  sum(case when e.side='buy'  then coalesce(e.amount, e.price*e.quantity) else 0 end) as bought,
  sum(case when e.side='sell' then coalesce(e.amount, e.price*e.quantity) else 0 end) as sold,
  sum(case when e.side='buy' then e.quantity else -e.quantity end) as net_qty
from plans p left join executions e on e.plan_id = p.id
where p.deleted_at is null group by p.id, p.ticker;

grant select on plan_positions to authenticated, service_role;
