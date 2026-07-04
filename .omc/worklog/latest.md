---
session_date: "2026-07-05 00:30"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-05 — S1/S2 스키마 + 보관함 + adhoc + 플랜생성 + 규칙자동화 v1)
전부 브라우저 E2E 검증. 골든 102/102 · web tsc clean. 단일 `session:` 커밋으로 main 직푸시.

- **S1/S2 마이그레이션** (`20260704000100_archive_adhoc.sql`): `plans.archived_at`(방식2=청산과 별개 축) + `scenarios` plan_id nullable·`ticker`·`user_id`·CHECK·**RLS 재정의**(nullable FK가 조인기반 RLS 파괴 → user_id 소유권 경로). `pnpm db:types` 재생성.
- **17 보관함(A4)**: `components/archive/archive-screen.tsx` + `(shell)/archive/`(page+actions restorePlanFromArchive) + `[dest]` DESTS에서 archive 제거. 진입점=플랜 상세 헤더 오버플로 메뉴(⋯: 보관/휴지통, `archivePlan`·`softDeletePlan`). 메인/인사이트/시나리오는 archived 숨김. E2E: 보관→/archive→복구, DB 확인.
- **B9 adhoc 시나리오(S2)**: `scenario-author-modal.tsx` 3모드(plan/adhoc-picker/adhoc-locked) + `scenarios/actions.ts` addSecurityScenario. 모니터 adhoc 병합(AdhocScenario) + 종목상세 표시/+추가(secScenarios). E2E: AAPL adhoc 저장→모니터·종목상세 표시, RLS/CHECK 통과.
- **B8 플랜 생성**: `components/plan/compose-modal.tsx`(단일모달·자체페치) + `plans/actions.ts` createPlan(human_id·auto 시나리오 가격배수·auto 규칙)·createPortfolio. 3진입점(사이드바·리스트헤더·종목상세). E2E: NVDA→PLN-012 + 자동 시나리오 253/214/146.
- **전략 드롭다운 버그 수정**: ComposeModal이 관점(STRATEGIES) 항목을 "전략" 라벨로 오표기 → EXEC_STRATEGIES/execId로 교체(프로토타입 mislabel 의도적 수정). E2E: 그리드 매매→exec_id=ex4.
- **규칙 자동화 v1 (스텝1-3)**: `20260705000100_rule_flags.sql`(rules is_auto/edited/source) + `lib/rules-from-strategy.ts`(웹인라인·파라메트릭) + `plans/[id]/actions.ts` regenerateAutoRules((is_auto&&!edited)만 교체). 배선=createPlan·전략변경·목표설정. plan-mapper UIRule 확장. E2E: 무한매수법→LOC+익절 자동, 목표→규칙, 전략없음↔무한매수법 재생성 안전(중복0·편집분 보존), "규칙이 없습니다" 해소.

## In Progress
- 없음. 워킹트리 커밋됨(로컬 상태 `.claude/.active-skill`·`.omc/notepads/` 제외).

## Remaining Tasks
- [ ] **규칙 자동화 스텝 4** — 규칙 편집/삭제 + "규칙 추가" disabled 해소(트리거 한정 작성 UI: 가격/수익률/시나리오/체결) + auto "자동" 배지. (설계·스텝1-3 완료, UI 증분만. 개인 메모리 `rules-automation-design` 참조)
- [ ] **규칙 자동화 v2 (확정 커밋)** — 밸류애버리징(경로)·정액분할(시간)·6:4(비중)·모멘텀(트레일링) = 새 트리거 타입. 시간=유연 스케줄 {count,unit(일/주/월/분기/년),anchor}.
- [ ] **B5 SecurityPeek 팝오버** — 소규모.
- [ ] **Phase C 실데이터(마일스톤 6)** — 시세 워커(규칙 실제 발동=알림) + 히스토리 백필.

## Key Decisions
- 보관=archived_at 별개 축(방식2, 청산≠보관). 프로토타입은 status=closed였으나 미실현 플랜 오기록 방지 위해 분리.
- scenarios plan_id nullable → RLS에 user_id 소유권 경로 추가 필수(조인기반 정책이 NULL 행을 차단).
- 플랜 compose 드롭다운은 전략(execId), 관점 아님(프로토타입 mislabel 수정, 상세헤더와 일관).
- 규칙 = materialize + 파라메트릭(상대%) 저장 + is_auto/edited 안전 재생성. 발동=알림(자동매매 아님). 커스텀 규칙 열되 가드(자동 먼저→커스텀 나중, 트리거 한정).

## Blockers / Issues
- 없음.

## Notes for Next Session
- **다음 착수 권장: 규칙 자동화 스텝 4**(UI 증분). 설계 전부 개인 메모리 `rules-automation-design`에.
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs` → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + `cd apps/web && pnpm exec tsc --noEmit`.
- 규칙 발동 실제 동작(알림)은 마일스톤 6 워커 전제 — 지금은 생성·표시·재생성까지.
- LLM Wiki: raw 1건(2026-07-05-materialized-rules-and-nullable-fk-rls) + 신규 토픽 materialized-derived-state + supabase-local-dev 확장.

## Files Modified (이번 세션)
- 마이그레이션(신규): `supabase/migrations/20260704000100_archive_adhoc.sql`·`20260705000100_rule_flags.sql`
- `apps/web/components/`(신규): archive/archive-screen · plan/compose-modal; (수정): plan/scenario-author-modal·plan/detail-view·plan/plans-screen·scenarios/scenarios-screen·securities/security-detail·shell/app-shell·shell/sidebar
- `apps/web/app/(shell)/`(신규): archive/(page+actions)·plans/actions.ts·scenarios/actions.ts; (수정): plans/page·plans/[id]/actions·insights/page·scenarios/page·securities/[ticker]/page·[dest]/page
- `apps/web/lib/`(신규): rules-from-strategy; (수정): plan-mapper(UIRule·플래그)
- `packages/core/src/types/database.ts`(재생성)
- docs: MEMORY.md·NEXT-ACTION.md
- 개인 메모리: rules-automation-design.md(신규)
