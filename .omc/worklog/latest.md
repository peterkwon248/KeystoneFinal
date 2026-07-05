---
session_date: "2026-07-05 3차"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-05 3차 — Phase C 실데이터 전환 완료, 6커밋)
6커밋 전부 브라우저 E2E(+ 워커는 service_role DB 조회) · 골든 102/102 · web/서버 tsc 0 · core 무수정. **push 완료.**

- **`063c8e4` OHLCV 백필 파이프라인**
  - NEW `apps/server/src/adapters/tiingo.ts`(US 일봉 `fetchTiingoDaily`, 원가격 upsert, 티커당 1콜 날짜범위) + `kis.ts` `fetchKisDaily`(KR 일봉 `inquire-daily-itemchartprice`/`FHKST03010100`, **호출당 100봉 → 100캘린더일 윈도우 페이지네이션**·중복제거) + NEW `sync-ohlc.ts` CLI(`--market/--tickers/--years`, `security_price_history` upsert source='tiingo'|'kis', 500행 청크) + `db.ts` 공통 `PriceBar`/`PriceHistoryRow` + `env.tiingoApiKey`.
  - **14/14 5년 백필 17,339봉.** 실행: `pnpm --filter @keystone/server sync:ohlc -- --years 5`
  - **버그수정 `/api/ohlc`**: PostgREST `max_rows=1000` 캡에 5년 일봉(~1254행) 최근분 무음 절단 → `.range()` 페이지네이션(스켈레톤 bars=[] 땐 안 드러나다 실데이터로 표면화).
- **`8505099` trajectory 시장가 seam**: `planTrajectory(p, closes?)` — closes 있으면 월인덱스→실날짜(`monthIdxToISO`)→종가 forward-fill(`closeAt` 이진탐색), 없으면 seededWalk 폴백. `isMockPath`. NEW `lib/price-history-map.ts`(server-only 래퍼) + `UIPlan.priceCloses`. Sparkline(3곳)·PerfBand·timeline 전 표면. 축(Sep~Jun) 유지·mkt만 실 종가.
- **`c2b9972` genSpark/mockChange seam**: `mapSecurity(…,closes?)` — 실 spark=최근40봉·change=마지막2봉 델타. NEW `lib/price-closes-query.ts`(클라이언트-세이프 `fetchClosesWith`) — **server-only 회귀수정**(securities-list가 search-modal[client]에서 import돼 server-only 유입 시 앱 500 → 클라이언트 인자 버전 분리). 로더 2곳 주입 → 관심/리서치/스크리너/검색/상세.
- **`86c7e69` 날짜앵커 중앙화**: NEW `lib/clock.ts`(`refNow()`/`REF_YEAR` = core KS_REF 파생). 흩어진 `new Date(2026,5,*)`·"Jun 8"·`2025` 전부 통일(9파일). real-now 전환은 clock.ts 1지점으로 축소(KS_REF는 골든이라 웹 중앙화만).
- **`85b22d7` 규칙발동 워커**: NEW `lib/rule-worker.ts`(server-only) `syncRuleFirings` — 인박스 로드 시 서버 평가, `fired && last==="Never"` 게이트 → `rules.last_fired=refNow`(기존 인박스 자동표시) + `notifications` insert(멱등). `ibxBucket`도 refNow로. E2E: 7규칙 발동→7 notifications·"오늘" 버킷·재로드 중복0.
- **`43bd2bf` fin-history seam**: `finPriceHistory` — `plan.annualCloses`(NEW `fetchAnnualCloses`) 있으면 위치 기반 정렬(fin.is[i]→REF_YEAR-(n-1-i)년, 마지막=현재가). 라벨 파싱 회피. 밴드차트 실 연간종가.

## In Progress
- 없음. 워킹트리 클린(`.claude/.active-skill`·`.omc/notepads/`만 미추적).

