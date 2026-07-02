# Keystone — API 계약 (엔드포인트 · 실시간 · 어댑터)

> **목적.** `ARCHITECTURE.md` §5의 산문 API 표면을 **프론트·서버가 함께 코딩하는 구체 계약**으로 확정한다. 두 부류로 나뉜다:
> 1. **사용자 데이터 CRUD** — Supabase 자동생성 REST/SDK + RLS로 대부분 커버(직접 엔드포인트를 새로 짤 필요 거의 없음). 아래는 클라이언트 SDK 호출 규약 + 서버 RPC가 필요한 지점만.
> 2. **시세·재무 피드** — 커스텀 서버(`apps/server`, Supabase Edge Functions 또는 Node). **API 키는 서버 전용**, 클라이언트는 이 서버만 호출.
>
> **공통 규약**
> - 인증: Supabase JWT(`Authorization: Bearer <access_token>`). 커스텀 서버도 같은 JWT 검증.
> - 통화: 응답은 **종목 네이티브 통화**로. 표시통화 환산은 클라이언트(§ARCHITECTURE 12).
> - 다국어 필드는 `{en, ko}` 객체 그대로.
> - 시각은 ISO 8601(UTC). 금액/가격은 number(정밀도 필요 시 string).
> - 에러: `{ "error": { "code": "...", "message": "..." } }` + 적절한 HTTP status.

---

## A. 인증 (Supabase Auth)

SDK가 처리 — 커스텀 엔드포인트 불필요. 규약만:

- **OAuth**: `signInWithOAuth({ provider })` — `google` · `apple`(iOS 필수) · `kakao` · `naver`(OIDC 커스텀 provider 등록). 소셜은 이메일 pre-verified.
- **이메일**: `signUp({email,password})` → 확인메일 → 소프트 인증(배너로 입장 허용, 프로토타입 `Auth.jsx` 동작 유지). `signInWithPassword`.
- **온보딩**: 최초 로그인 후 `profiles.onboarded=false` 면 온보딩 → 완료 시 `profiles` upsert(`prefs`, `onboarded=true`) + `portfolios` 1행 생성(+선택 첫 `plans`).
- **세션**: SDK가 refresh 관리. 클라이언트는 `onAuthStateChange` 구독.

---

## B. 사용자 데이터 CRUD (Supabase SDK + RLS)

테이블별 표준 CRUD는 SDK로 직접(RLS가 격리). 예:

```ts
// 활성 플랜 목록 (+ 시나리오/체결 조인)
const { data } = await supabase
  .from('plans')
  .select('*, scenarios(*), executions(*)')
  .is('deleted_at', null)
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// 체결 추가 (→ 트리거가 plan.status 자동 전이)
await supabase.from('executions').insert({ plan_id, side:'buy', exec_date, price, quantity });

// 소프트 삭제(휴지통)
await supabase.from('plans').update({ deleted_at: new Date().toISOString() }).eq('id', planId);
```

**엔티티**: plans · scenarios · executions · rules · journal_entries · saved_views · watchlist · portfolios · profiles. 규칙은 `DATA_MODEL.md`.

### 서버 RPC가 필요한 지점 (SDK만으론 부족)
| RPC | 이유 |
|---|---|
| `rpc('close_plan', {plan_id, realized_pl})` | 종료 시 status=closed + closed_at + 실현손익 확정 원자 처리 |
| `rpc('evaluate_scenarios', {plan_id})` | 시세 대비 시나리오 status 재판정(서버가 시세를 알아야 함 → §D) |
| `rpc('reorder', {table, ids[]})` | sort 일괄 갱신(관심종목·뷰 드래그 정렬) |

---

## C. 시세 · 재무 피드 (커스텀 서버)

> 모든 응답은 서버 캐시를 경유(provider rate-limit 보호). 키는 서버 env(`KIS_APPKEY`/`KIS_APPSECRET`, `DART_KEY`, `FINNHUB_KEY`, EDGAR는 User-Agent). provider 상세·무료/유료는 `ARCHITECTURE.md` §6.

