# CONTEXT.md — 현재 상태 스냅샷

## Completed Features (최근)
1. **마일스톤 1~5 완료 = MVP 데이터 레이어 완성** (2026-07-02)
   - 모노레포(pnpm+Turborepo) + `@keystone/core` 9개 모듈 + 골든 동치 테스트 89/89
   - Supabase 로컬 스키마(마이그레이션 6개) + RLS/GRANT + 이메일 Auth + seed
   - 플랜 DB화: plan_positions 뷰(security_invoker) + 상태 전이 트리거 2종 + DB 타입 생성
   - 재무 어댑터(DART/EDGAR 14종 × 5년) + 시세 폴링(KIS/Finnhub 14/14 + dividend_yield + FX)
2. **마일스톤 7 (웹 이식) 진행 중** (2026-07-03)
   - apps/web: Next.js 15 App Router + @supabase/ssr + 프로토타입 CSS 통이식(colors_and_type/reticle)
   - Auth.jsx 이식(로그인/가입/온보딩 3단계 → profiles/portfolios/plans) — 브라우저 E2E 검증
   - 앱 셸: Sidebar + WorkspaceMenu/Settings + 라우트((shell) 그룹) + 테마/언어 토글
   - 03 플랜 리스트(ListView/BoardView/TimelineView/DisplayPanel) + 사이드바 도구 섹션/CustomizeModal(profiles.sidebar DB 연동) — 브라우저 E2E 검증
   - **04 플랜 상세 8탭 중 7개** (2026-07-03): 셸 + 시나리오(GapTab 차트) + 활동 + 체결(장부·성과밴드) + 재무제표(IS/BS/CF 실연결) + **전략**(콕핏 6종 오버레이·룰카드·룰토글/목표 뮤테이션) + **투자지표**(5뷰모드·프레임워크 렌즈) + **밸류에이션**(적정가 계산기·민감도·역산·밴드차트2종·적용→시나리오 뮤테이션) — 전부 브라우저 E2E(KRW+USD). core 승격 골든 92→**102**(evalRule·ruleWarn + 룰 카탈로그). 남은 것 = 인사이트 탭 + 우측 디테일바
   - **⚠️ SWC ≠ tsc 발견**: JSX 안 제네릭 캐스트를 SWC가 파싱 못함(tsc는 통과) → JSX 밖 statement로 hoist. 브라우저 SWC 컴파일 확인 필수

## 설계 결정
- **골든 동치 전략**: 원본 .jsx를 Node vm에서 eval → 기대값 dump → TS 포팅본과 정확 일치 검증.
- **core는 소스 배포** (`exports`가 src/*.ts 직접 지정) — Next/Expo가 트랜스파일.
- **로컬-퍼스트 Supabase**: Docker 로컬 스택에서 완성 후 클라우드 연결.
- **마일스톤 7을 6보다 선행** (2026-07-03): 소비할 앱 먼저, 실시간은 sync:quotes 폴링으로 버팀.
- 서버 런타임 = Next Route Handler로 시작 (별도 Node 서비스는 WS 필요 시).
- 전략/관점 = core 프리셋(LIBRARY_LOCKED=true), DB 커스텀은 나중.
- 프로토타입 CSS 통복사 — 클래스명 보존으로 픽셀 충실도 확보.

## 디렉터리
```
Keystone Final/
├─ ARCHITECTURE.md / DATA_MODEL.md / API.md / HANDOFF.md   ← 스펙
├─ screens/          ← 디자인 구현 기준 (6장)
├─ source/           ← 프로토타입 (읽기 전용 참조 + 골든 원본)
├─ packages/core/    ← 순수 로직 (골든 102 테스트로 보호)
├─ supabase/         ← 로컬 스택 (마이그레이션 6개 + seed)
├─ apps/server/      ← 어댑터 (DART/EDGAR/KIS/Finnhub/FX)
├─ apps/web/         ← Next.js 15 (Auth+온보딩+앱 셸 완료, 뷰 이식 중)
└─ docs/             ← 크로스머신 멘탈 상태 (이 파일들)
```

## TODO (MEMORY.md 기준)
- 마일스톤 7 계속: **04 상세 우측 디테일바(PropsSidebar)** → 01 인박스 / 02 일지 / 05 전략 편집기 / 06 청산 (04 상세 8탭 전부 완료)
- 상단 필터 패널(FilterPanel) / GET /fx·/quote Route Handler + setFxRate
- 이후: 마일스톤 6 (실시간 WS **+ 과거 시세 히스토리 백필** — 차트 실데이터 전제) → 8 (Expo) → 9 (구독)
- ⚠️ **실데이터 전환 필수**(NEXT-ACTION §실데이터): 히스토리 백필(옵션 아님) + 날짜 앵커(2026-06 하드코딩) 교체 + 재무 sync
