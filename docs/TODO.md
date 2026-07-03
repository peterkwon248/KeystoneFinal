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
- [x] 앱 셸: Sidebar + WorkspaceMenu/Settings 이식, 라우트 구조(/plans /inbox /journal /strategy/[id] + placeholder), 테마/언어 토글 (2026-07-03)
- [x] 03 플랜 리스트: ListView + BoardView + TimelineView + DisplayPanel 이식 (2026-07-03, 브라우저 E2E: 11 플랜 시드, 리스트/보드/타임라인 3뷰 + 상태/포트폴리오 그룹핑 검증)
- [x] 앱 셸 레이아웃 버그 수정: `.app-row`(가로 flex) 래퍼 누락 → 사이드바+메인 세로 스택 → 복원 (2026-07-03)
- [x] 사이드바 도구 섹션 (OPTIONAL_DESTS + CustomizeModal — **profiles.sidebar DB 연동**) (2026-07-03, E2E: 핀→상단·숨김·순서·리로드 유지·기본값 복원 검증)
- [x] **04 플랜 상세(DetailView) — 8탭 전부 완료** (2026-07-03, 브라우저 E2E + 골든 102):
  - [x] 셸 · [x] 시나리오 · [x] 활동 · [x] 체결 · [x] 재무제표 · [x] 전략 · [x] 투자지표 · [x] 밸류에이션 · [x] 인사이트(실행정확도 게이지·평단추이 차트·시나리오거리·룰이력, 진입전 empty-state)
- [x] **우측 디테일바(PropsSidebar, `.detail-side`)** ← 04 상세 마지막 조각 (2026-07-03, 브라우저 E2E). 포지션/청산요약·속성(종목/생성/수정)·현황·메모(CRUD)·시나리오요약 + 접기토글(기본 접힘). ⚠️ **커스텀 필드는 이식 안 함** — source PropsSidebar 에 핸들러(CF_TYPES/addCf)만 남은 vestigial 코드였고 디자인(screens/04)에서 제거됨. 처음 잘못 이식했다가 제거함
- [x] **01 인박스(Inbox)** — 3-pane 트리아지 (2026-07-03, 브라우저 E2E + 체결 insert DB왕복). 스누즈 제거 반영. ⏸️ 후속(묶음): 사이드바 unread 뱃지 + 트리아지 DB 동기화, openPlan 탭 딥링크
- [ ] 나머지 스크린: 02 일지 / 05 전략 편집기 / 06 청산 / 07 대시보드(현황) 등 새 핸드오프 스크린 (screens 6→22)
- [ ] GET /fx·/quote — Next.js Route Handler로 (서버 런타임 결정 완료: Next 내장으로 시작)
- [ ] 클라이언트 초기화에서 setFxRate(fx.rate) 연결

## P4 — 마일스톤 6·8·9
- [ ] **과거 시세 히스토리 백필 (마일스톤 6 핵심, 옵션 아님)** — KIS 일봉 + US 대안 provider 조사 + `security_price_history` 테이블. 교체 지점 `lib/trajectory.ts`·`lib/gap-history.ts`. forward-only 축적은 실사용 불가
- [ ] **날짜 앵커 교체** — KS_REF=2026-06-26·GapTab new Date(2026,5,..) 하드코딩 → 실제 today
- [ ] WS 멀티플렉서 + Realtime 팬아웃 (참고 레포 NEXT-ACTION에 정리됨)
- [ ] Expo 모바일 · Stripe/RevenueCat 구독

## 완료
- [x] KeystoneFinal 레포 생성 + 초기 커밋 (2026-07-02)
- [x] 마일스톤 1: 모노레포 + packages/core + 골든 89/89 (2026-07-02)
