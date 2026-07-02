# MEMORY.md — Source of Truth

## 프로젝트
**Keystone** — 투자 플랜 관리 SaaS. React 프로토타입(`source/`)을 멀티유저 SaaS(웹+모바일, 추후 월구독)로 전환.
- 레포: `peterkwon248/KeystoneFinal` (public) · 로컬: `Desktop\Keystone Final` (Plot-V3 홈레포 안의 중첩 독립 레포)
- 스펙: `ARCHITECTURE.md`(오케스트레이터) + `DATA_MODEL.md`(DDL) + `API.md`(계약) + `HANDOFF.md`(디자인 히스토리)
- **디자인 기준: `screens/` 스크린샷 6장 그대로 구현** (Linear 스타일 다크 UI)

## 확정 방향
- 스택: 모노레포(pnpm+Turborepo) / packages-core / Next.js / Expo / Supabase / 서버 어댑터
- Provider(무료 1순위): KIS·DART·Finnhub·EDGAR·Frankfurter
- **Supabase: 로컬 `supabase start` 기반 먼저 완성 → 클라우드 연결 나중** (2026-07-02)
- 순수 계산 로직은 절대 재작성하지 않고 포팅 + 골든 동치 검증

## 마일스톤 진행 (ARCHITECTURE.md §13)
| # | 내용 | 상태 |
|---|---|---|
| 1 | 모노레포 + core 추출 | ✅ 2026-07-02 (커밋 e1e8967, 골든 89/89) |
| 2 | Supabase 스키마 + Auth | ✅ 2026-07-02 (마이그레이션 4개 + seed, E2E 검증) |
| 3 | 플랜 데이터 DB화 | ✅ 2026-07-02 (롤업 뷰 + 전이 트리거 2종 + 타입 생성, E2E 검증) |
| 4 | 재무 어댑터 (DART/EDGAR) | ✅ 2026-07-02 (apps/server, 14/14 동기화, 실측 교차검증) |
| 5 | 시세 폴링 + FX | ✅ 2026-07-02 (KIS/Finnhub 14/14 + dividend_yield + FX) ← **MVP 데이터 레이어 완료** |
| 6~9 | 실시간 WS / 웹 / 모바일 / 구독 | |

## 커밋/PR 히스토리
- `685525a` 초기 커밋: 프로토타입 + 스펙 + 스크린샷 (2026-07-02)
- `e1e8967` 마일스톤 1: 모노레포 + packages/core + 골든 테스트 (2026-07-02, main 직푸시)

## 핵심 기술 사실
- `packages/core` 골든 테스트: `pnpm --filter @keystone/core test` / 골든 재생성: `... goldens` (scripts/generate-goldens.mjs가 source/*.jsx를 vm에서 eval)
- i18n 비대칭: `tip_trough_peak` ko 전용 (en 577/ko 578) — 원본 그대로
- i18n 중복 키 dedup(last-wins): `simulator`, `scThesisPh`
- format 모듈은 모듈 상태(KEYSTONE_FX=1380, KEYSTONE_DISP) 보유 — 실앱에서 FX API로 교체 지점
- Supabase CLI = 루트 devDependency(`pnpm supabase ...`, v2.109) — 크로스머신 재현성. `pnpm-workspace.yaml`에 `onlyBuiltDependencies: [esbuild, supabase]`
- **PG17 hardened defaults**: RLS만으론 부족, anon/authenticated에 테이블 GRANT를 마이그레이션으로 명시해야 함 (`20260702000400_grants.sql`)
- 로컬 스택: API 54321 / DB 54322 / Studio 54323 / Mailpit 54324. 스키마 재적용 = `pnpm supabase db reset` (migrations + seed.sql)
- 소프트 인증 = `enable_confirmations=false` (가입 즉시 세션, email_verified는 profiles에서 추적) — config.toml 기본값 유지
- **뷰는 `security_invoker=true` 필수** (기본은 owner 권한 실행 → RLS 우회로 타 유저 데이터 유출) — `plan_positions`에 적용
- 상태 자동전이는 DB 트리거가 정본: `t_exec_activate`(매수→active), `t_exec_close`(전량매도→closing, 매도 전 보유>0 가드). 시나리오 status는 시세 필요 → 서버 워커 몫(마일스톤 6)
- DB 타입: `pnpm db:types` → `packages/core/src/types/database.ts` (스키마 변경 시 재생성)
- 재무 동기화: `pnpm --filter @keystone/server sync:financials` (`--market KR|US`, `--tickers`). 시크릿은 루트 `.env`(DART_API_KEY 등, .env.example 참고) — 클라이언트 노출 금지
- **DART corpCode.xml 함정**: `<list>` 블록 단위로 파싱해야 함 — lazy 정규식은 비상장사(빈 stock_code)의 corp_code를 다음 상장사와 잘못 짝지음
- EDGAR: fp=FY + 10-K/20-F + duration ≥330일 필터 필수 (10-K 안의 Q4 3개월치가 연간값 오염). ADR(TSM)은 ifrs-full 태그 폴백. 연도 라벨은 보고서 fy가 아니라 기간 종료일 기준
- 시세 동기화: `pnpm --filter @keystone/server sync:quotes` — KR=KIS, US=Finnhub → securities.last_close + 최신연도 dividend_yield
- **KIS 토큰은 발급이 분당 1회 제한** → .cache/kis-token.json 디스크 캐시 (24h 유효, 만료 1h 전 갱신). 실전/모의는 KIS_ENV=real|vts
- KIS REST는 연속 호출 시 간헐 500 → 어댑터가 400ms 백오프 재시도로 흡수
- 배당: KR = DART alotMatter 주당현금배당금(보통주) ÷ 현재가, US = Finnhub currentDividendYieldTTM. 무배당(삼바/AMD/TSLA)은 null이 정상
