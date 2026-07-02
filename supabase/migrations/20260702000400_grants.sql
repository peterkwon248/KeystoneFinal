-- Keystone 마일스톤 2 — 테이블 GRANT
-- 최신 Supabase(PG17 이미지)는 anon/authenticated에 DML 기본 권한을 주지 않는다
-- (hardened default privileges). RLS는 "행" 필터일 뿐이므로 테이블 레벨 GRANT를 명시한다.
-- 원칙: 사용자 소유 테이블 = authenticated만 DML (행은 RLS가 격리),
--       참조 테이블 = 읽기 전역(anon 포함), 쓰기는 service_role 전용 (DATA_MODEL.md §7).

-- 사용자 소유 테이블: authenticated 전체 DML
grant select, insert, update, delete on
  profiles, portfolios, plans, scenarios, executions, rules,
  journal_entries, saved_views, watchlist
to authenticated;

-- 공유 참조 데이터: 읽기 전역
grant select on
  securities, security_financials, strategies, exec_strategies, exec_categories
to anon, authenticated;

-- exec_categories: 유저 커스텀 카테고리는 본인이 쓰기 가능 (RLS r_execcat_mod가 행 제한)
grant insert, update, delete on exec_categories to authenticated;

-- 서버 어댑터(service_role): 전체 권한 (RLS 우회는 role 특성으로 이미 보장)
grant all on all tables in schema public to service_role;
