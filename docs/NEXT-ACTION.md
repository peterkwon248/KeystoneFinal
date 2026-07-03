# NEXT-ACTION

## 다음 세션 즉시 액션 — 마일스톤 7 계속 (웹 이식, 6보다 선행 확정 2026-07-03)
완료: apps/web + Auth/온보딩 + 앱 셸 + **03 플랜 리스트(ListView/BoardView/TimelineView/DisplayPanel)** + **사이드바 도구 섹션/CustomizeModal(profiles.sidebar 연동)** — 전부 브라우저 E2E 검증. 다음:
1. **04 플랜 상세(DetailView 3065줄, 최대 덩어리)** ← 다음 작업. 이후 01 인박스 → 02 일지 → 05 전략 편집기 → 06 청산
   - 순수 로직은 @keystone/core에서 import, 데이터는 supabase 쿼리 (ARCHITECTURE §7 이음새 맵)
   - screens/*.png이 픽셀 기준 · source/*.jsx가 로직 기준
   - 리스트 이식에서 만든 재사용 이음새: `lib/plan-mapper.ts`(DB row→프로토타입 Plan, PLAN_SELECT), `lib/trajectory.ts`(mock 궤적), `components/plan/scenario-gauge.tsx`·`sparkline.tsx`, `components/icons.tsx`(StatusIcon/StrategyBadge)
2. 상단 필터 패널(FilterPanel) — 지금은 DisplayPanel만 있음
3. GET /fx·/quote Route Handler + 클라이언트 setFxRate 연결
- ⚠️ dev 서버 캐시 꼬이면(하이드레이션 안 됨/청크 404): `.next` 삭제 후 재시작. **`next build`는 dev 서버 끄고 `.next` 삭제 후** 실행 (동시 접근 시 PageNotFoundError)
- ⚠️ **supabase-js 쿼리 빌더는 thenable** — `void supabase.from().update()`는 요청이 안 나감. 반드시 `await` 또는 `.then()`으로 실행 (profiles.sidebar 영속 버그였음)
- ⚠️ **lucide-react 아이콘 개명** — 프로토타입/core의 옛 kebab 이름이 npm 버전에 없을 수 있음(Filter→Funnel, PieChart→ChartPie). `Lic`가 alias 맵으로 흡수하고 미지 아이콘은 dev 콘솔 경고. 새 뷰 이식 때 `[Lic] 알 수 없는 아이콘` 경고 나오면 `components/icons.tsx` LUCIDE_ALIASES에 추가
- 로컬 플랜 시드: `node apps/web/scripts/dev-seed-plans.mjs` (webtest 유저 + 프로토타입 11 플랜)

## 실행 명령 (이 머신)
```
pnpm supabase start
pnpm --filter @keystone/web dev   # localhost:3000 (또는 Claude preview "web")
```
로그인 테스트 계정: webtest@keystone.local / web-test-password-1 (dev-seed-plans.mjs가 생성 — 11 플랜 포함)

## 마일스톤 6 (실시간 WS) 참고 오픈소스 — 2026-07-03 조사
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
- [x] 마일스톤 5: 시세 폴링 (2026-07-02 — KIS/Finnhub 14/14 + dividend_yield + FX) ← **MVP 데이터 레이어 완료**
- [ ] 마일스톤 6~9: 실시간 WS / 웹 이식 / 모바일 / 구독

## 보류 중
- 클라우드 Supabase 프로젝트 생성 (로컬 완성 후)
- 소셜 OAuth 4종 (구글/애플/카카오/네이버) — 클라우드 연결 시
- ~~KIS/키움 계좌 발급~~ → 발급 완료 (2026-07-02, .env에 KIS_APP_KEY/SECRET + FINNHUB_API_KEY)

## 머신
- 집 (Windows, `C:\Users\kwonkyunghun\Desktop\Keystone Final`)
- 데스크톱 (Windows, `C:\Users\user\Desktop\KeystoneFinal`) — 마일스톤 2 진행 머신

## 마지막 갱신
2026-07-03 (집)
