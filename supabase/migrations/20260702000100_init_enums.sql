-- Keystone 마일스톤 2 — 확장 & 공통 & Enum (DATA_MODEL.md §0·§1)

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- updated_at 자동 갱신 트리거 (모든 변경형 테이블에 부착)
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create type market_t          as enum ('KR', 'US');
create type plan_status_t     as enum ('research', 'planning', 'active', 'paused', 'closing', 'closed');
create type scenario_case_t   as enum ('bull', 'base', 'bear');
create type scenario_status_t as enum ('pending', 'tracking', 'approaching', 'realized', 'invalidated');
create type exec_side_t       as enum ('buy', 'sell');
create type auth_provider_t   as enum ('google', 'apple', 'kakao', 'naver', 'email');
create type sub_tier_t        as enum ('free', 'pro');           -- 추후 확장
create type view_scope_t      as enum ('plans', 'screener');
create type fin_source_t      as enum ('dart', 'edgar', 'seed'); -- seed = 프로토타입 잔재
