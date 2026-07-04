---
session_date: "2026-07-04 10:48"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (이번 세션 — 데스크톱, 7커밋)
- **source/core 재조정 → 실측 no-op 종결** (커밋 8893ef0 docs): root `source/` ↔ 새 핸드오프 `source/` 32파일 대조 = **라인엔딩(CRLF↔LF) 차이뿐**, 순수로직 0줄. 골든 생성기가 읽는 파일 전부 동일 → core 수정·골든 재생성 불필요. 문서의 "순수로직 전부 바뀜" premise는 CRLF에 속은 오판이었음 → NEXT-ACTION/MEMORY 정정. 칩 task_8aa778fc 종결.
- **07 대시보드(현황)** (커밋 7f7b525): `components/plan/dashboard-view.tsx` — 트리맵(squarified)·헤드라인 스탯·액션큐 + openPlan `?tab=` 딥링크 + plan `sector` 노출. E2E 검증(트리맵 8타일·시장그룹 KR/US·dash-row→체결 딥링크).
- **16 인사이트** (커밋 5f7ffda): `components/insights/insights-screen.tsx` + `(shell)/insights/` — 적중률·관점성과 scatter·프로세스건강도 funnel·승률손익비.
- **10 시나리오 모니터** (커밋 c8025f7): `components/scenarios/scenarios-screen.tsx` + `(shell)/scenarios/`. **공용 이식 2건**: `components/plan/filter-panel.tsx`(watchlist/screener/archive 언블록) + `components/plan/dash-stat.tsx`(dashboard에서 추출). `lib/scenario-ref.ts`.
- **19~22 종목상세 MVP** (커밋 ea3e1b3): `lib/security-mapper.ts` + `(shell)/securities/[ticker]/`(page+actions) + `components/securities/security-detail.tsx`. 헤더·차트·계절성·4탭(재무/투자지표/밸류=기존 탭 secPlan 재사용)·**관심 토글 서버액션**. eps는 같은 ticker 플랜에서 유도(PER 74.5×·EPS ₩3841). E2E(관심토글 양방향·콘솔 0).
- **LLM Wiki 반영**: nextjs-dev 토픽 3소스로 확장(검증·진단 오판 함정 3건 + 합성객체 재사용 패턴).

## In Progress
- 없음 (워킹트리 클린, .claude/.active-skill 제외).

## Remaining Tasks
- [ ] **언블록된 화면**: 14 관심종목 · 15 리서치 · 11~13 스크리너 — onOpenSecurity → `/securities/[ticker]` 이제 가능. (watchlist 테이블 있음)
- [ ] **17 보관함**: `archived_at` 컬럼 없음 → 마이그레이션 선행 필요.
- [ ] **18 휴지통**: `deleted_at` 있음 → restore/deleteForever 뮤테이션만 추가.
- [ ] **종목상세 후속(defer됨)**: 종목 메모 CRUD(notes 테이블 신규 필요)·SecurityScenarios(adhoc)·SecurityPeek 팝오버·Cmd+K SearchModal·onCreatePlan/onAddScenario·`change` 일일%(DB 미저장 mock).
- [ ] **시나리오 후속(defer됨)**: 작성 모달(onNewScenario/SecurityPicker/ScenarioAuthor)·adhoc 종목시나리오.
- [ ] (마일스톤 6) 과거 시세 히스토리 백필 + 실시간 WS — 차트/spark/change 실데이터 전제.

## Key Decisions
- source/core 재조정 = 실측 no-op(라인엔딩뿐) — 유저 승인 하에 문서 정정으로 종결.
- 종목상세: 재무/투자지표/밸류에이션 탭은 기존 컴포넌트를 합성 secPlan으로 재사용(신규 코드 최소화).
- 종목 eps: DB 미저장 → 같은 ticker 최신 플랜에서 유도(mock 0 방치 대신).
- 커밋 = 스크린별 feat + docs 분리, 직접 main(프로젝트 크로스머신 관행).

## Blockers / Issues
- **⚠️ PUSH 대기 (중요)**: 로컬 main이 origin보다 **7커밋 앞섬**. 자동승인이 main 직푸시 차단 → **유저가 이 폴더에서 `git push origin main` 수동 실행 필요.**
- "우측바 2개" 신고 = **HMR Fast Refresh 겹침 오진**(실버그 아님, 하드 리로드 시 DOM 단일). 위키에 기록.

## Notes for Next Session
- before-work는 반드시 `git fetch origin` 대조부터.
- 새 뷰 이식 기준 = `design_handoff_keystone/source/*.jsx`(= root `source/`와 라인엔딩만 차이, 동일). "핸들러≠렌더" grep 확인.
- 함정: SWC≠tsc(JSX 내 제네릭 캐스트 hoist)·supabase-js thenable(await)·`.next` 오염(build는 dev 끄고)·ResizeObserver 위젯은 preview 뷰포트 폭 세팅+리로드 후 검증·preview_screenshot 간헐 타임아웃(eval 검증).
- 실행: `pnpm supabase start`(이미 up) → `node apps/web/scripts/dev-seed-plans.mjs`(11플랜) → preview "web"(:3000). 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: `pnpm --filter @keystone/core test`(골든 102) + `cd apps/web && pnpm exec tsc --noEmit`.

## Files Modified (이번 세션 — 신규 위주)
- `apps/web/components/`: plan/dashboard-view · plan/dash-stat · plan/filter-panel · insights/insights-screen · scenarios/scenarios-screen · securities/security-detail (신규)
- `apps/web/lib/`: scenario-ref · security-mapper (신규); plan-mapper(sector)
- `apps/web/app/(shell)/`: insights/ · scenarios/ · securities/[ticker]/(page+actions) (신규); plans-screen·detail-view·[dest]/page (수정)
- `docs/`: MEMORY.md · NEXT-ACTION.md
- LLM Wiki: raw/2026-07-04-nextjs-porting-verification-pitfalls.md + wiki/topics/nextjs-dev.md·INDEX·log·.compile-state
