# Keystone — 실앱 전환 아키텍처 & 빌드 스펙 (Claude Code 핸드오프)

> **이 문서의 목적.** `HANDOFF.md`는 *디자인 작업 일지*(무엇을·왜 바꿨나, 턴별)라서 디자인을 이어가는 데는 완벽하지만, 백엔드/실앱을 짜는 사람이 실행할 **엔지니어링 스펙**은 아니다. 이 문서가 그 스펙이다. 프로토타입(`app/Keystone.html` + `.jsx` 모듈들)을 **멀티유저 SaaS(웹+모바일, 추후 월구독)** 로 전환하는 데 필요한 데이터 모델·API·외부 provider·이음새·빌드 순서를 정리한다.
>
> **읽는 순서.** 먼저 §1(제품 결정) → §2(스택) → §7(mock→real 이음새 맵: 지금 코드의 어디를 실제로 바꾸는지) → §4·§5(데이터 모델·API) → §6·§8(provider·실시간). 나머지는 참조용.
>
> **핵심 원칙: 프로토타입은 이음새가 잘 표시돼 있다.** 저자가 실제 데이터/백엔드가 꽂힐 자리마다 `PROD:` / `mock` / `seed` 주석을 박아뒀다. 이 문서의 상당 부분은 "그 마커들을 정식 스펙으로 정리"한 것이다. **순수 계산 로직(밸류에이션·스크리너 채점·시뮬·포맷터)은 그대로 포팅**하고, **데이터 소스와 영속화만 교체**하는 것이 전략이다.
>
> **동반 문서 (이 세트를 함께 읽어라):**
> - **`ARCHITECTURE.md`** (이 문서) — 스택·이음새·빌드 순서의 오케스트레이터. *왜/무엇을.*
> - **`DATA_MODEL.md`** — 실제 Postgres DDL(`CREATE TABLE`) + enum + RLS 정책. CC가 마이그레이션을 그대로 생성할 수 있는 구체 스키마.
> - **`API.md`** — 엔드포인트 계약(method·path·요청/응답 JSON) + 실시간 채널 + 어댑터 정규화 규칙. 프론트·서버 공통 계약.
> - **`HANDOFF.md`** — 디자인 히스토리(참조용).
>
> **현행 도구 세트(중요, m0357 기준 갱신).** 사이드바 도구는 `{관심종목 · 인사이트 · 종목 리서치(research) · 시나리오 모니터 · 스크리너 · 보관함 · 휴지통}`. **재무제표·시뮬레이터 독립 도구는 은퇴** — 종목 상세(SecurityDetail)의 `개요·재무제표·투자지표·밸류에이션` 탭이 그 기능을 100% 담고, `종목 리서치`가 그 진입점이다. 사이드바 영속 키는 `keystone-sidebar-v2`(`{cfg,order,pinned}`).

---

## 1. 제품 결정사항 (확정)

| 항목 | 결정 |
|---|---|
| 사용자 | **멀티유저**. 개인별 계정, 각자 자기 플랜/포트폴리오/일지 소유 |
| 플랫폼 | **웹 + 모바일 앱** 둘 다 |
| 실시간 시세 | **원함**. 무료로 MVP 가능(§6·§8), 규모 커지면 유료 티어 |
| 수익화 | **추후 월구독 유료 모델**. 처음부터 티어/엔타이틀먼트 자리는 잡아두되 결제는 나중에 |
| 비용 방침 | **무료 최우선**. 유료는 앱이 잘 돌아가면 지불 용의 있음 → provider는 무료 1순위 / 유료 2순위(금액·기능 명시)로 기록 |
| 언어 | 한국어 기본 + 영어 (i18n 완비, `data.jsx`의 `T`) |
| 시장 | 한국(KR) + 미국(US) 주식 |

---

## 2. 추천 스택 (+ 근거 + 대안)

### 추천 (내 1안)

