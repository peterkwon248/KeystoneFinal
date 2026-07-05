---
session_date: "2026-07-05 5차"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (2026-07-05 5차 — 실시간 인프라 폴리시 + 배지 + 크론 + 위키, 4커밋 push)
전부 브라우저 E2E · 골든 102/102 · web/서버 tsc 0 · core 무수정 · 4커밋 push(origin/main `f5e1a3f..69bceb8`).

- **`83663cc` 사이드바 인박스 unread 뱃지** — 서버 `computeInboxUnread`(`lib/inbox-unread.ts`) = inbox/page 동일 파생(PLAN_SELECT→syncRuleFirings→buildInboxNotes→triage[muted/resolved/read] 제외). **핵심: 카운트는 lang 독립**(scenarioAlerts note.id·rule 필터 lang 무관) → "en" 고정 계산으로 크로스컷 제거. 세션 중 라이브: `InboxBadgeProvider`(`components/shell/inbox-badge.tsx`)가 서버값 시드 + 인박스 `unreadCount` push, **initial dep sync**(useEffect [initial])로 서버값 바뀔 때만 반영→낙관적 값 미덮음. sidebar는 prop 제거→`useInboxBadge` 소비. ⚠️ App Router 레이아웃은 소프트네비 재실행 안 함(풀로드/router.refresh만)→라이브는 컨텍스트가 담당. E2E: 25→읽음24→처리완료23→모두읽음 배지사라짐(무리로드)·풀리로드 서버 재계산 일치.
- **`ceda2d3` WS폴리시 ①DELETE ②헤드라인 라이브** — ①provider DELETE: `payload.eventType==="DELETE"` 분기→`payload.old.ticker`(replica identity=PK)로 맵 제거→UI가 DB last_close 폴백(기존 `payload.new`만 읽어 DELETE 무시=스테일 잔존). ②`useLiveQuotes()` 전체맵 훅 추가→watchlist-screen이 securities를 맨위 useMemo로 라이브 오버레이→상승/하락/평균등락·등락필터·정렬이 행과 동일 라이브(기존 static DB change). E2E: 005930 override 999,999→delete→309,500 복귀·티커dot 제거 / -50% push→상승4→3·하락4→5·평균+1.19→-6.08→원복.
- **`e3e8128` WS폴리시 ③인트라데이 차트 라인** — 신규 `intraday_prices`(ticker,ts,price,change_pct·PK[ticker,ts]) 마이그레이션(참조데이터패턴·**Realtime publication 불필요** — 차트가 live_quotes Realtime으로 신규틱 수신). db:types 재생성. 워커 flush마다 live_quotes upsert + intraday_prices append(onConflict ticker,ts·ignoreDuplicates). security-detail-data가 당일(refNow) intraday 병렬 페치→`IntradayPoint[]`. `SecurityChart` 추세/당일 토글=서버 시드+`useLiveQuote` 신규틱 append(마지막과 price 다를 때만·인트라데이 있으면 기본 당일). E2E: 당일 10점 시드→로드 시 라인+토글(기본 당일)·라이브틱→11점 append·추세→40점 일봉.
- **`69bceb8` sync:daily 크론 오케스트레이터** — 거래일 가드(주말 스킵·서버로컬시간·`--force`) + sync:ohlc(증분 --years 1)→sync:quotes 순차. 자식 프로세스는 `spawnSync(process.execPath,["--import","tsx",file,...args])` — shell:true DEP0190 회피·크로스플랫폼. `package.json` sync:daily 스크립트. E2E: 일요일→스킵·--force --tickers AAPL→ohlc 250봉+quotes 308.63·div 0.34% 순차성공.
- **①실 거래소 틱 검증** — `stream:quotes` 30초 실행: 7 KR+7 US 로드·KIS WS(ws://ops.koreainvestment.com:21000) open+7구독·Finnhub WS open+7구독·에러0. **연결·구독·인증(approval key) 레이어 확인.** 틱 0(일요일 장외 — 정상). 실틱은 평일 장중 데이터 게이트.
- **③LLM Wiki 5차 컴파일** — raw 3건(realtime-streaming·real-data-seam·ws-polish[이번 세션 작성]) 폴딩. 신규 토픽 `realtime-live-data`(2소스) + 첫 컨셉 `silent-failures`(4토픽 관통). 4토픽 확장(nextjs-dev 5→7·financial-data-apis 2→5·supabase-local-dev 3→4·materialized-derived-state 2→4). INDEX·schema·log·compile-state 갱신.

## In Progress
- 없음. 워킹트리 클린(4커밋 push 완료·`.claude/.active-skill`·`.omc/notepads/`만 미추적).

## Remaining Tasks
- [ ] **실 거래소 틱 실검증** — 평일 장중 `stream:quotes` 실틱 흐름 + intraday_prices 축적 확인(오늘 일요일 장외라 연결만 검증됨).
- [ ] **공휴일 캘린더** — sync:daily 거래일 가드 정교화(현재 주말만·시장별 휴장일 미반영).
- [ ] **WS 폴리시 잔여** — 인트라데이 실틱 축적 E2E · 관심종목 헤드라인 뉴스 라이브 집계.
- [ ] **클라우드 Supabase 연결**(로컬 완성됨·소셜 OAuth 4종) · **마일스톤 8~9**(모바일 Expo / 구독).

## Key Decisions
- **파생 카운트 lang 독립성** — 서버 계산 시 표시 문자열만 lang 의존·집합 판정은 무관 → "en" 고정 계산으로 크로스컷 제거.
- **서버배지 + 클라이언트 라이브 브리지** — App Router 레이아웃 소프트네비 미재실행 → 서버값 시드 컨텍스트 + 화면 push + initial dep sync(낙관적 미덮음).
- **인트라데이 = 영속 테이블(정석, 사용자 선택)** — live_quotes(스냅샷·Realtime 방송) + intraday_prices(append·이력). 차트=영속 시드+live_quotes 신규틱 append → 인트라데이 테이블 Realtime publication 불필요.
- **Realtime DELETE = payload.old(PK)** — replica identity 기본=PK. 자연키 PK면 DELETE 처리 공짜(아니면 REPLICA IDENTITY FULL).
- **크론 자식 프로세스 = node --import tsx** — shell:true DEP0190 회피·크로스플랫폼.

## Blockers / Issues
- **실 거래소 틱 미검증(코드 아님·데이터 가용성)** — 평일 장중에만 실틱. 연결·구독·인증은 확인됨.

## Notes for Next Session
- **실시간 인프라 완성 단계**: 스냅샷(live_quotes)+이력(intraday_prices)+DELETE 처리+라이브 집계+배지+크론. 남은 건 실틱 검증(평일)·공휴일 캘린더.
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs` → (선택)`pnpm --filter @keystone/server sync:daily -- --force` → preview "web". 로그인 webtest@keystone.local / web-test-password-1.
- 검증 게이트: 골든 102(`pnpm --filter @keystone/core test`) + web/server tsc + (dev 끄고 `.next` 삭제 후)`pnpm --filter @keystone/web build`. ⚠️ 마이그레이션 = `migration up`만(reset 금지).
- ⚠️ full `next build`는 이번 세션 미실행(다른 챗 dev 서버 `.next` 충돌 방지) — tsc+골든+브라우저 E2E로 대체 검증.
- 실시간 UI E2E 방법: service_role로 live_quotes/intraday_prices 수동 upsert/delete → Realtime → 브라우저 DOM 폴링(가격·집계·차트 path 점 개수).
- LLM Wiki: 5차 컴파일 완료(`realtime-live-data` 토픽·`silent-failures` 컨셉). 다음 재사용 지식은 raw/ 추가 후 /wiki-compile.

## Files Modified (이번 세션)
- 신규(web): `apps/web/lib/inbox-unread.ts`·`components/shell/inbox-badge.tsx`
- 신규(server): `apps/server/src/sync-daily.ts`
- 신규(마이그레이션): `supabase/migrations/20260705001000_intraday_prices.sql`
- 수정(web): `app/(shell)/layout.tsx`·`components/shell/{app-shell,sidebar}.tsx`·`components/inbox/inbox-screen.tsx`·`components/live-quotes-provider.tsx`·`components/watchlist/watchlist-screen.tsx`·`components/securities/security-detail.tsx`·`lib/security-detail-data.ts`
- 수정(server): `src/stream-quotes.ts`·`package.json`
- 재생성: `packages/core/src/types/database.ts`(intraday_prices)
- docs: `docs/MEMORY.md`·`docs/NEXT-ACTION.md`
- LLM Wiki: raw `2026-07-05-ws-polish-realtime-delete-intraday-live-badge.md`(신규) + 컴파일(realtime-live-data·silent-failures·4토픽 확장)
