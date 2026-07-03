# SESSION-LOG (append-only, 최신이 위)

## 2026-07-03 저녁 (집)

### 완료 — 마일스톤 7 (웹 이식): 04 플랜 상세 5탭 이식
- **셸**: 크럼·헤더 픽커(상태/포트폴리오/전략, 서버 액션 영속)·티커라인·타이틀·메트릭행+스파크라인·8탭 바 + MiniDropdown 이식. 스크린샷 04 상단부 재현
- **시나리오 탭**: 카드 그리드(함의 PER/시총 파생 — 프로토타입 값 정확 일치)·평균 카드·수렴분석(IRR)·상태 pill + **GapTab 히어로 차트**(내재가치 vs 가격 SVG 시계열·기간 토글·괴리 헤드라인·체결 마커)
- **활동 탭** / **체결 탭**(회차 누적 장부·성과밴드 — 합계행 메트릭 일치)
- **재무제표 탭**: IS/BS/CF 3표+토글·렌즈 강조·Waterfall·차트 + **DB우선·시드폴백 실연결 이음새**(`lib/fin-mapper.ts`)
- **core 순수 로직 4종 승격**(골든 89→92): scAutoStatus·scProbOf·computeLedger·buildFinFromSeed(seed 분리). 골든 생성기 슬라이스 eval 방식
- **버그 수정 2건**: 사이드바 nav 아이콘 전멸(`Lic` color="inherit"→currentColor) / help-circle 개명(→CircleQuestionMark). 아이콘 alias
- executor-high 3회 위임(GapTab·체결·재무제표), 메인이 브라우저 E2E 검증. 커밋 6건 전부 검증 후

### 브레인스토밍 & 큰 결정
- **증분 이식 전략**: DetailView 3065줄+valuation_view+planinsights를 탭 단위 증분으로. 각 탭이 쓰는 데이터를 그 증분에서 실 DB 필드로 연결
- **실데이터 전환 = "탭 이식마다" 국소 연결**, 큰 전환점 없음. 순수 로직은 골든 보호로 mock/실 동일 동작
- **⚠️ 과거 시세 히스토리 백필이 마일스톤 6 핵심(옵션 아님)** — forward-only 축적은 실사용 불가. 유저 과거 차트/보유기간의 전제. KIS 일봉+US 대안 provider 조사 필요
- **날짜 앵커(2026-06 하드코딩) 실제 today 교체** 필수 — NEXT-ACTION §실데이터에 명시 기록
- 재무 이음새는 sync 시 코드변경0으로 자동 실측(fin-mapper DB완전성 판정)

### 다음
- 04 상세 남은 4탭: 전략(최대)·투자지표(fin 재사용)·밸류에이션·인사이트 → 이후 01/02/05/06 스크린 (NEXT-ACTION 참조)

### Watch Out
- 이 머신 DB `security_financials`는 seed(revenue+op_margin만) → 재무제표는 core FIN_SEED 폴백 경로. 실측은 `sync:financials`(.env) 후
- 차트 시계열은 전부 mock(`lib/trajectory.ts`·`gap-history.ts`) — 마일스톤 6 백필 전까지
- 프리뷰 스크린샷 툴 간헐 타임아웃(페이지는 정상) — DOM/inspect로 대체 검증
- 시드 재실행 시 플랜 uuid 바뀜 → 하드코딩 상세 URL 404 (리스트에서 재진입)

### 머신
집

## 2026-07-03 오후 (집)