```
모노레포 (pnpm + Turborepo)
├─ packages/core      ← 순수 로직/타입 (밸류에이션·스크리너·시뮬·포맷터·i18n) — 웹·모바일 공유
├─ apps/web           ← Next.js (App Router) — 지금 React 프로토타입이 거의 그대로 이식
├─ apps/mobile        ← React Native (Expo) — core 재사용, 같은 백엔드 호출
├─ apps/server        ← 시세/재무 어댑터 (Supabase Edge Functions 또는 소형 Node 서비스)
└─ supabase/          ← Postgres 스키마 + RLS + Auth + Realtime + 마이그레이션
```

| 레이어 | 추천 | 근거 |
|---|---|---|
| **백엔드/DB/인증/실시간** | **Supabase** (Postgres + Auth + Realtime + RLS + Storage) | 무료 티어 넉넉, Postgres로 관계형 모델(플랜↔시나리오↔체결) 자연스러움, RLS로 멀티유저 데이터 격리, Realtime 채널로 시세 팬아웃, OAuth(구글/애플/카카오 OIDC) 내장. 유료 $25/mo부터 |
| **웹 프론트** | **Next.js (React)** | 프로토타입이 이미 React → 컴포넌트·순수로직 이식 최소마찰. SSR/라우팅/env 기본 제공 |
| **모바일** | **React Native (Expo)** | `packages/core`(순수 JS)를 웹과 100% 공유. 애플 IAP/구글 결제·푸시·앱스토어 배포 경로 확보 |
| **시세/재무 어댑터** | **서버 사이드 전용** (Edge Function / Node) | ⚠️ **broker/데이터 API 키는 절대 클라이언트에 두지 않는다.** 서버가 KIS/DART/Finnhub/EDGAR를 호출→정규화→캐시→Realtime으로 팬아웃 |
| **결제(추후)** | **Stripe(웹) + RevenueCat(모바일 IAP 크로스플랫폼)** | 웹은 Stripe 구독, 모바일은 애플/구글 인앱결제 의무 → RevenueCat이 양쪽 엔타이틀먼트 통합 |

### 대안 (2안)
- **Firebase** (Auth+Firestore+Realtime): 실시간·모바일 성숙. 단 Firestore는 문서형이라 이 앱의 관계형 롤업(체결→평단→손익)엔 Postgres보다 불리. 카카오/네이버 OAuth는 커스텀 필요.
- **커스텀 백엔드** (NestJS/Fastify + Postgres + 자체 WS): 통제력 최대, 운영부담 최대. SaaS 초기엔 과함.
- **웹 프레임워크**: Vite+React(더 가벼움, SSR 불필요 시). 모바일 공유 원하면 Expo Router로 웹까지 커버하는 단일 코드베이스도 가능(단 이 앱은 데스크톱 밀도가 높아 웹은 Next 권장).

> **왜 모노레포 + `core` 분리인가:** 밸류에이션 엔진·스크리너 채점·포맷터·타입은 순수 JS라 웹·모바일·서버가 전부 공유해야 중복/드리프트가 없다. 지금 `valuation.jsx`, `futuretest_modes.jsx`, `data.jsx`의 포맷터가 정확히 이 후보다.

---

## 3. 모노레포 구조 (제안 트리)

