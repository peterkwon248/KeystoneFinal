---
session_date: "2026-07-03 08:10"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work
- (전반부는 2026-07-02 아카이브 참고: 마일스톤 2·3·4 + FX)
- **마일스톤 5 완결** (759d7cf, 0038956): KIS/Finnhub 시세 폴링 14/14 → securities.last_close, dividend_yield(KR=DART alotMatter DPS÷현재가, US=Finnhub TTM). KIS 함정 흡수: 토큰 분당1회→디스크캐시, 간헐 500+EGW00201→백오프 재시도. **MVP 데이터 레이어(1~5) 완성**
- 참고 레포 4곳 조사 (공식 open-trading-api ⭐1.5k 등) → EGW00201 발견·반영, 마일스톤 6 WS 참고 목록 NEXT-ACTION에 기록
- **마일스톤 7 (웹 이식) 1·2단계** (4d0e851, 310275f):
  - apps/web Next.js 15 + @supabase/ssr + 프로토타입 CSS 통이식(colors_and_type/reticle)
  - Auth.jsx 이식: 로그인/가입(즉시 세션) + 온보딩 3단계 → profiles/portfolios/plans 저장 (브라우저 E2E: 가입→온보딩→PLN-001 삼성전자 생성→₩286,000 실시세 렌더)
  - 앱 셸: Sidebar(포트폴리오 CRUD + core 전략/관점 프리셋) + WorkspaceMenu/Settings(테마·언어 토글, 실제 로그아웃) + 라우트((shell) 그룹, /plans, /strategy/[id], placeholder들)
- LLM Wiki: nextjs-dev 토픽 추가 (총 3토픽)
- 전부 push됨 (origin/main = 310275f + 이 세션 커밋)

## In Progress
- 없음 (워킹트리 클린, typecheck 3/3 + next build + 골든 89/89 그린)

## Remaining Tasks
- [ ] **screens/ 6장 뷰 이식** ← 다음 작업. 권장 순서: 03 플랜 리스트(ListView 77줄 + BoardTimeline 297줄) → 04 플랜 상세(DetailView 3065줄, 최대 덩어리) → 01 인박스(488) → 02 일지(369) → 05 전략 편집기(422) → 06 청산 플로우
  - screens/*.png = 픽셀 기준, source/*.jsx = 로직 기준, 순수 계산은 @keystone/core import
- [ ] 사이드바 도구 섹션 (OPTIONAL_DESTS 7종 + CustomizeModal — profiles.sidebar 연동)
- [ ] GET /fx·/quote Route Handler + 클라이언트 setFxRate 연결
- [ ] (마일스톤 6, 나중) KIS/Finnhub WS 멀티플렉서 — 참고 레포 NEXT-ACTION에 정리됨

## Key Decisions
- 마일스톤 7을 6보다 선행 (소비할 앱 먼저, 실시간은 sync:quotes 폴링으로 버팀)
- 서버 런타임 = Next Route Handler로 시작 (별도 Node 서비스는 WS 필요 시)
- 전략/관점 데이터 = core 프리셋 (LIBRARY_LOCKED=true, DB 커스텀은 나중)
- 프로토타입 CSS 통복사 전략 — 클래스명 보존으로 픽셀 충실도 확보

## Blockers / Issues
- 없음. Next dev 함정 1건 해결됨: .next 캐시 오염 → 하이드레이션 무반응 → 캐시 삭제 (LLM Wiki nextjs-dev에 기록)

## Notes for Next Session
**⚠️ 크로스머신 인계 체크리스트 (git에 없는 것들):**
1. 루트 `.env` 복사 필수 — 키 5종: DART_API_KEY / FINNHUB_API_KEY / KIS_APP_KEY / KIS_APP_SECRET / KIS_ENV=real (.env.example 참고)
2. `apps/web/.env.local` 생성 — NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 + ANON_KEY(supabase start 출력, 로컬 공개 데모 키) (apps/web/.env.example 참고)
3. Docker Desktop 실행 확인

**재현 순서 (새 머신):**
```
git pull → pnpm install
pnpm supabase start → pnpm supabase db reset
pnpm --filter @keystone/server sync:financials → sync:quotes   # 실데이터
pnpm --filter @keystone/web dev                                 # localhost:3000
```
- 웹 테스트 계정은 머신-로컬 DB라 새로 가입해야 함 (가입→온보딩 30초)
- 프리뷰: .claude/launch.json에 "web"(:3000) 구성 있음
- dev 서버 이상(클릭 무반응) 시: apps/web/.next 삭제 후 재시작

## Files Modified
- `apps/server/src/adapters/` — kis.ts, finnhub.ts 신규 + dart.ts(alotMatter) + sync-quotes.ts
- `apps/web/` — 신설 전체 (app/, components/, lib/supabase/, styles/, middleware.ts)
- `packages/core` — 변경 없음 (golden 보호 유지)
- `docs/MEMORY.md, NEXT-ACTION.md, TODO.md` — 마일스톤 5 완료 + 7 진행 반영