### 완료 — 마일스톤 7 (웹 이식) 계속
- **03 플랜 리스트 이식**: ListView + BoardView + TimelineView + DisplayPanel (source/ListView.jsx·BoardTimeline.jsx·Panels.jsx). 재사용 이음새 신설: `lib/plan-mapper.ts`(DB row→프로토타입 Plan + PLAN_SELECT), `lib/trajectory.ts`(mock 궤적), `components/plan/*`(scenario-gauge/sparkline/group/*-view/display-panel), `components/icons.tsx`에 StatusIcon/StrategyBadge
- **앱 셸 레이아웃 버그 수정**: `.app-row`(가로 flex) 래퍼 누락 → 사이드바+메인이 세로로 쌓임 → 프로토타입 구조(.app 세로 > .app-row 가로 > 사이드바+main) 복원
- **사이드바 도구 섹션 + CustomizeModal**: OPTIONAL_DESTS 7종 + 핀/표시/순서/기본값복원, **profiles.sidebar(jsonb) DB 동기화**. `lib/sidebar-config.ts` + `components/shell/sidebar-config.tsx`(Context) + `customize-modal.tsx`
- **아이콘 버그 수정**: lucide-react가 `Filter→Funnel`, `PieChart→ChartPie`로 개명 → 스크리너·부분합산 SOTP·6:4 자산배분 아이콘이 조용히 null. `Lic`에 개명 alias 맵 + dev 경고 추가 (core는 골든 보호라 클라 래퍼에서 흡수)
- **로컬 검증 시드**: `apps/web/scripts/dev-seed-plans.mjs` — webtest 유저 + 프로토타입 11 플랜(전 상태 커버)
- 브라우저 E2E 전부 검증: 3뷰 렌더·그룹핑·핀/숨김/리로드 유지·아이콘 복구. 골든 89/89 + typecheck + next build 그린

### 브레인스토밍 & 큰 결정
- 사이드바를 스크린샷과 100% 맞추는 작업(도구 섹션)을 04 상세보다 먼저 진행 (사용자 선택)
- profiles.sidebar를 source of truth로 (localStorage 아님) — ARCHITECTURE §9 "기기 넘어 따라오는 데이터는 서버"
- **supabase-js 쿼리 빌더 = lazy thenable** 발견: `void supabase...update()`는 요청이 안 나감. mutation은 반드시 await/.then

### 다음
- 04 플랜 상세(DetailView 3065줄, 최대 덩어리) → 상단 필터 패널(FilterPanel) → 01/02/05/06

### Watch Out
- `next build`는 dev 서버 끄고 `.next` 삭제 후 (동시 접근 시 dynamic route PageNotFoundError)
- lucide 아이콘 침묵 null: 새 아이콘 추가 시 dev 콘솔에 `[Lic] 알 수 없는 아이콘` 경고 확인
- 이 머신(집)에 `.env`(어댑터 키 5종)는 아직 없음 — 뷰 이식만 하면 불필요, 시세 갱신 시 필요

### 머신
집

## 2026-07-02 오후 (집)

### 완료
- **KeystoneFinal 독립 레포 생성** (public, peterkwon248/KeystoneFinal) — 홈디렉터리 전체가 Plot-V3 레포라서 PR이 엉뚱한 곳으로 가는 함정 발견 → 중첩 독립 레포로 해결
- 프로토타입 + 스펙 문서 초기 커밋 (89파일)
- **마일스톤 1 완료**: pnpm+Turborepo 모노레포 + `packages/core` 순수 로직 추출
  - valuation / simulate / screener / analytics / format / i18n / reference / seed / types
  - 골든 동치 검증: 원본 .jsx를 Node vm에서 eval → goldens.json → vitest **89/89 통과**
  - tsc strict 클린, export 표면 68개 스모크 검증
  - 커밋 e1e8967 (main 직푸시)

### 브레인스토밍 & 큰 결정
- **Supabase는 로컬 `supabase start`(Docker) 기반으로 먼저 완성, 클라우드 연결은 나중** — 무료·빠른 반복을 위해
- 골든 테스트 전략 채택: "포팅 동치"를 사람 눈이 아니라 기계로 증명 (플랜 11 × 시뮬 21조합 × 재무 14종목)
- i18n 원본 비대칭 발견: `tip_trough_peak`은 ko에만 존재 (en 577 / ko 578 키) — 의도적으로 보존
- 포팅은 executor 에이전트 2개 병렬 위임, 검증은 메인이 직접

### 다음
- 마일스톤 2: supabase init/start → DATA_MODEL.md DDL 마이그레이션 + RLS + 이메일 Auth (NEXT-ACTION.md 참조)

### Watch Out
- 이 폴더는 Plot-V3 레포 안의 중첩 독립 레포 — git 명령은 반드시 이 폴더 안에서
- packages/core 수정 시 골든 테스트 깨지면 "포팅 드리프트"라는 뜻 — 원본 의미 변경은 마일스톤 7 이후에만
- `KS_REF`(앱 기준일 2026-06-26)는 목업 날짜 앵커 — 실앱 전환 시 실제 오늘로 교체 필요

### 머신
집