```
keystone/
├─ packages/
│  ├─ core/
│  │  ├─ valuation/        ← valuation.jsx 포팅 (calcValuation, reverseFromPer, fairToScenarioTargets, seedBands…)
│  │  ├─ screener/         ← 채점 로직 (IND_THRESH, lensThreshOf, thresholds, verdict)
│  │  ├─ simulate/         ← futuretest_modes.jsx (buildPricePath, simulateStrategy)
│  │  ├─ analytics/        ← planReturn, IRR/수렴, 계절성, 인사이트 집계
│  │  ├─ format/           ← fmtMoney/fmtCompact/fmtMktCap + 통화/단위 tiering
│  │  ├─ i18n/             ← data.jsx의 T(en/ko) 추출
│  │  └─ types/            ← §4 스키마의 TS 타입 (Plan, Scenario, Security…)
│  └─ ui/ (선택)           ← 공유 프리미티브 (웹 우선; RN은 별도 구현 가능)
├─ apps/
│  ├─ web/                 ← Next.js. app/*.jsx 뷰들을 페이지/컴포넌트로 이식
│  └─ mobile/             ← Expo. 핵심 화면(현황·플랜·시나리오·관심종목·일지) 우선
├─ apps/server/
│  ├─ adapters/           ← kis.ts, dart.ts, finnhub.ts, edgar.ts, fx.ts (§6)
│  ├─ normalize/          ← provider payload → §4 shape (Security.financials 등)
│  ├─ cache/              ← 시세·재무 캐시 (rate-limit 보호)
│  └─ realtime/           ← WS 멀티플렉서 → Supabase Realtime 팬아웃 (§8)
└─ supabase/
   ├─ migrations/         ← §4 스키마 SQL
   └─ policies/           ← RLS (user_id = auth.uid())
```

---

## 4. 데이터 모델 (엔티티 → Postgres 스키마)

지금은 전부 `data.jsx`/`securities.jsx`의 mock 배열에 암묵적으로만 존재한다. ⚠️ **핵심: 플랜 데이터(`PLANS`)는 in-memory라 새로고침하면 런타임 편집이 날아간다 → 최우선으로 DB화.** 아래는 mock shape에서 그대로 승격한 스키마다. 모든 사용자 소유 테이블에 `user_id uuid`(RLS: `= auth.uid()`) + `created_at` + `updated_at`.

### users / profiles
`id`, `email`, `provider`(google/apple/kakao/naver/email), `email_verified`, `prefs`(jsonb: lang, theme, display_currency, markets[]), `subscription_tier`(free/pro…, 추후), `onboarded`.

### portfolios
`id`, `user_id`, `name`, `base_currency`. (온보딩에서 "내 포트폴리오" 생성)

### securities  *(공유 참조 데이터 — user 소유 아님, 서버가 채움)*
`ticker`(PK, 예 "005930"/"AAPL"), `name`(jsonb {en,ko}), `market`(KR/US), `currency`, `sector`(jsonb {en,ko}), `gics`(jsonb {en,ko}), `exchange`(선택, ADR 대비), `shares_out`.
- **재무 시계열**은 별도 테이블 `security_financials`(아래) — 지금 `FIN_SEED` shape.
- **시세**는 DB에 상시 저장하지 않고 캐시/실시간(§8). 최근 종가만 `securities.last_close` 캐시.

### security_financials  *(= 지금 FIN_SEED)*
`ticker`, `fiscal_year`, `revenue`, `operating_margin`, `net_margin`, `roe`, `gross_margin`, `debt_ratio`, `current_ratio`, `dividend_yield`, `revenue_growth`, `unit`, `source`(dart/edgar), `as_of`. (종목별 5년 시계열; K-IFRS vs US-GAAP는 `market`으로 분기 — `HANDOFF.md` §5의 스키마 분기 참고)

### plans  *(사용자 소유 — 1순위)*
`id`(PLN-xxx 또는 uuid), `user_id`, `portfolio_id`, `ticker`, `currency`,
`name`(jsonb {en,ko}), `status`(research/planning/active/paused/closing/closed),
`strategy_id`(**관점/lens** → strategies.model), `exec_id`(**전략** → exec_strategies),
`created_at`, `closed_at`, `realized_pl`, `eps`, `shares_out`, `custom_fields`(jsonb).
- 파생값(currentPrice, avg cost, deployed, P/L)은 **저장하지 않고** executions에서 롤업(지금 Dashboard가 그렇게 함).

### scenarios  *(plan 하위)*
`id`, `plan_id`, `case`(Bull/Base/Bear), `label`(jsonb {en,ko}), `target`, `thesis`(jsonb {en,ko}), `status`(pending/tracking/approaching/realized/invalidated), `color`, `is_auto`(자동생성 배지).