## Remaining Tasks
- [ ] **실시간 WS 스트리밍** (마일스톤6 잔여, 선택) — 시세가 정적이어도 앱은 완전 동작. KIS approval_key·Finnhub WS.
- [ ] **gap-history iv/ivHistory + screener SEC_SEED perLo/perHi** — ⚠️ **과거 재무(historical financials) 필요, DB엔 현재+시드만.** 웹 seam 아니라 **과거 재무 백필**(apps/server 어댑터, OHLCV 백필과 유사한 별도 데이터 태스크)이 선행. 지금 코드로 불가.
- [ ] **인박스 트리아지 DB 동기화**(옵션2) — read/resolved/muted를 localStorage→DB(notifications.read_at 등). 기기간 동기화·서버 unread 뱃지. 큰 작업.
- [ ] adhoc 시나리오 편집/삭제(오래 defer).

## Key Decisions
- **날짜앵커 = KS_REF 중앙화만.** core KS_REF는 골든 보호라 수정 불가 → 웹 레이어 clock.ts로 통일. real-now 완전 전환은 시드·trajectory 창까지 얽힌 별도 대작업.
- **규칙 워커 = 인박스 로드 시 서버 평가**(시세 정적이라 cron 불필요) + `last_fired` 게이트로 멱등 + **기존 인박스 구동**(buildInboxNotes가 last_fired 읽음 → UI 재작성 없음). notifications는 영속 기록(옵션2 DB 트리아지 토대).
- **fin-history = 위치 기반 정렬**(FinYearIS.y 라벨 파싱 회피 → DB/seed fin 모두 안전).
- **워커/앵커 timestamp = refNow(KS_REF)** — 실 now() 쓰면 fmtDate inferYear가 7월을 전년(2025) 추론 → 프레임 불일치. refNow로 "6월 26일·오늘" 일관.

## Blockers / Issues
- gap-history/screener 잔여 seam = **과거 재무 부재**(데이터 블로커, 코드 아님). 과거 재무 백필이 선행돼야 실데이터화 가능.
- (해소됨) server-only 번들 오염 회귀 — 클라이언트-세이프 모듈 분리로 해결.

## Notes for Next Session
- **Phase C 실데이터 전환 사실상 완료.** 다음 후보: ①실시간 WS(선택) ②인박스 트리아지 DB 동기화(옵션2, 워커가 이미 notifications 채우니 토대 있음) ③과거 재무 백필(gap/screener seam 언블록용, 별도 데이터 태스크).
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs` → `pnpm --filter @keystone/server sync:ohlc -- --years 5`(OHLCV 백필) → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + `cd apps/web && pnpm exec tsc --noEmit` + `pnpm --filter @keystone/server typecheck`.
- ⚠️ 실데이터 배선 후 앱 500이면 **server-only import trace**부터(client-reachable lib에 server-only 유입 금지 — LLM Wiki nextjs-dev/이번 raw 노트).
- ⚠️ 시계열 엔드포인트는 **PostgREST max_rows=1000 페이지네이션** 필수(`.range()`).
- LLM Wiki: `raw/2026-07-05-real-data-seam-pitfalls.md` 추가됨(max_rows·server-only·KIS 페이지네이션·프로즌 clock) → `/wiki-compile`로 supabase-local-dev/nextjs-dev/financial-data-apis 토픽에 폴딩 예정.

## Files Modified (이번 세션)
- 신규: `apps/server/src/adapters/tiingo.ts`·`apps/server/src/sync-ohlc.ts` · `apps/web/lib/{price-history-map,price-closes-query,clock,rule-worker}.ts`
- 수정(server): `apps/server/src/adapters/kis.ts`·`db.ts`·`env.ts`·`package.json`
- 수정(web lib): `trajectory·plan-mapper·security-mapper·securities-list·security-detail-data·fin-history·inbox·rule-eval-v2`
- 수정(web 컴포넌트): `plan/{perf-band,sparkline,list-view,dashboard-view,detail-view,timeline-view,gap-tab,strategy-tab,props-sidebar}`·`journal/journal-screen`·`securities/security-detail`
- 수정(web app): `api/ohlc/route`·`(shell)/inbox/page`·`(shell)/plans/page`·`(shell)/plans/[id]/page`
- docs: `MEMORY.md`
- LLM Wiki: `raw/2026-07-05-real-data-seam-pitfalls.md`(신규)
