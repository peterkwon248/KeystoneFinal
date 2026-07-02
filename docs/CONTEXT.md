# CONTEXT.md — 현재 상태 스냅샷

## Completed Features (최근)
1. KeystoneFinal 독립 레포 + 초기 커밋 (2026-07-02)
2. 모노레포 스캐폴드: pnpm workspace + Turborepo (2026-07-02)
3. `@keystone/core` 9개 모듈 (valuation/simulate/screener/analytics/format/i18n/reference/seed/types) (2026-07-02)
4. 골든 동치 테스트 인프라: generate-goldens.mjs + vitest 89테스트 (2026-07-02)

## 설계 결정
- **골든 동치 전략**: 원본 .jsx를 Node vm에서 eval → 기대값 dump → TS 포팅본과 정확 일치 검증. 포팅 드리프트가 기계적으로 잡힘.
- **core는 소스 배포** (`exports`가 src/*.ts 직접 지정) — Next/Expo가 트랜스파일. 빌드 파이프라인은 필요해질 때.
- **로컬-퍼스트 Supabase**: Docker 로컬 스택에서 스키마/RLS/Auth 완성 후 클라우드 연결.
- 목업 데이터(PLANS/SECURITIES/GAP_NOTES)는 core에 넣지 않음 — 프로토타입 스캐폴딩. 골든 테스트가 fixture로만 사용.

## 디렉터리
```
Keystone Final/
├─ ARCHITECTURE.md / DATA_MODEL.md / API.md / HANDOFF.md   ← 스펙
├─ screens/          ← 디자인 구현 기준 (6장)
├─ source/           ← 프로토타입 (읽기 전용 참조 + 골든 원본)
├─ packages/core/    ← 순수 로직 (골든 테스트로 보호)
├─ docs/             ← 크로스머신 멘탈 상태 (이 파일들)
└─ (예정) supabase/ apps/web apps/mobile apps/server
```

## TODO (MEMORY.md 기준)
- 마일스톤 2: supabase init/start, DDL 마이그레이션, RLS, 이메일 Auth, 온보딩→portfolios
- 이후: 플랜 DB화 → 재무 어댑터 → 시세 폴링 (= MVP)