### executions  *(체결 — plan 하위, 롤업 소스)*
`id`, `plan_id`, `side`(buy/sell), `date`, `price`, `quantity`(또는 `amount`), `round_no`(통합 순번), `note`. **통화는 종목 네이티브 고정**(HANDOFF §6 검증사실).

### rules  *(plan 하위)*
`id`, `plan_id`, `enabled`, `condition`(jsonb: 지표/가격/시나리오 트리거), `action`(알림/상태전이/…), `last_fired`(ts 또는 null).

### journal_entries  *(일지 — nt### )*
`id`, `user_id`, `plan_id`(nullable), `ticker`(nullable), `body`, `created_at`, `price_snapshot`(작성 시점 주가 — ⚠️ 지금은 deterministic mock, 실앱은 실제 스냅샷 stamp), `tags`(jsonb).

### saved_views
`id`, `user_id`, `scope`(plans/screener), `name`, `filters`(jsonb), `grouping`, `ordering`.

### watchlist
`id`, `user_id`, `ticker`, `added_at`, `sort`/`group` 선호(또는 saved_views에 병합).

### 참조(전역, 사용자 무관 — seed 데이터로 이관)
- **strategies (관점/lens)**: `id`, `name`{en,ko}, `color`, `model`(PER/PBR/PSR/DDM/EV…), `thresholds`(jsonb {KEY:{dir,good,warn}}), `grade_focus`(text[]). → 지금 `STRATEGIES`.
- **exec_strategies (전략)**: `id`, `name`{en,ko}, `color`, `category`. → 지금 `EXEC_STRATEGIES`.
- **exec_categories**: `id`, `label`{en,ko}. → 지금 `EXEC_CATS`(현재 localStorage `alphastone-exec-cats`; 사용자별 커스텀 카테고리면 user_id 부여).
- **metric_dictionary**: 지표 개념/공식/방향/등급밴드. → 지금 `KS_METRIC_DICT`/`KS_METRIC_FORMULA`(securities.jsx). 정적이라 core에 상수로 둬도 됨.

> **정밀도 주의:** 금액은 정수 최소단위 또는 `numeric`로. 부동소수 롤업 금지(체결→평단→손익). 통화는 플랜 네이티브 저장, 표시통화는 포맷 시 환산(지금 구조 유지).

---

## 5. API 표면

멀티유저이므로 모든 쓰기는 인증 + RLS 필수. Supabase면 상당수는 자동생성 REST/RPC + 클라이언트 SDK로 커버되고, 시세/재무만 커스텀 서버가 필요하다.

### A. CRUD (사용자 데이터 — Supabase 테이블 + RLS로 대부분 자동)
- plans, scenarios, executions, rules, journal_entries, saved_views, watchlist, portfolios, custom_fields
- 상태 전이(체결 시 status 자동전이)는 **DB 트리거** 또는 서버 RPC로 (지금 App.jsx의 auto-transition 로직 이관)

### B. 시세·재무 피드 (커스텀 서버 — §6 어댑터)
| 엔드포인트 | 소스 | 비고 |
|---|---|---|
| `GET /quote?tickers=` | KIS / Finnhub | 스냅샷(폴백). 실시간은 §8 WS |
| `WS /stream` | KIS WS + Finnhub WS | 실시간 체결/호가 팬아웃 |
| `GET /ohlc?ticker=&range=` | KIS / Finnhub / (KRX) | 히스토리컬 — 계절성 히트맵·일지 스냅샷·차트 |
| `GET /fundamentals?ticker=` | DART / SEC EDGAR | security_financials 채우기 |
| `GET /fx?base=USD"e=KRW` | 무료 FX API | KEYSTONE_FX 대체 |
| `GET /search?q=` | KIS 종목마스터 / 정적 | 종목 검색(온보딩·플랜 생성) |

