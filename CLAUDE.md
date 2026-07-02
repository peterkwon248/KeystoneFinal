# Keystone — 프로젝트 지침

투자 플랜 관리 SaaS. 프로토타입(`source/`) → 멀티유저 SaaS(웹+모바일) 전환 중.

## 세션 시작
`docs/NEXT-ACTION.md` 먼저 읽기 (크로스머신 멘탈 상태). 스펙은 `ARCHITECTURE.md` → `DATA_MODEL.md` → `API.md`.

## 불변 규칙
- **`screens/` 스크린샷 6장이 디자인 구현 기준** — 웹 이식 시 그대로 재현
- **`packages/core`는 골든 동치 테스트로 보호** — `source/*.jsx`의 순수 로직과 정확 일치해야 함. 테스트: `pnpm --filter @keystone/core test` · 골든 재생성: `pnpm --filter @keystone/core goldens`
- `source/`는 읽기 전용 참조 (골든의 원본) — 수정 금지
- i18n: 신규 문자열은 반드시 en/ko 양쪽 (`I18N`)
- 금액은 플랜 네이티브 통화로 저장, 표시통화 환산은 포맷 시 (`format` 모듈)
- API 키는 서버 전용 — 클라이언트에 절대 두지 않음

## 스택
pnpm workspace + Turborepo. `packages/core`(순수 TS, 소스 배포) + (예정) `apps/web`(Next.js) / `apps/mobile`(Expo) / `apps/server`(어댑터) / `supabase/`(로컬 우선, 클라우드는 나중).

## Git
이 폴더는 홈디렉터리 Plot-V3 레포 안의 **중첩 독립 레포** (origin = `peterkwon248/KeystoneFinal`). git 작업은 반드시 이 폴더 안에서. 커밋 메시지 한국어 + Co-Authored-By.
