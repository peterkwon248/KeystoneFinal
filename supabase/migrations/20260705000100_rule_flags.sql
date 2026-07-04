-- Keystone 규칙 자동화 v1 — rules 물질화 플래그.
-- 전략/목표에서 자동 생성한 규칙(is_auto)과 사용자가 편집/추가한 규칙 구분.
-- 재생성은 (is_auto and not edited) 행만 교체 → 커스텀·편집분 보존(시나리오 auto 패턴과 동일).
-- condition/action(jsonb)은 기존 컬럼 재사용(파라메트릭 트리거 인코딩). RLS/GRANT 변경 불필요(plan 소유로 이미 격리).

alter table rules add column is_auto boolean not null default false;  -- 물질화된 규칙(전략/목표 파생)
alter table rules add column edited  boolean not null default false;  -- auto 규칙을 사용자가 편집 → 재생성에서 보호
alter table rules add column source  text;                            -- 출처: 'strategy:<execId>:<kind>' | 'goal:<type>' | null(=커스텀)

-- 재생성 시 (plan_id, is_auto, edited) 스캔 → 부분 인덱스로 가볍게.
create index idx_rules_auto on rules(plan_id) where is_auto and not edited;