### C. 인증 (Supabase Auth)
- OAuth: **구글·애플**(iOS 필수) + **카카오·네이버**(KR, OIDC 커스텀). 소셜은 이메일 pre-verify.
- 이메일 가입: 가입→인증메일→소프트 인증(배너)로 입장(지금 Auth.jsx 로직 그대로).
- 세션·리프레시는 SDK가 관리.

### D. 결제/엔타이틀먼트 (추후)
- `GET /entitlements` — 현재 티어 → 기능 게이팅(실시간 vs 지연, 관심종목 수, 플랜 수, 스크리너 심화, 히스토리 깊이).
- 웹훅: Stripe/RevenueCat → subscription_tier 갱신.

---

## 6. 외부 데이터 provider (무료 1순위 / 유료 2순위)

> 방침: **무료로 돌아가는 조합을 1순위**로 확정하고, 규모·품질 필요 시 갈아탈 유료를 금액·기능과 함께 2순위로 기록. 가격/지연/한도는 provider 정책 변동이 잦으니 **연동 직전 재확인** 필수.

### 🇰🇷 한국 주식

**1순위 (무료) — 한국투자증권 KIS Developers**
- REST + WebSocket. **실시간 체결가·호가 무료**(WebSocket, 실시간 접속키 `approval_key`). 국내 + 해외주식, 종목 기본/재무/일정.
- 조건: **KIS 계좌 필요**(실계좌 또는 모의투자). `appkey`/`appsecret` 발급 → REST `access_token` + WS `approval_key`.
- 한도: 계좌당 호출/세션 제한 있음(초당·건수) → 서버에서 멀티플렉싱·캐싱으로 흡수.
- 대안(무료): **키움 REST/OpenAPI**(키움 계좌 필요, 유사).

**1순위 (무료) — DART 오픈API (opendart.fss.or.kr)**
- 한국 상장사 **재무제표·공시 무료**. API 키 발급. → `security_financials`(K-IFRS) 채우는 소스.

### 🇺🇸 미국 주식

**1순위 (무료) — Finnhub**
- 무료: 분당 60콜, **실시간 미국 주식 시세**, 기본 재무, SEC 파일링, **WebSocket 스트리밍(최대 50종목)**.
- ⚠️ 주의: 거래소별로 시세 품질이 달라 일부는 지연(≈15분)일 수 있음 → **정확한 실시간 여부는 대상 종목/거래소로 검증**. 국제시장 실시간은 유료.

**1순위 (무료) — SEC EDGAR (data.sec.gov)**
- 미국 상장사 **공식 재무(XBRL) 무료**. → `security_financials`(US-GAAP) 소스. 키 불필요(User-Agent 요구).

**2순위 (유료) — 미국 시세, 필요 시 승급**
| Provider | 무료 | 유료(대략) | 실시간 | 강점 |
|---|---|---|---|---|
| **Financial Modeling Prep** | 250콜/일 | **~$19/mo 정액** REST+WS | 유료 실시간 | 재무 데이터 풍부(밸류에이션 모델에 유리) |
| **Twelve Data** | 800콜/일·8/분 | ~$29/mo+ | 유료 WS | 글로벌 커버리지 |
| **Polygon.io** | 5콜/분(개발용) | 유료(고티어 real-time, 상위 ~$199/mo) | 상위 티어 | 틱/애그리게이트 정밀 |
| **Alpaca** | IEX 실시간(계좌) | SIP 전체 ~$99/mo | IEX 무료/SIP 유료 | 브로커리지 겸용 |
| **Alpha Vantage** | 25콜/일 | ~$50/mo+ | 제한 | 손쉬운 시작(무료는 너무 빡셈) |

### 💱 환율 (FX) — `KEYSTONE_FX` 대체
- **무료**: Frankfurter(ECB, 무료·키 불필요), exchangerate.host, open.er-api.com. 일일 환율이면 충분. 인트라데이 FX가 필요하면 유료 고려(중요도 낮음).