### `GET /api/quote`
스냅샷 시세(실시간 WS의 폴백/초기값).
```
GET /api/quote?tickers=005930,AAPL,TSLA
→ 200
{
  "quotes": [
    { "ticker":"005930", "price":71200, "change":1.20, "changePct":1.71,
      "currency":"KRW", "asOf":"2026-07-02T05:12:00Z", "stale":false },
    { "ticker":"AAPL", "price":214.30, "change":-0.85, "changePct":-0.40,
      "currency":"USD", "asOf":"2026-07-02T05:12:00Z", "stale":false }
  ]
}
```
- `stale:true` = 장외/지연 데이터(마지막 종가). 클라이언트는 이때 실시간 배지를 끔.
- 소스: KR→KIS REST, US→Finnhub REST.

### `GET /api/ohlc`
히스토리컬 봉 — 계절성 히트맵·일지 스냅샷·차트.
```
GET /api/ohlc?ticker=005930&range=5y&interval=1mo   // interval: 1d|1wk|1mo
→ 200
{ "ticker":"005930", "currency":"KRW", "interval":"1mo",
  "bars":[ { "t":"2021-01-31", "o":81000,"h":96800,"l":80000,"c":82000,"v":123456789 }, ... ] }
```
- 계절성 히트맵의 월수익률 = 인접 `1mo` 종가 비율(프로토타입의 티커 시드 mock 대체).

### `GET /api/fundamentals`
재무 시계열 → `security_financials` 채우기(서버가 정규화 후 upsert; 클라이언트는 대개 DB에서 읽음).
```
GET /api/fundamentals?ticker=005930
→ 200
{ "ticker":"005930", "source":"dart", "unit":"억원",
  "years":[
    { "fiscalYear":2025, "revenue":3011000, "operatingMargin":15.2, "netMargin":11.8,
      "roe":9.1, "grossMargin":38.0, "debtRatio":42.0, "currentRatio":210.0,
      "dividendYield":2.1, "revenueGrowth":6.4 }, ... ] }
```
- KR→DART(K-IFRS), US→SEC EDGAR XBRL(US-GAAP). **정규화 규칙은 §E.**

### `GET /api/fx`
환율 — 프로토타입 `KEYSTONE_FX=1380` 상수 대체.
```
GET /api/fx?base=USD&quote=KRW
→ 200
{ "base":"USD", "quote":"KRW", "rate":1380.5, "asOf":"2026-07-02" }
```
- 소스: Frankfurter/ECB(무료, 일일). 클라이언트는 앱 로드시 1회 + 주기 갱신, 표시통화 환산에 사용.

### `GET /api/search`
종목 검색(온보딩·플랜 생성·리서치 피커).
```
GET /api/search?q=삼성&market=KR   // market 선택
→ 200
{ "results":[ { "ticker":"005930","name":{"en":"Samsung Electronics","ko":"삼성전자"},
                "market":"KR","exchange":"KOSPI" }, ... ] }
```
- 소스: KIS 종목마스터 / 정적 인덱스. `securities` 테이블 우선, 미스 시 provider.

---

## D. 실시간 (WebSocket 팬아웃)

> 구조·근거는 `ARCHITECTURE.md` §8. 핵심: **provider WS 키는 서버 전용**, 서버가 1커넥션으로 받아 다수 유저에 분배. 클라이언트는 **Supabase Realtime 채널**만 구독(별도 WS 인증 불필요).

### 클라이언트 구독
```ts
// 화면에 보이는 종목만 구독 (관심종목/보유/현재 상세)
const ch = supabase.channel('quotes')
  .on('broadcast', { event: 'quote' }, ({ payload }) => applyQuote(payload))
  .subscribe();
// 구독 종목 알림(서버가 합집합 구독을 갱신하도록)
await fetch('/api/stream/subscribe', { method:'POST', body: JSON.stringify({ tickers:['005930','AAPL'] }) });
```
- 브로드캐스트 payload = `/api/quote`의 단건과 동일 shape(`{ticker,price,change,changePct,currency,asOf}`).
- 서버는 **모든 온라인 유저의 관심/보유 종목 합집합**을 provider WS로 구독(중복 제거), 종목별로 팬아웃.

