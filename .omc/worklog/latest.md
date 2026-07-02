---
session_date: "2026-07-02 22:00"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work
- 데스크톱 머신 셋업: 레포 클론(.claude만 있던 폴더라 git init+fetch), pnpm install, Supabase CLI 루트 devDep 설치 (v2.109)
- **마일스톤 2** (커밋 07bb63e): Supabase 로컬 스키마 — 마이그레이션 4개 (enum 9종 / 테이블 14개 / RLS / GRANT) + 참조 시드 (strategies 8, exec_strategies 7, exec_categories 3). REST E2E 검증 (익명 읽기/쓰기 차단, 가입 즉시 세션, 유저 격리)
- **마일스톤 3** (커밋 f940fa4): plan_positions 롤업 뷰(security_invoker) + 상태전이 트리거 2종 (매수→active, 전량매도→closing) + securities 14종 시드 + DB 타입 생성 (pnpm db:types). E2E: 전이·롤업·격리 전부 통과
- **마일스톤 4** (커밋 bf9b72d, b9d3a42): apps/server 신설 — DART/EDGAR 어댑터 + normalize + sync CLI. 14/14 종목 × 5개년 동기화, 실측 교차검증 (삼성 300.9조, AAPL $391B). FIN_SEED 부트스트랩 70행. 참고 레포(OpenDartReader 등) 리뷰 반영 (corp_code 캐시 24h TTL)
- **마일스톤 5 일부** (커밋 b04e728): FX 어댑터 (Frankfurter → er-api 폴백). USD/KRW 1558.09 검증, TWD 404 폴백 실전 확인
- LLM Wiki 첫 컴파일: supabase-local-dev, financial-data-apis 토픽 2건 ingest
- 전부 push됨 (origin/main = b04e728)

## In Progress
- 없음 (워킹트리 클린, 빌드 그린 — typecheck 2/2, 골든 89/89)

## Remaining Tasks
- [ ] 마일스톤 5 잔여: Finnhub(US) 시세 폴링 — **finnhub.io 무료 키 발급 필요** → .env FINNHUB_API_KEY
- [ ] 마일스톤 5 잔여: KIS(KR) 시세 폴링 — **KIS 계좌 + appkey/appsecret 발급 필요** (모의투자 가능)
- [ ] dividend_yield 채우기: KR = DART alotMatter DPS ÷ 주가, US = EDGAR 배당 태그 or Finnhub
- [ ] GET /fx·/quote 엔드포인트 — 서버 런타임 결정 (Supabase Edge Function vs 소형 Node)
- [ ] 시세 캐시 전략 (apps/server/cache — rate-limit 흡수)

## Key Decisions
- Supabase CLI = 루트 devDependency (크로스머신 재현) + onlyBuiltDependencies: [esbuild, supabase]
- 소프트 인증 = enable_confirmations=false 기본값 유지 (가입 즉시 세션, email_verified는 profiles에서 추적)
- FIN_SEED 시드 유지 (source='seed') — 키 없는 머신 베이스라인, 어댑터가 덮어씀
- DART 부가 API (공시검색/임원보수 등)는 스코프 밖 — 쓸 화면 없음, 필요 시 어댑터 패턴으로 저비용 추가
- dart-fss(원문 파싱) 대신 fnlttSinglAcntAll(정규화 JSON) 직접 호출 — 표준 지표만 필요하면 이쪽이 견고

## Blockers / Issues
- 시세 폴링은 키 발급 대기 (Finnhub 무료 키, KIS 계좌). 나머지 블로커 없음
- 참고: 실환율 1558 vs 프로토타입 상수 1380 — 앱 연결 시 KR↔US 환산 표시 ~13% 변동 예상

## Notes for Next Session
- 집 머신 이어받기: git pull → pnpm install → .env 복사(DART_API_KEY — .env.example 참고) → pnpm supabase start → pnpm supabase db reset → pnpm --filter @keystone/server sync:financials
- 프로토타입 미리보기: localhost:4173/Keystone.html (루트는 디렉토리 인덱스만 뜸)
- apps/web(Next.js)은 마일스톤 7 — 아직 없음
- 기술 함정 상세는 docs/MEMORY.md + LLM Wiki (supabase-local-dev, financial-data-apis)

## Files Modified
- `supabase/migrations/` — 6개 (enum/테이블/RLS/GRANT/롤업뷰/전이트리거)
- `supabase/seed.sql` — 참조 데이터 + securities 14종 + FIN_SEED 70행
- `apps/server/` — 신설 (adapters/dart.ts, edgar.ts, fx.ts, normalize/, sync-financials.ts, check-fx.ts)
- `packages/core/src/types/database.ts` — 생성 (+index.ts 재노출)
- `docs/MEMORY.md, NEXT-ACTION.md, TODO.md` — 마일스톤 2~5 진행 반영
- `.env.example, .gitignore, package.json, pnpm-workspace.yaml` — 설정