### 권장 무료 조합 (MVP)
```
KR 시세(실시간)  = KIS WebSocket        (무료, KIS 계좌)
KR 재무          = DART                 (무료)
US 시세(실시간)  = Finnhub WebSocket    (무료, 50종목/커넥션)
US 재무          = SEC EDGAR            (무료)
환율             = Frankfurter/ECB      (무료)
```
→ 규모·품질 필요 시 US를 **FMP $19/mo**(재무+실시간 정액)로 승급이 가성비 최선.

---

## 7. mock → real 이음새 맵 (⭐ 가장 실무적인 표)

지금 코드의 어디를 실제로 갈아끼우는지. (파일:마커 → 대체 소스)

| 지금 (mock/seed) | 위치 | 실제로 교체 |
|---|---|---|
| `PLANS` 배열 (in-memory) | `data.jsx` | **plans/scenarios/executions/rules 테이블 + Supabase 쿼리** (최우선) |
| `KEYSTONE_FX = 1380` | `data.jsx` | FX API (Frankfurter). "swap and the whole app reflows" — 단일 상수 교체 |
| `FIN_SEED` (종목 5년 재무) | `data.jsx` | `security_financials` (DART/EDGAR 정규화) |
| "market price is mock" | `Dashboard.jsx`, 전역 currentPrice | 실시간 시세 (KIS/Finnhub WS) → 스토어 |
| 일지 deterministic 과거가격 | `Journal.jsx` (`nt###` seed) | 실제 `price_snapshot` stamp(작성 시) + 히스토리컬 OHLC(레거시) |
| 계절성 히트맵 "티커 시드" | `SecurityView.jsx` | 히스토리컬 OHLC(월수익률 실측) |
| `seedFinancials`/`seedBands`/`seedSlots` | `valuation.jsx` | 실 재무가 오면 seed는 "초기값"으로만 남고 실데이터가 우선 |
| Auth `PROD:` 스텁 (소셜/이메일/온보딩) | `Auth.jsx` | Supabase Auth (OAuth 4종 + 이메일 verify) + 온보딩→첫 레코드 저장 |
| localStorage `keystone-*` | 여러 파일(§9) | 기기로컬 prefs는 유지, 사용자 데이터는 테이블로 |
| `conn`/`reconnect` 상태 (라이브/재연결 UI) | `App.jsx` | 실제 WS 연결 상태에 바인딩 |
| K-IFRS vs US-GAAP 스키마 분기 | 재무 화면들 (`plan.cur`로 판정) | 이미 분기 구조 있음 → DART/EDGAR 정규화가 각 스키마 채움 |

> 저자가 이미 `conn`/`reconnect`, 통화 분기, FX 단일상수, 재무 스키마 분기를 "네트워크만 붙이면 되게" 설계해놨다. **순수 계산은 건드리지 말 것.**

---

## 8. 실시간 아키텍처

```
[KIS WS]───┐
           ├──> [apps/server: WS 멀티플렉서]
[Finnhub WS]┘        │  · provider별 커넥션 1개(또는 소수)로 유지
                     │  · 구독 종목 = 모든 유저 관심종목/보유종목의 합집합(중복제거)
                     │  · 캐시(최근가) + rate-limit 가드
                     ▼
             [Supabase Realtime 채널]  ← 종목별 토픽(예: quote:AAPL)
                     ▼
        [웹/모바일 클라이언트]  ← 자기 화면에 있는 종목만 구독
```

- **왜 서버 팬아웃인가:** ① API 키를 클라에 못 둠 ② Finnhub 무료는 커넥션/50종목 제한 → 서버가 1커넥션으로 받아 N유저에 분배 ③ rate-limit·캐싱 중앙화.
- **장 운영시간(중요):** KR 09:00–15:30 KST, US 09:30–16:00 ET(+프리/애프터). 장외에는 WS 조용 → 마지막 종가 표시, 폴링 중단(비용/한도 절약). 타임존·서머타임 처리 필수.
- **폴백:** WS 끊기면 REST 폴링(N초)로 자동 강등, `reconnect` UI 표기(이미 있음).
- **비용 현실:** 무료(KIS+Finnhub)로 MVP·소규모 동시접속은 가능. **동시 사용자·종목이 늘면 유료 티어**(FMP $19 / Finnhub 유료 / Polygon)로. 이건 실시간을 "무료로 시작 가능하되, 스케일 시 유료"로 문서화.

