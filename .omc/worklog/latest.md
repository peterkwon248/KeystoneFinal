---
session_date: "2026-07-05 4차"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-05 4차 — "정적 앱 → 살아있는 실데이터 앱", 6커밋 push, 프로덕션 빌드 ✓)
6커밋 전부 브라우저 E2E · 골든 102/102 · web/서버 tsc 0 · **web 프로덕션 빌드 ✓** · core 무수정. **워크로그 Remaining Tasks 전부 소진.**

- **`67c6942` 날짜앵커 real-now 전환** — `clock.ts` `refNow()` frozen 6/26 → 실제 `new Date()`, `REF_YEAR`→실 연도. **함정: 골든이 core `inferYear`(KS_REF=6/26 경계)를 못박음**(`fmtDate("Jun 27")="Jun 27, 2025"` 하드코딩) → refNow만 바꾸면 7월이 전년 추론. 해법 = **`inferYearWeb`가 core inferYear 규칙 복제**(웹 신규, core 무수정) + `REF_YEAR-1` 하드코딩 통일(gap-tab/strategy-tab/rule-eval-v2/props-sidebar). **trajectory 함정: 고정 Sep~Jun 창→7월 "Jul" 창밖→`todayT`=NaN** → **rolling 10개월 창**(refNow 월 끝, `TRAJ_MONTHS` 단일소스 export, timeline/perf-band 소비, `trajSlotYear`). E2E: perf-band 7월·gap 26.07·타임라인 오늘마커 우측끝·인박스 real-now 버킷, NaN 0.
- **`d46a251`+`fbef3b5` 실시간 WS 스트리밍** — **Supabase Realtime 재활용**(커스텀 SSE 없음). `apps/server`: `kisApprovalKey()`(oauth2/Approval·`secretkey` 필드)+`kis-ws.ts`(H0STCNT0·`ws://ops.koreainvestment.com:21000`·tr_type"1"·**PINGPONG echo**·파이프 프레임 [2]현재가/[5]등락률)+`finnhub-ws.ts`(`wss://ws.finnhub.io`·trade)+`stream-quotes.ts` worker(1.5초 배치 upsert·재연결). 마이그레이션 `live_quotes`(+`supabase_realtime` publication). 웹: `live-quotes-provider`(`supabaseBrowser().channel().on("postgres_changes")`·`useLiveQuote`)+app-shell 마운트→list/detail/watchlist/security-detail `currentPrice` override+`live-dot`. E2E: 시뮬 틱(수동 upsert)→005930 309,500→400,000 수익률 재계산·상세 400k→500k·AAPL(US null 폴백)·전부 리로드 없이.
- **`4757879` 마지막 mock seam 실데이터화** — **"백필 아니라 seam 교체"**(security_financials에 2021-2025 실 재무 이미 있었음 — 실측으로 발견). `valuation-history.ts`(공유): EPS=`fin.is[i].net/(sharesOut×1e6)`·PER=연말종가/EPS·IV=EPS×√(perLo·perHi). screener SEC_SEED→실측, gap-history TUNE mock→실 iv/ivHistory/priceHistory(GapTab 구조 호환). E2E: 스크리너 verdict 분포·PER 실측·gap 삼성 iv ₩184,273·"고평가"(mock은 늘 "저평가").
- **`f6533f8` 인박스 트리아지 DB 이전(옵션2)** — read/resolved/muted localStorage→DB. **인박스 노트는 plans/rules 파생(복합키), notifications와 1:1 아님·시나리오 알림은 행 없음 → 복합노트키 전용 `inbox_triage` 테이블**(PK user_id,note_key). inbox page 로드→초기 Set, `setTriage`/`markAllRead` 서버액션(낙관적+undo 유지). `lib/inbox-triage.ts` 제거. E2E: 처리완료→read_at+resolved_at→리로드 안읽음 25→24 영속(=기기간).
- **`ad4a159` adhoc 시나리오 CRUD** — `updateSecurityScenario`/`deleteSecurityScenario`(플랜 패턴 미러·RLS user_id). `AdhocScenario`/`SecScenario`에 dbId/caseT+매퍼. 모달 adhoc 편집 분기. adhoc 행에만 수정/삭제(플랜 제외). E2E: AAPL bull 320→편집 350→삭제, DB 반영.

## In Progress
- 없음. 워킹트리 클린(6커밋 push 완료 후 `.claude/.active-skill`·`.omc/notepads/`만 미추적).

