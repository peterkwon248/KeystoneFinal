---
session_date: "2026-07-03 (데스크톱)"
project: "KeystoneFinal"
working_directory: "C:/Users/user/Desktop/KeystoneFinal"
---

## Completed Work (이번 세션 — 데스크톱)
- **우측 디테일바(PropsSidebar)** (커밋 d6173de) — 04 상세 마지막 조각. `lib/closeout.ts`(core computeLedger 재사용). 커스텀필드 오이식→제거(vestigial 교훈).
- **새 디자인 핸드오프 도입** (커밋 6e3ea0b) — **참조만 교체**(유저 결정): 번들 + screens/(6→22) + 스펙 5종. root source/·core·골든 불변.
- **01 인박스** (커밋 5157df8) — 3-pane 트리아지, `addExecutionAction`(체결 DB왕복), 스누즈 제거. 버킷팅 수정.
- **after-work 문서** (커밋 4f27257).
- **02 일지** (커밋 feat 02 일지) — `components/journal/*`·`lib/journal.ts`. 플랜 노트 피드 + since 트랙. patchNotes 재사용.
- **05 전략편집기** (커밋 feat 05) — 읽기전용 4탭, 관점(등급룰)·전략(WHEN→THEN), core 프리셋. mutation 0.
- **이 after-work 문서** (커밋 예정).
- **→ 원본 6개 스크린(01~06) 전부 완료.**

## In Progress
- 없음 (워킹트리 클린 예정).

## Remaining Tasks
- [ ] **🎯 07 대시보드(현황)** ← 다음. 플랜 4번째 표시모드(현재 `plans-screen.tsx` placeholder). 원본 = `design_handoff_keystone/source/Dashboard.jsx` + screens/07. 헤드라인 스탯 + 포트폴리오 히트맵(트리맵) + 액션큐.
- [ ] 새 핸드오프 스크린: 10 시나리오모니터 · 11~13 스크리너 · 14 관심종목 · 15 리서치 · 16 인사이트 · 17 보관함 · 18 휴지통 · 19~22 종목상세.
- [ ] **묶음 후속**: 사이드바 인박스 unread 뱃지 + 트리아지 DB 동기화(정확한 unread는 트리아지가 DB로 가야 서버계산). openPlan 탭 딥링크. 종목 저널(일지 SECS)은 종목상세 이식 때.
- [ ] **🔴 source/core 재조정** (칩 task_8aa778fc): 새 핸드오프 순수로직을 core에 반영 + 골든 재생성. root source(구)↔screens(신) 불일치 해소.
- [ ] (마일스톤 6) 과거 시세 히스토리 백필 + 실시간 WS.

## Key Decisions
- 새 핸드오프: **참조만 교체, source/core 재조정 별도**(유저 확정).
- 우측바 기본 접힘 / 인박스 트리아지 localStorage / 일지 플랜노트-only / 전략편집기 읽기전용.

## Blockers / Issues
- **⚠️ PUSH 대기 (중요)**: 로컬 main이 origin보다 **6커밋 앞섬**. **자동승인이 main 직푸시 차단** → **유저가 이 폴더에서 `git push origin main` 수동 실행 필요.** 안 하면 다음 머신이 또 뒤처짐.

## Notes for Next Session
- **before-work는 반드시 `git fetch origin` 대조부터** (세션 시작 때 12커밋 뒤처진 로컬로 오판한 사고 재발 방지).
- 새 뷰 이식 = **`design_handoff_keystone/source/*.jsx`(신)** 기준. root `source/`는 구버전(재조정 전까지).
- **"핸들러 정의됨 ≠ 렌더됨"** — source return(JSX) grep 확인(커스텀필드 교훈).
- 함정: SWC≠tsc(JSX 내 제네릭 캐스트 금지)·supabase-js thenable(await)·Windows 파일워처 stale→서버 재시작·`.next` 오염 시 삭제(특히 executor `next build` 후 dev 재기동 전)·첫 컴파일 후 첫 클릭 /plans 튕김(재진입)·preview_screenshot 간헐 타임아웃(eval로 검증).
- 실행: `pnpm supabase start` → `node apps/web/scripts/dev-seed-plans.mjs`(11플랜) → preview "web"(:3000). 로그인 webtest@keystone.local / web-test-password-1.

## Files Modified (이번 세션 — 신규 위주)
- `apps/web/components/`: plan/props-sidebar · inbox/* · journal/* · strategy/*
- `apps/web/lib/`: closeout · inbox · inbox-triage · journal · strategy-editor-ref (신규)
- `apps/web/app/(shell)/`: inbox/ · journal/ · strategy/[id]/ · [dest]/ · plans/[id]/actions.ts(addExecutionAction)
- `design_handoff_keystone/`(번들 교체) · `screens/`(6→22) · root 스펙 5종 · `docs/*`
