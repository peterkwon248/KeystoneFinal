# TODO.md

## P0 — 마일스톤 2: Supabase 스키마 + Auth (로컬)
- [ ] Docker Desktop 확인 + `supabase init` + `supabase start`
- [ ] `DATA_MODEL.md` DDL → `supabase/migrations/` (enum, 테이블 전체)
- [ ] RLS 정책 (`user_id = auth.uid()`) 전 사용자 테이블
- [ ] 이메일 가입 → 인증메일 → 소프트 인증 흐름 (Auth.jsx 로직 매핑)
- [ ] 온보딩 → portfolios 첫 레코드 저장
- [ ] 참조 데이터 seed (strategies/exec_strategies/exec_categories)

## P1 — 마일스톤 3: 플랜 데이터 DB화
- [ ] plans/scenarios/executions/rules CRUD
- [ ] 체결 롤업 (평단/투입/손익 파생 — 저장 안 함)
- [ ] 상태 자동전이 트리거/RPC (App.jsx 로직 이관)
- [ ] saved_views / watchlist / journal_entries

## P2 — 마일스톤 4·5: 실데이터
- [ ] DART 어댑터 → security_financials (K-IFRS)
- [ ] EDGAR 어댑터 → security_financials (US-GAAP)
- [ ] KIS/Finnhub REST 스냅샷 폴링
- [ ] FX: KEYSTONE_FX → Frankfurter

## P3 — 마일스톤 6~9
- [ ] WS 멀티플렉서 + Realtime 팬아웃
- [ ] Next.js 웹 이식 (screens/ 디자인 그대로)
- [ ] Expo 모바일
- [ ] Stripe/RevenueCat 구독

## 완료
- [x] KeystoneFinal 레포 생성 + 초기 커밋 (2026-07-02)
- [x] 마일스톤 1: 모노레포 + packages/core + 골든 89/89 (2026-07-02)