## Remaining Tasks
- **기존 백로그 전부 done.** 신규 후보:
  - [ ] **실 거래소 틱 검증** — 평일 장중 `pnpm --filter @keystone/server stream:quotes`(오늘 일요일 장외라 시뮬레이션만 검증됨).
  - [ ] **사이드바 unread 뱃지** — 서버 buildInboxNotes+inbox_triage 계산(`inboxUnread` prop 준비됨). ⚠️ 레이어가 3컬럼만 페치·lang 클라이언트 의존 = 크로스컷 비용.
  - [ ] **WS 폴리시** — provider DELETE 이벤트 처리 · 인트라데이 차트 라인(현재는 숫자 현재가/등락률만) · 관심종목 헤드라인 집계 라이브.
  - [ ] **자동 재동기화 cron** — sync:ohlc/quotes 매 거래일(현재 수동).
  - [ ] **마일스톤 8~9**(모바일 Expo / 구독) · **클라우드 Supabase 연결**(로컬 완성됨).

## Key Decisions
- **real-now = 웹레이어만** — core KS_REF/inferYear는 골든 보호 → `inferYearWeb` 복제 + rolling 창. real-now 완전 전환은 이제 clock.ts 1지점.
- **WS 전송 = Supabase Realtime 재활용** — 커스텀 SSE/WS-투-브라우저 안 만듦. worker→DB→publication→client.
- **"백필 아니라 seam 교체"** — DB 상태 실측하니 재무 5년 이미 있었음. "블로커" 단정 전 쿼리 확인.
- **트리아지 = 복합노트키 전용 테이블** — notifications.read_at은 rule-fired UUID만·시나리오 알림 미커버라 부적합.
- **마이그레이션은 `supabase migration up` 증분만**(reset 금지 — 백필 17k봉 보존).

## Blockers / Issues
- **실 거래소 틱 미검증(코드 아님, 데이터 가용성)** — 장중 평일에만 실 틱. 파이프라인은 시뮬레이션 틱으로 E2E 증명됨. worker 연결·구독은 확인.

## Notes for Next Session
- **마일스톤 6 완료 · mock seam 0개 · 백로그 소진.** 앱은 실제 오늘 기준 코히런트·장중 실시간·트리아지 기기간 동기화.
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs` → (선택)`sync:ohlc --years 5`/`sync:quotes` → (실시간)`stream:quotes`(평일 장중) → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + `cd apps/web && pnpm exec tsc --noEmit` + `pnpm --filter @keystone/server typecheck` + `pnpm --filter @keystone/web build`(dev 서버 끄고 `.next` 삭제 후).
- ⚠️ 마이그레이션 = `migration up`만(reset 금지). ⚠️ client 컴포넌트 import lib에 server-only 전이의존 금지.
- LLM Wiki: `raw/2026-07-05-realtime-streaming-and-realnow-anchor.md` 추가(Supabase Realtime 전송·KIS/Finnhub WS 프로토콜·real-now/골든 패턴) → `/wiki-compile`로 supabase-local-dev/financial-data-apis/materialized-derived-state 폴딩 예정.

## Files Modified (이번 세션)
- 신규(server): `apps/server/src/adapters/{kis-ws,finnhub-ws}.ts`·`stream-quotes.ts`
- 신규(web): `apps/web/components/{live-quotes-provider,live-dot}.tsx`·`lib/valuation-history.ts`·`app/(shell)/inbox/actions.ts`
- 신규(마이그레이션): `supabase/migrations/{20260705000800_live_quotes,20260705000900_inbox_triage}.sql`
- 수정(web lib): `clock·trajectory·price-closes-query·gap-history·screener-data·screener-ref?·security-mapper·security-detail-data·rule-eval-v2·plan-mapper?`
- 수정(web 컴포넌트): `plan/{timeline-view,perf-band,gap-tab,strategy-tab,props-sidebar,scenario-author-modal,scenarios-tab?,detail-view,list-view}`·`securities/security-detail`·`watchlist/watchlist-screen`·`scenarios/scenarios-screen`·`shell/app-shell`
- 수정(web app): `(shell)/{inbox,plans,plans/[id],screener,scenarios}/page`·`scenarios/actions`·`plans/[id]/actions?`
- 수정(server): `adapters/kis.ts`·`package.json`
- 제거: `apps/web/lib/inbox-triage.ts`
- 재생성: `packages/core/src/types/database.ts`(live_quotes·inbox_triage)
- docs: `docs/MEMORY.md`·`docs/NEXT-ACTION.md`
- LLM Wiki: `raw/2026-07-05-realtime-streaming-and-realnow-anchor.md`(신규)