### 서버 책임
- KIS WS(`approval_key`) + Finnhub WS(무료 50종목/커넥션) 멀티플렉싱, 최근가 캐시.
- **장 운영시간**(KR 09:00–15:30 KST / US 09:30–16:00 ET + 프리·애프터) 밖에는 WS 유휴 → 마지막 종가 + 폴링 중단.
- WS 끊김 → REST 폴링(N초)로 강등 + 클라이언트에 `conn:reconnecting` 신호(프로토타입 `conn`/`reconnect` UI 바인딩).
- 시세 갱신마다 해당 종목 시나리오 status 재평가(→ `scenarios.status` 갱신 → Realtime으로 UI 반영).

---

## E. 어댑터 정규화 규칙 (provider payload → 앱 shape)

각 provider 응답을 `securities`/`security_financials`/quote shape로 변환하는 **정규화 계층**(`apps/server/normalize/`). 핵심 매핑:

| 앱 필드 | KR (KIS/DART) | US (Finnhub/EDGAR) |
|---|---|---|
| `price` / `change` | KIS 체결가 `stck_prpr` / 전일대비 | Finnhub `c` / `d`,`dp` |
| `revenue` | DART `수익(매출액)` (K-IFRS 계정) | EDGAR XBRL `Revenues`/`RevenueFromContract...` |
| `operatingMargin` | DART 영업이익/매출 | EDGAR `OperatingIncomeLoss`/`Revenues` |
| `roe` | DART 당기순이익/자본총계 | EDGAR `NetIncomeLoss`/`StockholdersEquity` |
| `unit` | 억원 | 백만$ |
| `gics` | 종목마스터 섹터 → GICS 11 매핑 | Finnhub `finnhubIndustry` → GICS 11 매핑 |

규칙:
- **통화·단위 보존**: 네이티브로 저장(KRW 억원 / USD 백만$). 절대 서버에서 환산하지 않음.
- **회계기준 분기**: K-IFRS ↔ US-GAAP 계정과목이 다르므로 어댑터가 공통 컬럼으로 흡수(`DATA_MODEL.md` security_financials).
- **결측**: provider에 없는 지표는 `null`(프로토타입도 `—` 처리). 채점(`strategies.thresholds`)은 null-safe.
- **GICS 매핑 테이블**은 core 상수로 유지(11개 섹터 고정).

---

## F. 엔타이틀먼트 / 구독 (추후)

```
GET /api/entitlements
→ 200
{ "tier":"free",
  "limits": { "realtime": false, "watchlist": 20, "plans": 50,
              "historyDepth": "1y", "screenerAdvanced": false, "portfolios": 1 } }
```
- 무료=지연 시세·제한 한도, pro=실시간·무제한(게이팅 후보는 `ARCHITECTURE.md` §10).
- 웹훅: `POST /api/webhooks/stripe`, `POST /api/webhooks/revenuecat` → `profiles.subscription_tier` 갱신(서명 검증 필수).
- 클라이언트는 기능 렌더 전 `entitlements` 확인(예: 실시간 배지, 관심종목 추가 상한).

---

## G. 엔드포인트 요약

| Method · Path | 소스 | 인증 | 캐시 |
|---|---|---|---|
| `GET /api/quote` | KIS·Finnhub REST | JWT | 초~수초 |
| `GET /api/ohlc` | KIS·Finnhub | JWT | 일 |
| `GET /api/fundamentals` | DART·EDGAR | JWT | 일~주 |
| `GET /api/fx` | Frankfurter | JWT | 일 |
| `GET /api/search` | KIS 마스터·정적 | JWT | 주 |
| `POST /api/stream/subscribe` | — | JWT | — |
| `GET /api/entitlements` | 내부 | JWT | 세션 |
| `POST /api/webhooks/{stripe,revenuecat}` | 결제 | 서명 | — |
| Supabase Realtime `quotes` 채널 | 서버 팬아웃 | JWT | — |
| CRUD(plans/scenarios/…) | Supabase SDK | JWT+RLS | — |

---

*이 계약은 `ARCHITECTURE.md` §5·§6·§8을 구체화한 것. 스키마는 `DATA_MODEL.md`. 엔드포인트 변경 시 세 문서를 함께 갱신.*
