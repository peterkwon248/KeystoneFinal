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
| 2 | Supabase 스키마 + Auth | ⬅ 다음 |
| 3 | 플랜 데이터 DB화 | |
| 4 | 재무 어댑터 (DART/EDGAR) | |
| 5 | 시세 폴링 + FX | ← MVP 커트라인 |
| 6~9 | 실시간 WS / 웹 / 모바일 / 구독 | |

## 커밋/PR 히스토리
- `685525a` 초기 커밋: 프로토타입 + 스펙 + 스크린샷 (2026-07-02)
- `e1e8967` 마일스톤 1: 모노레포 + packages/core + 골든 테스트 (2026-07-02, main 직푸시)

## 핵심 기술 사실
- `packages/core` 골든 테스트: `pnpm --filter @keystone/core test` / 골든 재생성: `... goldens` (scripts/generate-goldens.mjs가 source/*.jsx를 vm에서 eval)
- i18n 비대칭: `tip_trough_peak` ko 전용 (en 577/ko 578) — 원본 그대로
- i18n 중복 키 dedup(last-wins): `simulator`, `scThesisPh`
- format 모듈은 모듈 상태(KEYSTONE_FX=1380, KEYSTONE_DISP) 보유 — 실앱에서 FX API로 교체 지점
