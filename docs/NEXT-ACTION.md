# NEXT-ACTION

## ⚠️⚠️ 새 디자인 핸드오프 도입 (2026-07-03) — 참조 교체됨, ~~core 재조정 미결~~ → **재조정 no-op 확정(2026-07-04)**
`Downloads/키스톤파이널.zip` = **갱신·확장된 디자인 핸드오프** 도입. 사용자 결정 = **"참조만 교체 + core 재조정은 별도"**.
- **교체 완료(참조):** `design_handoff_keystone/` 번들 전체 + root `screens/`(6→**22장**) + root 스펙 5종(ARCHITECTURE/DATA_MODEL/API/HANDOFF/README) = 전부 신버전. 새 스크린 22장 = 07 대시보드/08 보드/09 타임라인 + 10 시나리오모니터 + 11~13 스크리너 + 14 관심종목 + 15 리서치 + 16 인사이트 + 17 보관함 + 18 휴지통 + 19/19b/21/22 종목상세.
- **불변(의도적):** root `source/`(=구 프로토타입, 골든 원본) + `packages/core` + 골든 102 — **건드리지 않음**.
- **✅ source/core 재조정 = 실측 no-op (2026-07-04 검증, 종결):** `~~새 핸드오프 source/*.jsx가 순수로직까지 전부 바뀜~~`은 **오판이었음**. root `source/` ↔ `design_handoff_keystone/source/` 32개 파일을 실제 대조하니 **유일한 차이는 라인엔딩(root=CRLF, 신=LF)** — 라인엔딩+공백 정규화 시 30개 파일 **바이트 동일**. 실제 로직 델타는 `App.jsx`(2줄)·`P4Views.jsx`(5줄) **둘뿐이고 전부 `ResearchBrowser` 뷰 코드**(`onOpenPlan` prop + `NPlansBadge` 추가) — **순수로직 아님**, 아직 웹 미이식된 15 리서치 화면 코드라 그때 자연 흡수. **골든 생성기가 읽는 파일(data/securities/valuation/futuretest/icons/DetailView/ledger)은 전부 동일 → core 수정·골든 재생성 불필요.** 골든 102/102 green 유지. `diff -q`가 32파일 전부 changed로 보인 건 CRLF에 속은 것. (원인: 새 핸드오프 zip이 LF로 재저장됨.)
- **🟡 새 핸드오프가 명시한 설계 변경(이식 시 반영):** ① **인박스 스누즈(나중에) 제거** → 트리아지 처리완료·음소거·기록만, 탭 전체/안읽음 (01 인박스 이식 전 필수) ② **종목 리서치 통합** — Statements+Simulator 폐기, 보안상세 진입. 사이드바 도구 = 관심종목·인사이트·종목리서치·시나리오·스크리너·보관함·휴지통 ③ 밸류에이션 멀티메서드 밴드차트·종목 월별 히트맵·크로스뷰 필터팝오버(GICS+KR/US)·스탯 스트립.
- 참고: 새 README 규칙 = **"스크린샷 vs 라이브 프로토타입 불일치 시 프로토타입(source/) 승리"**. 01-06 캡처는 구버전(스누즈 등 옛 UI 잔존) — 07~ 및 프로토타입이 최신.

## 다음 세션 즉시 액션 — 마일스톤 7 계속 (웹 이식, 6보다 선행 확정 2026-07-03)

### 🗺️ 마일스톤 7 잔여 실행 계획 (2026-07-04 배정 — 순서·선행조건·defer 전부 포함)
> 목적: 여태 "defer"로 나열만 됐던 것들을 **순서·선행작업과 함께 배정**. 로드맵 정본은 `ARCHITECTURE.md §13`(마일스톤 6=실데이터, 7=웹이식 (a)뷰 (b)write-path (c)선행스키마).

**Phase A — 남은 뷰 이식** (securities-list·FilterPanel 재사용):
1. **15 리서치**(ResearchBrowser) — securities-list 재사용. **선행: SecurityPicker(종목 검색 드롭다운) 이식**(B6 Cmd+K 검색모달과 공유 컴포넌트 → 함께 or 먼저).
2. **11~13 스크리너** — securities-list + core screener 로직(`screener.test.ts` 있음) + FilterPanel. 3뷰(리스트/히트맵/4분면).
3. **18 휴지통** — `deleted_at` 있음. restore/deleteForever 서버액션(뮤테이션)만.
4. **17 보관함** — 🔶 **선행: 스키마 `plans.archived_at` 마이그레이션**(아래 S1). 이후 archive/restore 뮤테이션.

