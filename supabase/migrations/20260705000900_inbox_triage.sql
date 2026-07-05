-- 인박스 트리아지 영속 — read/resolved/muted 상태를 기기간 동기화(옵션2: localStorage → DB).
-- 인박스 노트는 plans/rules에서 파생되며(buildInboxNotes) note id는 복합키다:
--   rule-fired: "{planId}:{ruleId}" · 시나리오 알림: "{planId}:scn:{id}".
-- notifications 테이블은 워커가 rule-fired만 UUID로 채워 노트 복합키와 1:1이 아니므로,
-- 복합키(note_key) 전용 사용자소유 테이블을 둔다. 사용자 소유(RLS) 패턴은 notifications와 동일.
create table inbox_triage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  note_key    text not null,               -- 인박스 노트 복합키({planId}:{ruleId} / {planId}:scn:{id})
  read_at     timestamptz,
  resolved_at timestamptz,
  muted_at    timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, note_key)
);

alter table inbox_triage enable row level security;
create policy p_inbox_triage on inbox_triage
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on inbox_triage to authenticated;
grant all on inbox_triage to service_role;
