# SESSION-LOG (append-only, 최신이 위)

## 2026-07-02 오후 (집)

### 완료
- **KeystoneFinal 독립 레포 생성** (public, peterkwon248/KeystoneFinal) — 홈디렉터리 전체가 Plot-V3 레포라서 PR이 엉뚱한 곳으로 가는 함정 발견 → 중첩 독립 레포로 해결
- 프로토타입 + 스펙 문서 초기 커밋 (89파일)
- **마일스톤 1 완료**: pnpm+Turborepo 모노레포 + `packages/core` 순수 로직 추출
  - valuation / simulate / screener / analytics / format / i18n / reference / seed / types
  - 골든 동치 검증: 원본 .jsx를 Node vm에서 eval → goldens.json → vitest **89/89 통과**
  - tsc strict 클린, export 표면 68개 스모크 검증
  - 커밋 e1e8967 (main 직푸시)

### 브레인스토밍 & 큰 결정
- **Supabase는 로컬 `supabase start`(Docker) 기반으로 먼저 완성, 클라우드 연결은 나중** — 무료·빠른 반복을 위해
- 골든 테스트 전략 채택: "포팅 동치"를 사람 눈이 아니라 기계로 증명 (플랜 11 × 시뮬 21조합 × 재무 14종목)
- i18n 원본 비대칭 발견: `tip_trough_peak`은 ko에만 존재 (en 577 / ko 578 키) — 의도적으로 보존
- 포팅은 executor 에이전트 2개 병렬 위임, 검증은 메인이 직접

### 다음
- 마일스톤 2: supabase init/start → DATA_MODEL.md DDL 마이그레이션 + RLS + 이메일 Auth (NEXT-ACTION.md 참조)

### Watch Out
- 이 폴더는 Plot-V3 레포 안의 중첩 독립 레포 — git 명령은 반드시 이 폴더 안에서
- packages/core 수정 시 골든 테스트 깨지면 "포팅 드리프트"라는 뜻 — 원본 의미 변경은 마일스톤 7 이후에만
- `KS_REF`(앱 기준일 2026-06-26)는 목업 날짜 앵커 — 실앱 전환 시 실제 오늘로 교체 필요

### 머신
집