**Phase B — write-path 기능 (현재 defer 해소)**:
5. **SecurityPeek 팝오버** — 순수 프론트, security-mapper 재사용. 소규모.
6. **Cmd+K 전역 검색모달**(SearchModal) — securities-list + plans 검색. SecurityPicker와 공유(A1과 묶기).
7. **시나리오 작성 모달(플랜 시나리오)** — SecurityPicker + ScenarioAuthor 폼 → scenarios insert(서버액션). "새 시나리오"/"+시나리오추가"/onAddScenario no-op 해소(플랜 대상은 지금 가능).
8. 🔴 **플랜 생성(compose 플로우)** — **핵심 기능·규모 큼**. 종목·전략·관점·시나리오 입력 위저드 → plans+scenarios insert. onCreatePlan no-op 해소. 백엔드(plans insert+RLS)는 준비됨. ⚠️ 22스크린 목록에 없던 누락 기능 — 여기 명시.
9. **adhoc 종목 시나리오** — 🔶 **선행: 스키마 `scenarios.plan_id` nullable + `ticker` 마이그레이션**(아래 S2). 이후 작성모달 adhoc 경로 + 시나리오모니터/종목상세의 생략된 SECURITY_SCENARIOS 부활.

**Phase C — 실데이터 (= 마일스톤 6, 웹이식과 병행/후속)**:
- mock seam 3종(`change`/`spark`/차트 시계열) → 실 시세. `security_price_history` 백필 + 실시간 WS. **교체 지점**: `mockChange`(security-mapper)·`genSpark`·`trajectory.ts`·`gap-history.ts`·`fin-history.ts`.

**🔶 선행 스키마 마이그레이션 2건 (묶어서 처리 권장 → `pnpm db:types` 재생성)**:
- **S1**: `plans.archived_at timestamptz` (→ A4 보관함).
- **S2**: `scenarios.plan_id` nullable + `scenarios.ticker text` (→ B9 adhoc 시나리오).

**권장 순서**: A1+B6(SecurityPicker 공유) → A2 스크리너 → A3 휴지통 → B5 peek → S1→A4 보관함 → B7 작성모달 → B8 플랜생성 → S2→B9 adhoc. C(실데이터)는 마일스톤6에서.

