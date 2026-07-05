---
session_date: "2026-07-05 12:40"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-05 2차 — 규칙자동화 완성 + 뷰 write-path + 마일스톤6 착수)
3커밋 전부 push. 골든 102/102 · web tsc 0 · core 무수정 · 마이그레이션 최소 · 전부 브라우저 E2E(DB 왕복).

- **`696d2fd` 규칙 자동화 스텝4 + v2**
  - 스텝4: `createRuleAction`·`updateRuleAction`(auto→edited=true)·`deleteRuleAction` + `encodeTrig`(decodeTrig 역함수) + strategy-tab 인라인 에디터(트리거7/액션5 select) + "규칙 추가" disabled 해소 + "자동" 배지. 커스텀=편집+삭제, auto=편집만.
  - v2(4전략 새 트리거, **전량 웹레이어**): NEW `lib/rule-trigs-v2.ts`(웹 카탈로그+findTrig) · NEW `lib/rule-eval-v2.ts`(evalRuleV2: 7개 core 위임+4개 신규 콕핏수학 미러) · plan-mapper(DbRuleCondition 확장+UIRule.cond+decode 4케이스+name도 findTrig) · rules-from-strategy(ex2 time·ex3 path·ex6 weight·ex7 trailing). v2 auto는 CORE_TRIG_IDS 게이트로 토글만.
- **`e6a41ba` 옵션2 + B5 + 시나리오 CRUD**
  - 옵션2 경로 오버레이: rule-eval-v2 path_gap을 항상armed→실발동(VA 모델=골든 sim futuretest value kind: desired=target_path×(round+1)·band=±4%×step) + strategy-tab isVA 콕핏 오버레이(isVR 구조 미러, 새 CSS 없음).
  - B5 SecurityPeek: NEW `lib/security-detail-data.ts`(page 로직 공유로더)+fetchSecurityDetailAction+NEW `security-peek.tsx`(Provider+슬라이드오버, embedded는 .dt-crumb만 숨김)+app-shell 마운트+트리거4곳(watchlist/research/screener/search). create-plan/add-scenario/watch는 SecurityDetailScreen 내부배선이라 임베드만으로 해소. peek CSS 기존재.
  - 시나리오 편집/삭제 CRUD: UIScenario에 dbId/caseT(PLAN_SELECT에 scenarios.id 추가)+updatePlanScenario·deletePlanScenario+scenario-author-modal editScenario 편집모드+scenarios-tab 카드별 편집/삭제 버튼. gap-tab UIScenario narrowing 캐스트 1줄.
- **`b6c7650` Phase C 스키마 기반 + US 프로바이더 결정**
  - 마이그레이션 `20260705000700`: security_price_history(OHLCV 참조데이터) + notifications(규칙발동 알림 사용자소유 RLS). db:types 재생성.
  - `GET /api/ohlc`(app/api 첫 핸들러): ticker검증·market→currency·1d/1wk/1mo resample. 백필 전 bars=[]. resample 테스트봉 집계 E2E 검증.
  - **US 히스토리 프로바이더 = Tiingo 결정**(조사): Finnhub 무료 candle=US 401 아웃 · AV 무료=compact 100봉+adj유료라 5년 백필 불가 · Tiingo=무료 1000/day·30년+·수정종가·Node/TS 네이티브 · yahoo-finance2는 무키 보조.

## In Progress
- 없음. 워킹트리 커밋됨(`.claude/.active-skill`·`.omc/notepads/`만 미추적).

## Remaining Tasks
- [ ] **Phase C 데이터 파이프라인** — 🔴 블록: `apps/server/.env` 없음 + Tiingo 미가입. 키 준비 후: KIS일봉·Tiingo 어댑터 → `sync:ohlc` 백필 → seam 교체(mockChange·genSpark·trajectory·gap-history·fin-history·screener-ref SEC_SEED·하드코딩 기준일 2026,5,*→today) → 발동 워커(rules 평가→notifications insert) → inbox가 notifications 표시.
- [ ] **adhoc 시나리오 편집/삭제** — 방금 만든 플랜 시나리오 CRUD를 종목단독(adhoc)으로 확장. scenarios/actions.ts에 update/delete 추가 + security-detail의 secScenarios 렌더에 버튼.
- [ ] **인박스 트리아지 DB 동기화 + unread 뱃지** — 트리아지가 DB로 가야 서버계산 가능. (오래 defer됨)
- [ ] **경로(ex3) 옵션2 심화(조건부)** — 미니멀 만족 시 시간축 트래젝터리 오버레이. 현재는 value-axis(isVR형)로 충분.

## Key Decisions
- **골든 함정 = 카탈로그 배열 deep-equal**(RULE_TRIGS/RULE_ACTS/EXEC_STRATEGIES가 i18n-reference.test에서 읽기전용 source와 deep-equal) → core 추가 시 재생성 불가로 깨짐. **해법 = closeout.ts 웹레이어 래퍼 패턴**(core 감싸고 확장, 무수정).
- **웹 확장 타입**: UIRule/UIScenario extends core 타입 + PLAN_SELECT에 id 추가 + UIPlan 배열 오버라이드. 편집/삭제엔 DB id 필수.
- **VA 모델 정본 = 골든 sim** futuretest.jsx value kind (desired=step×period·band±4%). 옵션2 오버레이·발동 모두 이걸 미러.
- **US 히스토리 = Tiingo**. Finnhub 보유키는 실시간/프로필용만(candle 아웃 확정).
- 마일스톤6은 스키마 기반만 지금(키 무관·검증가능), 데이터 파이프라인은 키 준비 후.

## Blockers / Issues
- **apps/server/.env 없음** → 실 sync/백필 이 머신에서 불가. 사용자가 DART/Finnhub/KIS + Tiingo 키 입력해야 Phase C 데이터 착수.
- 편집 중 SWC stale 에러 재발 가능(app-shell 다중편집 시) → 서버 재시작 + `.next` 삭제로 해소(디스크 파일은 정상, tsc로 확인).

## Notes for Next Session
- 다음 착수: (키 있으면) Phase C 데이터 파이프라인 / (키 없으면) adhoc 시나리오 편집·삭제 또는 인박스 트리아지 DB 동기화.
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs` → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + `cd apps/web && pnpm exec tsc --noEmit`.
- 규칙/시나리오 CRUD·peek는 마이그레이션 없음(id 기존). Phase C만 마이그레이션 1건 추가.
- LLM Wiki: US OHLCV 프로바이더 비교 + 골든 확장 패턴 ingest 예정(이 세션).

## Files Modified (이번 세션)
- 마이그레이션(신규): `supabase/migrations/20260705000700_price_history_notifications.sql`
- `apps/web/lib/`(신규): rule-trigs-v2·rule-eval-v2·security-detail-data; (수정): plan-mapper(UIRule.cond·UIScenario·encode/decode)·rules-from-strategy
- `apps/web/components/`(신규): securities/security-peek; (수정): plan/strategy-tab(에디터·isVA·evalRuleV2)·plan/scenario-author-modal·plan/scenarios-tab·plan/gap-tab·plan/detail-view·securities/security-detail(embedded)·shell/app-shell·watchlist·research·screener·search
- `apps/web/app/`(신규): api/ohlc/route; (수정): (shell)/plans/[id]/actions·(shell)/securities/[ticker]/(actions·page)
- `packages/core/src/types/database.ts`(재생성)
- docs: MEMORY.md·NEXT-ACTION.md
- 개인 메모리: rules-automation-design.md(v2·옵션2 갱신)
