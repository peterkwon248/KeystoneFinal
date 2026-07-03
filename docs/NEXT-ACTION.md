# NEXT-ACTION

## 다음 세션 즉시 액션 — 마일스톤 7 계속 (웹 이식, 6보다 선행 확정 2026-07-03)
완료: apps/web + Auth/온보딩 + 앱 셸 + **03 플랜 리스트** + 사이드바 도구 섹션. **04 플랜 상세 진행 중(8탭 중 5개 완료)** — 전부 브라우저 E2E 검증. 다음:
1. **04 플랜 상세(DetailView) — 남은 3탭**: ⬜ 전략(StrategyTab 642~1113, 최대 탭·룰/회차) · ⬜ 투자지표(IndicatorsTab, `fin` prop 재사용 가능) · ⬜ 밸류에이션(valuation_view.jsx, core 밸류에이션) · ⬜ 인사이트(planinsights.jsx)
   - ✅ 완료 탭: 셸(헤더 픽커/메트릭/탭바) · 시나리오(카드·수렴분석·**GapTab 차트**) · 활동 · 체결(회차 장부·성과밴드) · **재무제표(IS/BS/CF + 실연결 이음새)**
   - 이후 다른 스크린: 01 인박스 → 02 일지 → 05 전략 편집기 → 06 청산
   - 순수 로직은 @keystone/core에서 import, 데이터는 supabase 쿼리 (ARCHITECTURE §7 이음새 맵). screens/*.png이 픽셀 기준 · source/*.jsx가 로직 기준
   - 04 이식에서 만든 재사용 이음새(추가): `components/plan/mini-dropdown.tsx`, `scenarios-tab.tsx`, `gap-tab.tsx`, `execution-ledger.tsx`, `perf-band.tsx`, `financials-tab.tsx`, `activity-tab.tsx`; `lib/gap-history.ts`(GapTab mock 시계열), `lib/fin-mapper.ts`(DB재무→Fin, DB우선·시드폴백); 헤더 픽커 영속 `app/(shell)/plans/[id]/actions.ts`
   - core 승격(골든 92): `scAutoStatus`/`scProbOf`/`computeLedger`/`buildFinFromSeed`(seed 분리)
2. 상단 필터 패널(FilterPanel) — 지금은 DisplayPanel만 있음
3. GET /fx·/quote Route Handler + 클라이언트 setFxRate 연결
- ⚠️ dev 서버 캐시 꼬이면(하이드레이션 안 됨/청크 404): `.next` 삭제 후 재시작. **`next build`는 dev 서버 끄고 `.next` 삭제 후** 실행 (동시 접근 시 PageNotFoundError)
- ⚠️ **supabase-js 쿼리 빌더는 thenable** — `void supabase.from().update()`는 요청이 안 나감. 반드시 `await` 또는 `.then()`으로 실행 (profiles.sidebar 영속 버그였음)
- ⚠️ **lucide-react 아이콘 개명** — 프로토타입/core의 옛 kebab 이름이 npm 버전에 없을 수 있음(Filter→Funnel, PieChart→ChartPie). `Lic`가 alias 맵으로 흡수하고 미지 아이콘은 dev 콘솔 경고. 새 뷰 이식 때 `[Lic] 알 수 없는 아이콘` 경고 나오면 `components/icons.tsx` LUCIDE_ALIASES에 추가
- 로컬 플랜 시드: `node apps/web/scripts/dev-seed-plans.mjs` (webtest 유저 + 프로토타입 11 플랜)

## ⚠️⚠️ 실데이터 전환 필수 작업 (2026-07-03 기록 — 절대 놓치지 말 것)
현재 웹은 **시점 값(현재가·재무 수치)은 실 DB 필드에 연결**됐지만, **차트 시계열과 날짜 기준은 아직 mock**. 실사용 가능한 투자앱이 되려면 아래가 필수:

### 1. 과거 시세 히스토리 백필 (마일스톤 6 핵심 — 옵션 아님, 반드시)
- **Forward-only(오늘부터 스냅샷 축적)는 실사용 불가.** 유저가 과거 매수 종목의 차트·수익률 추이·보유기간을 보려면 과거 데이터가 전제 → **히스토리 백필이 반드시 선행**. 스냅샷 축적은 그 위에 얹는 실시간성 보조일 뿐.
- 연동 대상: **KIS 국내주식 기간별 시세(일봉)** 엔드포인트 + **US 히스토리**. ⚠️ Finnhub candle은 무료 티어 제약/미지원 가능 → **Alpha Vantage / Tiingo / yfinance 등 대안 provider 조사 필요**(research item). FX 과거 환율은 Frankfurter가 제공(어댑터 이미 있음).
- 저장: **`security_price_history` 테이블 신규**(ticker, date, close[, ohlcv]) — 스키마 마이그레이션 추가.
- **교체 지점(현 mock 이음새 — 이 두 파일만 실데이터로 갈면 차트가 실 시계열)**: `apps/web/lib/trajectory.ts`(스파크라인·성과밴드 궤적), `apps/web/lib/gap-history.ts`(GapTab priceHistory/ivHistory/scenarioHistory).
- ivHistory(가치 추세선)는 과거 재무 × 과거 가격으로 산출하거나 스냅샷 축적.

### 2. 날짜 앵커 교체 (하드코딩 2026-06 → 실제 today)
- 현재 기준일이 **2026년 6월로 frozen**: 프로토타입 `KS_REF=2026-06-26`, GapTab `new Date(2026,5,1)`/`(2026,5,10)`, trajectory/closeout의 월 인덱스 등.
- 실앱 전환 시 실제 `now()` 기준으로 교체 — 상대시간("2일 전")·차트 x축·보유기간 계산 전부 영향.

### 3. 재무 실측 (이음새는 이미 완료 — sync만 하면 됨)
- `lib/fin-mapper.ts`가 DB `security_financials` 완전하면(net_margin 등 non-null) 우선 사용, 아니면 core `FIN_SEED` 폴백. **`sync:financials`(.env)로 DB 채우면 코드 변경 0으로 자동 실측 전환.** 이 머신은 seed(revenue+operating_margin만 채워짐)라 현재 폴백 경로.
- 재무제표는 분기/연간 공시 주기 → "최신 제출본" 기준(실시간 아님).

## 실행 명령 (이 머신)
```
pnpm supabase start
pnpm --filter @keystone/web dev   # localhost:3000 (또는 Claude preview "web")
```
로그인 테스트 계정: webtest@keystone.local / web-test-password-1 (dev-seed-plans.mjs가 생성 — 11 플랜 포함)

## 마일스톤 6 (실시간 WS **+ 과거 시세 히스토리 백필**) 참고 오픈소스 — 2026-07-03 조사
> 마일스톤 6 = 실시간 스트리밍 + **히스토리 백필**(위 "실데이터 전환 필수 §1"). 백필이 차트 실데이터의 전제.
- **koreainvestment/open-trading-api** (⭐1.5k, 공식): WS 샘플 `examples_user/*_ws.py` (체결/호가 구독). 함정 — "No close frame received"는 HTS ID 오입력, 모의계좌는 REST 한도 낮음, rate limit 코드 `EGW00201`(HTTP 200으로도 옴 — 어댑터에 재시도 반영됨)
- **Soju06/python-kis** (⭐281): WS 패턴의 정석 — 재연결 시 구독 자동 재등록(데이터 유실 방지), 토큰 발급 thread-safe 락(장기 실행 서버로 갈 때 필요), 구독 수명 관리
- **unohee/kis-agent** (⭐20, 최신 활발): 실시간 WebSocket 포함 래퍼 — WS 구현 시 교차 참조용
- Finnhub 공식 python 클라이언트는 단순 HTTP 래퍼 — 특별한 패턴 없음, 우리 구현으로 충분

## 첫 스텝 (구체적)
```
pnpm supabase start
pnpm supabase db reset                              # 시드(재무 포함) 재적용
pnpm --filter @keystone/server sync:financials      # DART/EDGAR 실데이터 (.env 필요)
```
`.env.example` 참고 — DART 키는 발급됨, Finnhub/KIS 키가 신규로 필요.

## 잊지 말 것 (핵심 결정)
- **로컬 `supabase start` 기반으로 먼저 완성 → 클라우드 프로젝트 연결은 나중** (2026-07-02 확정)
- **`screens/` 스크린샷 6장이 디자인 구현 기준** — 웹 이식(마일스톤 7) 때 그대로 재현
- **packages/core는 골든 동치 테스트 89개로 보호됨** — 순수 로직 수정 금지, 원본과 달라지면 테스트가 잡음. 골든 재생성: `pnpm --filter @keystone/core goldens`
- 이 폴더는 홈디렉터리 Plot-V3 레포 안의 **중첩 독립 레포** (origin = peterkwon248/KeystoneFinal). PR/커밋은 반드시 이 안에서.
- MVP 커트라인 = 마일스톤 1~5 (ARCHITECTURE.md §13)

## Phase 진행 상황
- [x] 마일스톤 1: 모노레포 + packages/core 추출 (골든 89 테스트, 커밋 e1e8967)
- [x] 마일스톤 2: Supabase 스키마 + Auth (2026-07-02 — 마이그레이션 4개 + seed + RLS/GRANT E2E 검증)
- [x] 마일스톤 3: 플랜 데이터 DB화 (2026-07-02 — plan_positions 뷰 + 전이 트리거 + securities 시드 + DB 타입 생성)
- [x] 마일스톤 4: 재무 어댑터 (2026-07-02 — apps/server + DART/EDGAR 어댑터, 14종 × 5년 동기화 검증)
- [x] 마일스톤 5: 시세 폴링 (2026-07-02 — KIS/Finnhub 14/14 + dividend_yield + FX) ← **MVP 데이터 레이어 완료** (스냅샷만, 히스토리 없음)
- [~] 마일스톤 7: 웹 이식 진행 중 (2026-07-03 — Auth/온보딩/앱셸/03 리스트/사이드바 + 04 상세 5/8탭)
- [ ] 마일스톤 6: 실시간 WS **+ 과거 시세 히스토리 백필** (차트 실데이터 전제 — 위 §1)
- [ ] 마일스톤 8~9: 모바일 / 구독

## 보류 중
- 클라우드 Supabase 프로젝트 생성 (로컬 완성 후)
- 소셜 OAuth 4종 (구글/애플/카카오/네이버) — 클라우드 연결 시
- ~~KIS/키움 계좌 발급~~ → 발급 완료 (2026-07-02, .env에 KIS_APP_KEY/SECRET + FINNHUB_API_KEY)

## 머신
- 집 (Windows, `C:\Users\kwonkyunghun\Desktop\Keystone Final`)
- 데스크톱 (Windows, `C:\Users\user\Desktop\KeystoneFinal`) — 마일스톤 2 진행 머신

## 마지막 갱신
2026-07-03 (집)
