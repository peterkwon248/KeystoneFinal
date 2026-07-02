# NEXT-ACTION

## 다음 세션 즉시 액션
1. **마일스톤 4 착수 — 재무 어댑터 (DART/EDGAR)**
   - `apps/server/adapters/` 스캐폴딩: dart.ts, edgar.ts (`ARCHITECTURE.md` §3·§6)
   - provider payload → `security_financials` 정규화 (normalize/ — K-IFRS/US-GAAP → 공통 컬럼)
   - DART API 키 발급 필요 (opendart.fss.or.kr — 무료), EDGAR는 키 없음(UA 헤더만)
2. FIN_SEED(source/data.jsx) → security_financials 시드 부트스트랩 (`source='seed'`, 실데이터가 덮어씀)

## 첫 스텝 (구체적)
```
pnpm supabase start    # 로컬 스택 기동 (이미 init 완료)
pnpm supabase db reset # 마이그레이션 6개 + seed 재적용
```
서버 런타임(Node/Hono 등) 선택부터 — `ARCHITECTURE.md` §2·§6 참조.

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
- [ ] 마일스톤 4: 재무 어댑터 (DART/EDGAR) ← **여기부터**
- [ ] 마일스톤 5: 시세 폴링 (KIS/Finnhub REST + FX)
- [ ] 마일스톤 6~9: 실시간 WS / 웹 이식 / 모바일 / 구독

## 보류 중
- 클라우드 Supabase 프로젝트 생성 (로컬 완성 후)
- 소셜 OAuth 4종 (구글/애플/카카오/네이버) — 클라우드 연결 시
- KIS/키움 계좌 발급 (마일스톤 5 직전에)

## 머신
- 집 (Windows, `C:\Users\kwonkyunghun\Desktop\Keystone Final`)
- 데스크톱 (Windows, `C:\Users\user\Desktop\KeystoneFinal`) — 마일스톤 2 진행 머신

## 마지막 갱신
2026-07-02
