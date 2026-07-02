# NEXT-ACTION

## 다음 세션 즉시 액션
1. **마일스톤 2 착수 — Supabase 로컬 기반 스키마 + Auth**
   - `supabase init` + `supabase start` (Docker 필요 — 데스크톱에서 Docker Desktop 실행 확인)
   - `DATA_MODEL.md`의 DDL → `supabase/migrations/`로 이관 (enum + 테이블 + RLS 정책)
2. Auth: 로컬에서는 **이메일 가입 흐름 먼저** (소셜 OAuth 4종은 클라우드 연결 시)
3. 온보딩 → 첫 레코드(portfolios) 저장 경로 설계 (`Auth.jsx`의 `OB_KEY` localStorage 스텁 대체)

## 첫 스텝 (구체적)
```
cd "Desktop\Keystone Final"
supabase init          # supabase/ 디렉터리 생성
supabase start         # 로컬 Postgres+Auth+Studio 기동
```
그다음 `DATA_MODEL.md`를 읽고 마이그레이션 파일 작성. `ARCHITECTURE.md` §4·§13 참조.

## 잊지 말 것 (핵심 결정)
- **로컬 `supabase start` 기반으로 먼저 완성 → 클라우드 프로젝트 연결은 나중** (2026-07-02 확정)
- **`screens/` 스크린샷 6장이 디자인 구현 기준** — 웹 이식(마일스톤 7) 때 그대로 재현
- **packages/core는 골든 동치 테스트 89개로 보호됨** — 순수 로직 수정 금지, 원본과 달라지면 테스트가 잡음. 골든 재생성: `pnpm --filter @keystone/core goldens`
- 이 폴더는 홈디렉터리 Plot-V3 레포 안의 **중첩 독립 레포** (origin = peterkwon248/KeystoneFinal). PR/커밋은 반드시 이 안에서.
- MVP 커트라인 = 마일스톤 1~5 (ARCHITECTURE.md §13)

## Phase 진행 상황
- [x] 마일스톤 1: 모노레포 + packages/core 추출 (골든 89 테스트, 커밋 e1e8967)
- [ ] 마일스톤 2: Supabase 스키마 + Auth ← **여기부터**
- [ ] 마일스톤 3: 플랜 데이터 DB화 (CRUD + 체결 롤업 + 상태 자동전이)
- [ ] 마일스톤 4: 재무 어댑터 (DART/EDGAR)
- [ ] 마일스톤 5: 시세 폴링 (KIS/Finnhub REST + FX)
- [ ] 마일스톤 6~9: 실시간 WS / 웹 이식 / 모바일 / 구독

## 보류 중
- 클라우드 Supabase 프로젝트 생성 (로컬 완성 후)
- 소셜 OAuth 4종 (구글/애플/카카오/네이버) — 클라우드 연결 시
- KIS/키움 계좌 발급 (마일스톤 5 직전에)

## 머신
집 (Windows, `C:\Users\kwonkyunghun\Desktop\Keystone Final`)

## 마지막 갱신
2026-07-02
