---
session_date: "2026-07-04 21:00"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-04 데스크톱 2차 — 웹 이식 마일스톤 7: Phase A 완료 + write-path 2건)
6개 기능 이식, **7커밋 전부 origin/main push**. 각 기능 브라우저 E2E 검증, 골든 102/102 유지, core 무변경.
- **15 리서치 + 공용 SecurityPicker** (`1605d98`): `components/research/research-screen`·`securities/security-picker`(공용, marketSegs hoist)·`lib/sec-recents`·**`lib/securities-list.ts`에 `fetchAllSecurities`**(스크리너/검색 공용) + security-detail 마운트 시 pushSecRecent.
- **플랜 리스트 필터** (`bd33df7`): `lib/plan-filters.ts`(matchesFilters 등, **웹 인라인** — core 승격 안 함) + plans-screen 필터패널/칩 5축. 🐛 포트폴리오 칩 DB UUID 노출 → 실 portfolios prop으로 해석.
- **11~13 스크리너** (`354467f`): `screener/`+`lib/screener-ref.ts`(SEC_SEED mock·SCV·finFlags·scvHeat)+`lib/screener-data.ts`(buildScored). 4레이아웃(리스트/보드/히트맵/4분면), 8관점 렌즈, core `finOf`+`gradeWithFw`. 4분면 물리시뮬 useMemo hoist.
- **18 휴지통** (`4d5970f`): `trash/`(page `.not(deleted_at is null)` + restore/deleteForever 서버액션).
- **Cmd+K 검색모달** (`e2a5fbc`): `search/search-modal`(플랜/종목/전략/관점 4그룹) + app-shell 전역 Cmd/Ctrl+K 리스너 + 사이드바 검색버튼. 데이터 클라이언트 페치.
- **플랜 시나리오 작성모달** (`bd5456c`): `plan/scenario-author-modal`(케이스+목표가+근거, 역산 프리뷰) + `addPlanScenario`(scenarios insert) + scenarios-tab "+추가" 타일.

## In Progress
- 없음 (워킹트리 클린, .claude/.active-skill + .omc/notepads 로컬 상태만).

## Remaining Tasks — 마일스톤 7 잔여 (NEXT-ACTION 갱신됨)
- [ ] **B8 플랜 생성 위저드** — 🔴 핵심·규모 큼. 종목·전략·관점·시나리오 → plans+scenarios insert. onCreatePlan no-op 해소. 백엔드 준비됨. **착수 전 범위 합의**(단일모달 vs 멀티스텝).
- [ ] **17 보관함(A4)** — 🔶 선행 스키마 **S1 `plans.archived_at`** 마이그레이션 + archive/restore 뮤테이션.
- [ ] **B9 adhoc 종목단독 시나리오** — 🔶 선행 스키마 **S2 `scenarios.plan_id` nullable + ticker**.
- [ ] **B5 SecurityPeek** — 팝오버. 트리거 UX + onCreatePlan/onAddScenario no-op 딸림.
- [ ] **Phase C 실데이터(마일스톤6)**: change/spark/차트 + 스크리너 SEC_SEED(eps·perLo·perHi) → 실 시세.

## Key Decisions
- 필터 술어(matchesFilters)는 **웹 인라인**(형제 뷰 watchlist 패턴 일치, core 승격/골든 미변경).
- **scenarios 테이블 unique(plan_id,case_t) 제약 없음** 확인 → 플랜 대상 시나리오 추가는 **S2 없이 가능**(adhoc만 S2). case_t=bull/base/bear enum만 만족, label jsonb가 커스텀명.
- 스크리너 eps/perLo/perHi는 웹 DB에 없어 `SEC_SEED`(securities.jsx 값) mock — 마일스톤6 교체 지점.

## Blockers / Issues
- 없음. 6기능 7커밋 전부 push 완료.
- mock seam(change/spark/차트/SEC_SEED)은 마일스톤6 실데이터 전제 — 정상(로드맵상 뒤 단계).

## Notes for Next Session
- **다음 착수 권장**: B8 플랜생성(범위합의 후) 또는 S1+S2 묶어서→A4 보관함+B9 adhoc.
- **dev 서버는 fresh 프로세스로 검증** — 같은 파일 연쇄 수정 후 `useEffect deps changed size` 경고는 HMR 고스트(서버 재시작으로 소멸, 코드 정상). fresh 서버 첫 라우트 방문은 온디맨드 컴파일 3~5초 → 네비 검증 6초+ 대기.
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs`(11플랜+watchlist 8) → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + `cd apps/web && pnpm exec tsc --noEmit`.
- ⚠️ 휴지통 테스트엔 소프트삭제 플랜 필요(소프트삭제 액션 아직 없음) — 임시 스크립트로 시드했음(정리됨).

## Files Modified (이번 세션 — 신규 위주)
- `apps/web/components/`: research/·securities/security-picker·screener/·trash/·search/·plan/scenario-author-modal (신규); plan/plans-screen·securities/security-detail·plan/scenarios-tab·shell/app-shell·shell/sidebar (수정)
- `apps/web/lib/`: sec-recents·plan-filters·screener-ref·screener-data (신규); securities-list (수정: fetchAllSecurities)
- `apps/web/app/(shell)/`: research/·screener/·trash/ (신규); plans/[id]/actions.ts (수정: addPlanScenario)
- docs: MEMORY.md·NEXT-ACTION.md (갱신)
- LLM Wiki: raw 1건(2026-07-04-nextjs-hmr-deps-ghost-and-compile-delay) + nextjs-dev 토픽(5소스)·INDEX·log·state
