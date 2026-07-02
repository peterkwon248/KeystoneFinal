# TODO.md

## P0 — 마일스톤 2: Supabase 스키마 + Auth (로컬)
- [x] Docker Desktop 확인 + `supabase init` + `supabase start` (2026-07-02)
- [x] `DATA_MODEL.md` DDL → `supabase/migrations/` (enum, 테이블 14개)
- [x] RLS 정책 전 테이블 + **명시적 GRANT** (PG17 hardened defaults 때문에 필수 — 20260702000400)
- [x] 이메일 가입(소프트 인증: confirmations off, 즉시 세션) REST로 검증
- [x] 온보딩 → portfolios 첫 레코드 저장 경로 REST로 검증 (RLS 사용자 격리 확인)
- [x] 참조 데이터 seed (strategies 8 / exec_strategies 7 / exec_categories 3)
- [ ] Auth.jsx 로직 → 실제 앱 클라이언트 매핑 (apps/ 생성 시 — 마일스톤 3~7에서)

## P1 — 마일스톤 3: 플랜 데이터 DB화
- [x] plans/scenarios/executions/rules CRUD (PostgREST 자동 — REST E2E 검증, 2026-07-02)
- [x] 체결 롤업 `plan_positions` 뷰 (**security_invoker 필수** — 없으면 RLS 우회 유출)
- [x] 상태 자동전이 트리거 2종 (매수→active, 전량매도→closing — App.jsx:620-622 이관)
- [x] saved_views / watchlist / journal_entries CRUD (REST 스모크 통과)
- [x] securities 14종 시드 (프로토타입 부트스트랩 — 마일스톤 4에서 실데이터로 덮어씀)
- [x] DB 타입 생성 → `packages/core/src/types/database.ts` (재생성 `pnpm db:types`)
- [ ] 평단/미실현손익 파생 계산은 core(analytics) 클라이언트 몫 — apps 이식 때 연결

## P2 — 마일스톤 4·5: 실데이터
- [x] DART 어댑터 → security_financials (K-IFRS, KR 7종 × 2021-2025) (2026-07-02)
- [x] EDGAR 어댑터 → security_financials (US-GAAP + IFRS 폴백, US 7종) (2026-07-02)
- [x] FIN_SEED 부트스트랩 시드 (source='seed', 어댑터가 덮어씀)
- [x] FX 어댑터: Frankfurter + er-api 폴백 (`check:fx`로 검증, USD/KRW 1558) (2026-07-02)
- [x] KIS/Finnhub REST 스냅샷 폴링 → securities.last_close (14/14, KIS 간헐 500 재시도 흡수) (2026-07-02)
- [x] dividend_yield: KR = DART alotMatter DPS ÷ 현재가, US = Finnhub 지표 (무배당만 null) (2026-07-02)

**→ MVP 커트라인(마일스톤 1~5) 데이터 레이어 완료 (2026-07-02)**

## P3 — 마일스톤 7 (웹 이식, 6보다 선행 결정 2026-07-03) — 진행 중
- [x] apps/web 스캐폴딩 (Next.js 15 App Router) + 테마 CSS 이식 (colors_and_type + reticle)
- [x] Supabase Auth: 이메일 가입/로그인 (Auth.jsx LoginScreen 이식, 소셜 4종은 비활성 UI)
- [x] 온보딩 3단계 → profiles upsert + portfolios + 첫 plan (브라우저 E2E 검증)
- [x] 홈: DB 데이터 경로 증명 (플랜 + KIS 실시세 표시)
- [ ] screens/ 6장 뷰 이식: 01 인박스 / 02 일지 / 03 플랜 리스트 / 04 플랜 상세 / 05 전략 편집기 / 06 청산
- [ ] 앱 셸 (Sidebar/Chrome.jsx 이식) — 뷰 이식의 선행 작업
- [ ] GET /fx·/quote — Next.js Route Handler로 (서버 런타임 결정 완료: Next 내장으로 시작)
- [ ] 클라이언트 초기화에서 setFxRate(fx.rate) 연결

## P4 — 마일스톤 6·8·9
- [ ] WS 멀티플렉서 + Realtime 팬아웃 (참고 레포 NEXT-ACTION에 정리됨)
- [ ] Expo 모바일
- [ ] Stripe/RevenueCat 구독

## 완료
- [x] KeystoneFinal 레포 생성 + 초기 커밋 (2026-07-02)
- [x] 마일스톤 1: 모노레포 + packages/core + 골든 89/89 (2026-07-02)