---
완료: apps/web + Auth/온보딩 + 앱 셸 + **03 플랜 리스트** + 사이드바 도구 섹션. **04 플랜 상세 8탭 + 우측 디테일바 완료** — 전부 브라우저 E2E 검증. (아래는 이력·이음새 상세)
1. ✅ **07 대시보드(현황)·16 인사이트 완료(2026-07-04)** — 07=`components/plan/dashboard-view.tsx`(트리맵·헤드라인·액션큐)+openPlan `?tab=` 딥링크+plan `sector`. E2E(트리맵 8타일·시장그룹 KR/US·액션큐 2·dash-row→체결 딥링크). 16=`components/insights/insights-screen.tsx`+`(shell)/insights/page.tsx`. 10=`components/scenarios/scenarios-screen.tsx`+`(shell)/scenarios/page.tsx`(전 플랜 시나리오 모니터+상태/종목/케이스 그룹+공용 FilterPanel). E2E 완료(콘솔 0). 상세는 MEMORY.md. **공용 이식됨: `components/plan/filter-panel.tsx`(watchlist/screener/archive 언블록) + `components/plan/dash-stat.tsx`.** **🎯 다음 = 11~13 스크리너 · 14 관심종목 · 15 리서치 · 17 보관함 · 18 휴지통 · 19~22 종목상세.**
   - ✅ **19~22 종목상세 + 14 관심종목 완료(2026-07-04)**: 종목상세=`securities/[ticker]/`+`security-detail.tsx`(헤더·차트·계절성·4탭·관심토글·**이 종목의 시나리오**·**종목 메모**[journal_entries]). 관심종목=`watchlist/`+`securities-list.ts`(공용 종목리스트 레이어). E2E 전부 검증(시나리오 딥링크·메모 CRUD·change 혼합부호). 상세는 MEMORY.md.
   - ⚠️ **남은 화면**: **15 리서치**(ResearchBrowser — securities-list 재사용, SecurityPicker 필요) · **11~13 스크리너**(securities-list + core screener 로직 + FilterPanel) · 17 보관함(**archived_at 마이그레이션 선행**) · 18 휴지통(deleted_at 있음, restore/deleteForever 뮤테이션).
   - ⚠️ **아직 defer 상태**: adhoc 종목단독 시나리오·시나리오 작성 모달(onNewScenario/SecurityPicker/ScenarioAuthor, "새 시나리오"·"+시나리오추가" no-op)·SecurityPeek 팝오버·Cmd+K SearchModal·onCreatePlan(버튼 no-op). **mock seam(마일스톤6)**: change 일일%(mockChange)·spark·차트 시계열.
   - 순수 로직은 @keystone/core에서 import, 데이터는 supabase 쿼리. **로직 기준은 root `source/`=`design_handoff_keystone/source/` (동일 — 라인엔딩만 차이, 재조정 no-op 확정).** "핸들러≠렌더" grep 확인.
   - ⏸️ 잔여: 상단 필터 패널(FilterPanel) · GET /fx·/quote Route Handler · 인박스 사이드바 unread 뱃지+트리아지 DB 동기화(openPlan 탭 딥링크는 07에서 해소됨).
   - ✅ **원본 6개 스크린(01~06) 전부 완료(2026-07-03)**: 01 인박스(3-pane 트리아지, 체결 DB왕복, 스누즈 제거)·02 일지(`components/journal/*`, 플랜 노트 피드+since 트랙, patchNotes 재사용)·03 리스트·04 상세(8탭+우측바)·05 전략편집기(`components/strategy/*`, 읽기전용 4탭, core 프리셋)·06 청산(인박스 리더 청산카드). 
   - ⏸️ **인박스 후속(묶음)**: 사이드바 unread 뱃지 + 트리아지 DB 동기화(트리아지가 DB로 가야 서버계산 가능). openPlan 탭 딥링크. 종목 저널(일지 SECS)은 종목상세 이식 때.
   - ✅ **04 상세 완료(2026-07-03)**: 8탭(시나리오·전략·재무제표·투자지표·밸류에이션·인사이트·체결·활동) + **우측 디테일바(PropsSidebar)** — 포지션/청산요약·속성(종목/생성/수정)·현황·메모(CRUD)·시나리오요약 + 접기토글(**기본 접힘**, `rightCollapsed` 로컬 state 비영속). closeoutSummary는 웹 lib(`lib/closeout.ts`)로 core computeLedger 재사용 → 골든 무손상
   - ⚠️ **커스텀 필드는 이식 안 함(교훈)**: source `PropsSidebar`에 `CF_TYPES`/`addCf` **핸들러만 남은 vestigial 코드**(JSX 렌더엔 없음)라 디자인에서 제거된 것. 처음 잘못 이식했다가 유저 지적으로 제거. **다음 뷰 이식 때도 "핸들러 정의됨 ≠ 실제 렌더됨" 확인 — source의 return(JSX)에 실제로 그려지는지 grep으로 검증할 것**
2. 상단 필터 패널(FilterPanel) — 지금은 DisplayPanel만 있음
4. GET /fx·/quote Route Handler + 클라이언트 setFxRate 연결
- ⚠️ dev 서버 캐시 꼬이면(하이드레이션 안 됨/청크 404): `.next` 삭제 후 재시작. **`next build`는 dev 서버 끄고 `.next` 삭제 후** 실행 (동시 접근 시 PageNotFoundError)
- ⚠️ **supabase-js 쿼리 빌더는 thenable** — `void supabase.from().update()`는 요청이 안 나감. 반드시 `await` 또는 `.then()`으로 실행 (profiles.sidebar 영속 버그였음)
- ⚠️ **SWC ≠ tsc: JSX 안 제네릭 캐스트 금지** — `tsc --noEmit`는 통과해도 Next(SWC) 파서는 JSX 자식/표현식 안의 `as Record<string,string>`·`({} as Partial<X>)` 같은 제네릭 캐스트에서 `<string>`을 JSX 태그로 오인해 `Expected '</', got jsx text` 에러(엉뚱한 줄 지목). 투자지표 이식 때 발생 → 캐스트를 JSX 밖 본문(statement)으로 hoist해 해결. **밸류에이션/인사이트 이식 때도 IIFE-in-JSX + 제네릭 캐스트 패턴 주의.** typecheck 그린이어도 브라우저 콘솔/`preview_logs`로 SWC 컴파일 확인 필수. dev 서버가 stale 에러에 물리면 **서버 재시작**(파일워처가 Windows에서 재컴파일 놓침)
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
- [~] 마일스톤 7: 웹 이식 진행 중 (2026-07-03 — Auth/온보딩/앱셸/03 리스트/사이드바 + **04 상세 7/8탭**: +전략·투자지표·밸류에이션. 남은 것 = 인사이트 탭 + 우측 디테일바)
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
2026-07-03 심야 (집)