---

## 9. 영속화 & 동기화 (localStorage 키 분류)

지금 `localStorage`에 흩어진 키를 **기기로컬 prefs**(그대로 둬도 됨) vs **서버동기 데이터**(테이블/`profiles.prefs`로)로 나눈다.

**기기로컬 유지 OK (UI 상태):**
`keystone-theme-v1`, `keystone-lang-v1`, `keystone-navcollapse-v1`, `keystone-valband-prefs`, `keystone-gapchart-prefs`, `ks_actq_*`(대시보드 액션큐 선호)

**서버 동기화 필요 (기기 넘어 따라와야 함):**
`keystone-cur-v1`(표시통화), `keystone-views-v2`(저장된 뷰 → `saved_views`), `keystone-sidebar-v2`(사이드바 구성 — cfg/order/pinned), `keystone-watch-view`/`keystone-scen-group`(뷰 선호), `alphastone-exec-cats`(커스텀 카테고리 → 테이블), Auth 세션/온보딩(→ Supabase).

> 원칙: **"이 사람의 데이터"는 서버, "이 기기의 표시 취향"은 로컬.** 로그인 시 서버 prefs로 하이드레이트, 로컬은 캐시.

---

## 10. 인증·계정·구독

- **OAuth**: 구글·애플(iOS 심사 필수)·카카오·네이버(KR). 애플·카카오 로그인은 앱스토어/국내 UX상 사실상 필수. 소셜은 이메일 pre-verify라 인증단계 skip(지금 Auth.jsx 주석대로).
- **이메일**: 가입→인증메일→소프트 인증(배너로 입장 허용). Supabase 이메일 확인 흐름에 매핑.
- **온보딩**: 통화·시장·포트폴리오명·(선택)첫 티커 → **첫 실제 레코드로 저장**(portfolios + 선택적 첫 plan). 지금 `OB_KEY` localStorage 스텁을 테이블 쓰기로.
- **구독(추후)**: 티어(free/pro…)를 `profiles.subscription_tier`에. 게이팅 후보 = 실시간 vs 지연 시세, 관심종목/플랜 수, 스크리너 심화(사분면/히트맵), 히스토리 깊이, 다중 포트폴리오. 웹=Stripe, 모바일=애플/구글 IAP(의무) → **RevenueCat으로 엔타이틀먼트 통합**.

---

## 11. 그대로 포팅 vs 프로토타입 스캐폴딩

**그대로 포팅 (핵심 자산 — `packages/core`):**
- `valuation.jsx` 전체(밸류에이션 엔진, 순수)
- `futuretest_modes.jsx`(전략 시뮬 `buildPricePath`/`simulateStrategy`, 순수)
- 스크리너 채점(`IND_THRESH`·`lensThreshOf`·`thresholds`·verdict)
- `planReturn`·IRR/수렴·계절성 수학·인사이트 집계
- 포맷터(`fmtMoney`/`fmtCompact`/`fmtMktCap` + 통화/단위 tiering)
- i18n `T`(en/ko) — 전 문자열
- 지표 사전(`KS_METRIC_DICT`/`KS_METRIC_FORMULA`)
- **뷰 컴포넌트 로직/레이아웃**(App/Detail/Security/Insights/…) — React라 Next로 대부분 이식, 데이터 소스만 props→쿼리로 교체

**버리는 프로토타입 스캐폴딩:**
- `Keystone.html`의 `?v=NNN` 캐시버스터 로더 + 인브라우저 Babel → 정식 번들러
- `window` 전역 부착(`Object.assign(window, …)`) → ES modules/imports
- in-memory `PLANS`/mock 시세 → API/DB
- `.dc.html` / 디자인 문서 모드 관련 잔재

---

## 12. 비기능 요구

- **i18n**: 신규 문자열은 반드시 `T`의 en/ko 양쪽. 영어 누수 전례 있음(HANDOFF §3).
- **장 운영시간/타임존**: KR/US 개장·서머타임. 장외 표시·계산 규칙.
- **정밀도/통화**: numeric 저장, 네이티브 통화 보존, 표시통화 환산은 포맷 시. ADR 등은 종목 메타에 거래소/통화 필드(HANDOFF §6).
- **rate-limit/캐싱**: 시세·재무 provider 한도 방어(서버 캐시·합집합 구독·백오프). 스크리너는 "필터를 서버로 보내 survivors만 채점"(HANDOFF에 이미 설계 방향 있음).
- **상태 UI**: 로딩/에러/빈/오프라인. `conn`/`reconnect` 이미 존재.
- **보안**: API 키 서버 전용, RLS로 유저 데이터 격리, OAuth 리다이렉트 검증.
- **오프라인/모바일**: 마지막 스냅샷 캐시, 재연결 시 동기화.

---

## 13. Claude Code 빌드 순서 (마일스톤)

1. **모노레포 + `core` 추출**: valuation/screener/simulate/format/i18n/types를 순수 패키지로. 유닛테스트로 기존 수치와 동치 확인.
2. **Supabase 스키마 + Auth**: §4 테이블 + RLS, OAuth(구글/애플/카카오/네이버) + 이메일, 온보딩→첫 레코드.
3. **플랜 데이터 DB화**: in-memory `PLANS` → 테이블. CRUD + 체결 롤업 + 상태 자동전이(트리거/RPC). **여기까지면 "내 데이터가 저장되는 진짜 앱".**
4. **재무 어댑터**: DART + EDGAR → `security_financials`. 밸류에이션/재무 화면이 실데이터로.
5. **시세(폴링)**: KIS/Finnhub REST 스냅샷 → 현황/차트. FX 교체.
6. **실시간(WS)**: 서버 멀티플렉서 + Supabase Realtime 팬아웃(§8). `conn` 바인딩.
7. **웹 앱 이식**: Next로 뷰 이관(데이터 소스만 교체).
8. **모바일 앱**: Expo로 핵심 화면(현황·플랜·시나리오·관심종목·일지).
9. **구독(추후)**: 티어·엔타이틀먼트·Stripe/RevenueCat.

> MVP 커트라인 = **1~5**(개인이 로그인해서 자기 플랜을 저장하고 실데이터 재무 + 준실시간 시세로 쓰는 앱). 6~9는 그 위 증분.

---

## 14. 미결정 / 리스크

- **KIS/키움 계좌 의존**: 무료 실시간 KR 시세는 broker 계좌 전제. 서비스 계정 하나로 서버가 대표 호출할지, 유저별 연동할지 결정 필요(약관·한도 확인).
- **Finnhub 무료 실시간 지연**: 대상 종목/거래소별 실지연 검증 필요. 애매하면 US는 FMP $19로.
- **provider 약관/재배포**: 시세를 다수 유저에 팬아웃하는 게 각 provider 약관에 맞는지(특히 실시간 재배포) 확인. 상용 재배포는 유료·별도 계약일 수 있음. ← **런칭 전 법무/약관 체크 항목.**
- **모바일 결제 수수료**: 애플/구글 15~30%. 웹 구독 유도 vs 앱 IAP 정책(애플 규정) 균형.
- **정확한 가격/한도**: §6 수치는 조사 시점 기준 — 연동 직전 각 provider 페이지에서 재확인.

---

*작성 근거: `app/` 소스 전수 grep(‌PROD/mock/seed 마커, localStorage 키, 순수 로직 모듈) + provider 조사. 디자인 히스토리는 `HANDOFF.md` 참조.*
