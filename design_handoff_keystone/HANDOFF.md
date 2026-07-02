# Keystone (AlphaBeyond) — 작업 인계 문서

> 새 채팅에서 이 파일을 먼저 읽고 이어가면 됨. 메인 산출물: **`app/Keystone.html`** (모든 .jsx/.css를 `?v=NNN` 캐시버스터로 로드하는 단일 진입점).
> 최종 갱신: **실앱 전환 준비 라운드(m0295~m0357).** 엔지니어링 핸드오프 문서 3종(`ARCHITECTURE.md`·`DATA_MODEL.md`·`API.md`) 작성 + 아래 기능 라운드. **다음 단계 = Claude Code로 실제 빌드** → 그 3종 문서가 진입점.

## ✅ 최근 완료 (실앱 전환 준비 세션, m0295~m0357)
- **엔지니어링 핸드오프 3종 신설**: `app/ARCHITECTURE.md`(스택·이음새·빌드순서), `app/DATA_MODEL.md`(Postgres DDL+RLS), `app/API.md`(엔드포인트·실시간·어댑터). 결정 확정: **Supabase + Next.js + Expo(RN) 모노레포, core 패키지 분리, 멀티유저 SaaS, 무료 provider(KIS·DART·Finnhub·EDGAR·Frankfurter) 1순위/유료 2순위, 실시간=서버 팬아웃, 추후 월구독**.
- **종목 리서치 통합**(`P4Views.jsx ResearchBrowser`): 재무제표·시뮬레이터 독립 도구 은퇴 → 종목 상세 탭들이 기능 100% 보유. `SecurityPicker`+`getSecRecents`+`.sec-planrow` 재사용. 사이드바 키 `v1→v2` 마이그레이션. 라우팅·커맨드팔레트·탭바·워크스페이스 메뉴 `research`로 일원화.
- **요약 스탯 스트립**(관심종목·시나리오): 플랜 현황의 `DashStat` 재사용(신규 CSS 0). 관심종목=종목·상승·하락·평균등락·한국/미국(전 스탯 드릴다운 호버툴팁), 시나리오=추적·근접·돌파·이탈·평균괴리(상태별 시나리오 목록 툴팁). 스크리너는 기존 통과/관찰/탈락 칩 유지.
- **관심종목 섹터 필터 = 스크리너와 통일**: `GICS_SECTORS` 전체 11개 소스 + 카운트 배지 + 0개 흐림(FilterPanel opt-in `n`/`flt-zero`) + 검색. 섹터 **그룹핑** 버그도 `(s.gics||s.sector)`로 정합.
- **인사이트**: 관점 성과 부제 겸손화("이 관점으로 세운 플랜들의 성과 · 표본 N") + **산점도 드릴다운 툴팁**(점 hover→구성 플랜 목록, gap-tip 재사용). 겹침 방지(2D relaxation). 나머지 3섹션은 숫자 이미 노출이라 스킵.
- **스크리너 사분면**: 리치 호버툴팁(국기+종목명 헤더·등급·품질·적정가대비, gap-tip 재사용, 가장자리 자동 플립) + 겹침 방지 + 푸터 문장 줄바꿈. "적정가 대비" 용어 확정(현재가 아님).
- **용어/정합**: `Bull/Base/Bear` 한글 부제 → `상단/중간/하단`. 갭 차트 툴팁 이중선 제거·현재가 중앙정렬. 일지·인박스 리더 중앙정렬(사이드바 접힘 시 우측 여백). 전략 미리보기 "적용 대상" 펼침 리스트(40 cap+더보기). 종목 상세 시나리오 행 클릭→플랜 시나리오 탭.

---

## ✅ 이전 세션 — 밸류에이션 차트 · 계절성 히트맵 · 크로스뷰 필터

**1) 밸류에이션 적정가 밴드 차트** (`DetailView.jsx` `ValFairBandChart` + `valuation_view.jsx`에서 마운트). PER·PBR·PSR·EV 각 방법이 매기는 적정가를 연도별로 겹쳐 **방법 간 최저~최고=밴드 · 평균=파란선 · 시장가=흰선**. 대표배수는 각 방법의 **과거 멀티플 중앙값**(현재배수 고정 시 '지금'에서 밴드가 한 점으로 닫혀서 ②로). GapTab 트랙 차트의 splineXY·`gap-tip`·`gap-legend`·`gap-verdict` 재사용. **표시 팝오버**(sliders 아이콘): 밴드/평균/시장가 + PER/PBR/PSR/EV 개별 토글 → 켜면 밴드 안에 방법선(툴팁 점과 동일 색). prefs=`keystone-valband-prefs`. 방법선 스타일(실선/점선/굵게)은 목표선 세그먼트 재사용.

**2) 월별 지표 히트맵** (`SecurityView.jsx` `SeasonalityHeatmap`, 종목 개요 상단). **연도(행)×월(열)**, 지표 피커로 두 모드: **흐름·계절성**(수익률·상대강도·변동성 — 세로 밴드 구조 + 평균·중앙 집계행) / **밸류에이션·이력**(PER·PBR·PSR — 자기 과거 백분위로 저렴/비쌈 채색 + 현재값·5년범위 푸터). 색=ValSensitivity `tone()` 램프(옅은 채도, Vector 톤). 티커 시드 deterministic. 월 헤더 호버 툴팁(평균/중앙/상승연수/최고·최저). 범례 스와치는 표면색과 혼합해 불투명 칩. 기본 지표=수익률.

**3) 크로스뷰 필터 (리니어 원칙 = 리스트는 필터 가능).** 공유 `FilterPanel`(`Panels.jsx`)에 **`cats` prop** 추가 → plan-shaped 고정 대신 임의 축 주입 가능(축 아이콘은 `cat.axis` fallback). App.jsx: 필터 버튼 가드 + 공유 패널 가드에 scenarios/watchlist/archive 추가, 각 뷰에 `panel/setPanel/filterAnchor` 전달(스크리너 패턴 그대로).
  - **시나리오 모니터**(`P4Views.jsx ScenariosMonitor`): 필터 축 = 종목·케이스(Bull/Base/Bear)·시나리오상태·출처(플랜/애드혹) + 표시=그룹(상태/종목/케이스/없음). 칩바+초기화. 핵심 유스케이스(현대차 시나리오만) 해결. 상태=컴포넌트 로컬(휘발), 그룹=`keystone-scen-group`.
  - **관심종목**(`WatchlistView`): 필터=시장·섹터(finer sector.en)·플랜유무·등락 + 표시=정렬(기본/등락률/이름)·그룹(없음/시장/섹터). 가격정렬은 원·달러 혼재로 제외. prefs=`keystone-watch-view`.
  - **보관함**(`ArchiveView`): 검색창(이름·티커·id) + 공유 `matchesFilters`/`filterCats` 재사용(포트폴리오·전략·수익손실) + 정렬(최근/수익률/이름). plan-shaped라 재사용 최대.
  - **휴지통**: 필터 미적용(자동소멸성 — 의도적 제외).

**4) API 연동** (디자인 범위 밖) — 실시간 가격·재무. 지금 전부 더미(시드).

---

## ✅ 완료 — 시나리오 탭 기간 고/저 기준선 (m2020)

**유저 task 1 (A+C+E 차트).** 조사 결과 A(가격차트)·C(상/중/하단 목표 계단선+가격선+펀더멘털밴드+매수마커)는 **이미 GapTab '추적'(track) 뷰에 존재**. 범위바(`.sc-range`)도 렌더됨. 유저가 명시한 빠진 것 = **E(52주/기간 고·저)**.
- 추가: GapTab track 차트 SVG(`mode==='gap'`)에 `pxPts`의 max/min으로 점선 고/저 기준선 2개 + 우측 라벨(`기간 고/저`, range 6m/1y/all 따라 라벨). y-labels 다음·band 앞에 삽입(뒤쪽 레이어). 검증: "전체 고 ₩82,430 / 전체 저 ₩62,770" + dashed line 2개. 콘솔 0.
- ⏳ 미착수(유저 합의): 설정 초기화 버튼, 온보딩 플랜 사이클 워크스루.

## ✅ 완료 — 스크리너 미세조정: 등급위치·스파크·시총통화 (m2010)
- **등급핍 위치**: 평가블록(`.scv-frow-eval`) 안에서 지표 뒤→**맨 앞(PER 왼쪽)**으로 이동. `{lensOn && pips}` 를 `{evalKeys.map}` 앞에.
- **스파크 항상**: `{evalKeys.length===0 && spark}`(브라우즈 전용) → `<ScvSpark>` 무조건. 관점/필터 켜도 정체성에 스파크 유지(유저 요청). 좁은 폭은 ident `overflow:hidden`로 degrade.
- **시총 표시통화 반영**: `fmtMktCap`이 `KEYSTONE_DISP` 무시하고 종목 원래통화 단위만 쓰던 버그 → `toDispCur(nativeTotal,cur)`로 환산 후 표시통화 단위 선택(원화 억/조/경, 달러 $B/$T). 자동모드(null)는 원래통화 유지. 예: 원화모드 Alphabet $2.2T→2991조, 달러모드 삼성전자 425조→$B/$T.

## ✅ 완료 — 스크리너 additive 레이아웃(G1+G2) + LensPicker 통일 (m1990)

**1) 스크리너 행 = 정체성 항상 유지 + 평가는 우측 추가(교체 아님).** (`app/P4Views.jsx` 행 map, `reticle.css`)
- 행 구조: `[G2 좌측 등급색선][국기][종목명][섹터·시총·spark=정체성] —spacer— [평가블록][괴리][n배지][현재가][등락]`.
- **정체성(`.scv-frow-ident` 섹터·시총)은 항상 표시.** spark는 `evalKeys.length===0`(순수 브라우즈)일 때만 — 필터/관점 시엔 지표가 추세 역할 대신하므로 spark 양보(공간 확보). 국기·종목명·섹터·시총은 어느 상태든 유지.
- **평가블록(`.scv-frow-eval`, 우측=G1)**: 관점 시 focus 지표(PER·ROE·영업익, tone색) + 등급핍(`ScvPips`+VerdictTip); 필터만일 땐 필터 지표(무채색, 등급 없음). 괴리 바로 왼쪽에 그룹핑.
- **G2 좌측 모서리 색선**: 관점 ON 행에 `style={{boxShadow:"inset 3px 0 0 "+verdictColor}}` + `.scv-frow-graded`. verdictColor=`SCV_VERDICT[verdict].color`.
- **레이아웃 핵심**: 종목명 `flex:0 0 auto;max-width:184px`(안 줄어듦=정체성 보호), ident `flex:0 1 auto;overflow:hidden`(좁으면 섹터 ellipsis), spacer `flex:1 1 0`(넓으면 좌·우 분리), eval `flex:none`. 핍 툴팁 `left:auto;right:0`. ⚠️ 좁은(~680px) 프리뷰에선 겹침처럼 보이나 DOM상 겹침 0(924px+ 섹터·이름 풀표시 검증), html-to-image truncation은 아티팩트.

**2) LensPicker 100% 단일 컴포넌트화.** (`DetailView.jsx` 정의+window export)
- `LensPicker({value,onPick,lang,variant,width})`: variant `toolbar`(스크리너 `scv-fw-pick`) / `chip`(디테일 `fin-lens-chip`). 데이터=`STRATEGIES.filter(s=>s.model)`+"관점 없음". **none 통일: circle-off+"관점 없음"**(이전 디테일 gauge+"관점 선택"이던 것 통일).
- 적용 3곳: 스크리너 툴바(`value={fwId}`)·재무제표·투자지표(`value={fwObj.id||"none"}`,`setFwSel`). 검증: 셋 다 "퀄리티 PER"+동일 9항목. 콘솔 0.

## ✅ 완료 — 사이드바 섹션 펼침 시 항목 압축 버그 (m1980)

**문제**: 포트폴리오·전략·관점·뷰·도구 섹션을 다 펼치면 인박스 등 위쪽 항목이 압축됨(의도 아님). 원인 = `.nav`(flex 세로 컨테이너, flex:1)의 자식들에 `flex-shrink:0`이 없어 내용 넘칠 때 스크롤 대신 flex-shrink가 항목을 찌그러뜨림.
- **수정**: `reticle.css`에 `.nav > * { flex-shrink: 0; }` 추가 → 항목 28px 유지·넘치면 `.nav`의 `overflow-y:auto`로 스크롤. 검증: 33개 항목 전부 28px, navScrollH 1329 > clientH 474.

## ✅ 완료 — 사이드바 승격 도구 간격 (플랜과 붙임, m1970)

**문제**: 승격 도구(관심종목·재무제표·스크리너)가 플랜과 멀찍이 떨어져 보임. 원인 = `reticle.css` `.nav > .nav-item:nth-of-type(3) { margin-bottom: 18px }`(=플랜에 박은 코어/섹션 구분 갭). 승격 도구가 플랜 navItem 뒤에 렌더되면서 그 18px가 플랜↔도구 사이를 갈라놓음.
- **수정**: 그 규칙 제거 → 첫 섹션 캡션(포트폴리오 `Cap`)에 `first` prop 추가 → `.nav-caption--first { margin-top: 18px }`. (`:first-of-type`은 태그(div) 기준이라 안 먹어서 JS 클래스로.) 결과: 플랜↔관심종목 29px(=인박스↔일지와 동일), 18px 구분은 포트폴리오 앞. (`Sidebar.jsx` Cap, `reticle.css`)

## ✅ 완료 — 플랜 배지 호버 툴팁 + 렌즈 피커 일치 확인 (m1960)

**플랜 카운트 배지 호버 → 실제 플랜 리스트.** (`app/P4Views.jsx`, `reticle.css`)
- `NPlansBadge({plans,ticker,lang,t,onOpenPlan})` 신규: `.sec-nplans`(카운트) + `.fin-tip` 호버카드 재사용. 카드에 헤더("이 종목의 플랜"+개수) + 플랜별 행(StatusIcon + name + planReturn% 또는 상태라벨). 우측앵커(`right:0`)·아래로 열림·`pointer-events:none`(행 클릭은 종목으로 통과). `onOpenPlan` 옵셔널(현재 미전달=읽기전용).
- 적용: 워치리스트 행(P4Views ~25), 스크리너 E행(~643). 보드/검색드롭다운은 미적용(오버플로 clip·전이성). 검증: NAVER→관찰, 카카오→-15.1%, 현대차→+21.0% 등 정상.

**렌즈 피커(관점 드롭다운) 일치 — 유저 문의 답**: 3개 surface(스크리너 툴바 `scv-fw-pick`, 재무제표 탭·투자지표 탭 `fin-lens-chip`) 모두 ① 공용 `MiniDropdown` ② 동일 데이터 `STRATEGIES.filter(s=>s.model)`(8개 관점) ③ "관점 없음" 옵션 ④ 공용 채점 `gradeWithFw`/`lensThreshOf` 사용 → **관점 목록·채점은 완전 일치(데이터 드리븐, 관점 추가 시 전 surface 자동 반영)**. 단 **단일 `<LensPicker>` 컴포넌트는 아님** — 각 site가 items 배열+트리거 마크업을 인라인 재선언(=부분 재활용). 시각 차이: 스크리너 none 아이콘 `circle-off` vs 디테일 회색 dot. 스코프 차이는 의도적(스크리너=유니버스 fwId 영속, 디테일=plan별).

## ✅ 완료 — 스크리너 브라우즈 상태 메타 (섹터·시총·스파크, m1940)

**관점·필터 둘 다 없을 때**(`noLens && !numKeys.length`) 행 좌측 메타를 임의 PER 대신 정체성으로. (`app/P4Views.jsx`)
- `.scv-frow-ident` = `섹터 · 시총(fmtMktCap) + <ScvSpark>`. 시총 = price×sharesOut×**1e6**(sharesOut이 백만주 단위라 1e6 곱). `fmtCompact` 아니라 `fmtMktCap`(억/조/경·B/T 롤링) 사용.
- `ScvSpark`(P4Views 상단, scvFmtV 근처): `s.spark` 최근16 → 54×16 폴리라인, 상승 pos/하락 neg. SecurityView mini와 동일.
- 의미 진행: 브라우즈=정체성 → 필터=거르는 지표(numKeys) → 관점=채점지표(shownCols). 검증: 14행 섹터·시총·스파크, 단위 정상(NAVER 27.6조·Tesla 770B·Alphabet 2.2T), 콘솔 0.
- ⚠️ 차트 현황(유저 문의): SecurityView에 `SecurityChart`(190px 라인) 있으나 **genSpark 더미 데이터**(주석: real data wires in later, chartNote 안내문). 플랜 상세엔 가격차트 **없음**(시나리오·밴드 위주). 캔들/거래량 없음. 실차트는 API 필요. 후보: 플랜 상세에 "가격+평단·목표가 오버레이" 차트.

## ✅ 완료 — 필터 검색 = 미니멀 + 조건부 (m1920)

`.flt-search` 박스형→테두리없는 헤어라인 행(스티키), 검색은 옵션 **≥8일 때만** 노출(스크리너 지표20·섹터11=뜸/시장5=안뜸, 플랜 포트폴리오 3=안뜸·많아지면 자동). `P4Views.jsx`(스크리너)+`Panels.jsx`(플랜/인박스/일지/뷰) 양쪽 적용. `searchable` 플래그 제거하고 옵션 수로 자동 판정.

## ✅ 완료 — Q1 관점 채점 재보정 + Q2 관점없음 메타 (m1900)

**Q1 — 관점별 채점이 안 맞던 문제**: 재보정 전 EV·턴어라운드는 9개 만점(통과 무의미), 퀄리티·배당·SOTP는 통과 0(너무 빡셈). `app/data.jsx`의 8개 STRATEGIES `thresholds`를 universe(~14종목) 백분위로 재보정(지표마다 good≈상위30%·bad≈하위30%): PER good15/warn40, PBR 1.2/8, ROE 25/8, OPM 32/9, NPM 25/8, GPM 52/30, REVG 20/4, DIVY 1.4/0.2, DEBT 33/120 — 관점은 이 중 focus 3개를 씀. 결과(라이브 gradeWithFw 검증): 전 관점 통과2~5·관찰3~10·탈락2~6, 만점 0~3. **6/6은 드물게 가능**(성장 DCF 3, EV·PSR 2 등). ⚠️ 백분위는 현재 시드 데이터 기준 — 실제 API 데이터 들어오면 재튜닝 또는 상대(백분위) 채점(옵션 B)으로 전환 고려.

**Q2 — 관점 없을 때 PER 등 지표 안 보이던 문제**: `shownCols=gradeFocus`라 관점 없으면 메타 비어 있었음. `app/P4Views.jsx` 행 메타를 `noLens ? (활성 숫자필터 키, 없으면 ["PER"]) : shownCols`로 분기. 관점없음 행은 `r.vals[k]`에서 값 뽑아 무채색(fg-2, 등급 아님)으로 표시 — "거르는 지표"가 행에 보임. (추천했던 Q2-C=표시패널 컬럼 직접선택은 미착수, 다음 후보.)

---

## ✅ 완료 — 스크리너 리스트 = E 이슈행형 (m1880)

**유저: 컬럼형이 "눈에 안 들어온다" → 비교데모(`app/compare-screener.html`, 현재/B/C/D/E/F)에서 E 선택.** (`app/P4Views.jsx`, `app/reticle.css`)
- **레이아웃**: `.scv-frow`(flex 한 줄) = `[등급 핍] [국기] [종목명(주인공)] [지표 메타: PER·ROE·영업익] [괴리] [현재가] [등락]`. 컬럼 그리드(`.scv-colhead` Q1안) 폐기. 등급은 좌측 **핍**(`ScvPips`, 6칸=`r.max`, 채워진 칸=`r.sc`, 색=verdict)으로, 그룹헤더(통과/관찰/탈락)가 등급 라벨 담당(groupBy=none이면 핍 색만).
- **채점은 6점 만점 유지**(핵심지표 3개×0/1/2). 데모에서 핍 4칸 그린 건 실수, 라이브는 6칸. 
- **색=의미 원칙**: 미달=red, 우수=green, 보통=무채색(`scvToneCol`).
- **⚠️ 폭/오버플로 함정(여러 라운드 겪음)**: `.body-main`이 `overflow-x:auto` → flex 자식이 max-content로 안 줄어듦. 게다가 숨은 `.scv-vtip`(opacity:0, position:absolute, 250px)이 scrollWidth를 부풀려 가짜 가로스크롤 유발. 해결: ① 종목명 `flex:0 100 auto`(먼저 말줄임), 지표메타 `flex:1 1 0;min-width:0;overflow:hidden`, 스페이서 중립화 ② `.scv-list-row{overflow-x:clip}`(세로 툴팁은 visible 유지) ③ 핍 툴팁=오른쪽으로(`left:0`), 괴리 툴팁=왼쪽으로(`right:0`) 열어 뷰포트·clip 안 잘리게. 검증: bodyMainHScroll=false, 툴팁 뷰포트 안.
- 데드 CSS: `.scv-vpill*`(F 알약, 미사용) 남아있음 — 무해, 나중 정리 가능.

## ✅ 완료 — 사이드바 도구 승격 (토글+핀 ★, m1830→A안 m1853)

**유저 요청**: 도구를 사이드바 상단(인박스·일지·플랜 옆 코어)으로 **승격** 가능하게. (`app/App.jsx`, `app/Sidebar.jsx`, `app/P4Views.jsx` CustomizeModal, `reticle.css`)
- **데이터 모델**: 기존 `sidebarCfg`(키→bool 표시/숨김) + `optOrder`(도구 순서) 유지 + **`sidebarPin`(상단 고정 키 배열) 신규**. 승격=`cfg[k] && pin.includes(k)`.
- **영속**: App.jsx에서 3개 모두 `keystone-sidebar-v1`(localStorage)에 `{cfg,order,pinned}` 저장(lazy init + useEffect). 이전엔 useState만이라 새로고침 시 리셋되던 것도 함께 고침.
- **상단 렌더**(Sidebar.jsx): 플랜 navItem 뒤에 `OPTIONAL_DESTS.filter(cfg[k]&&pin).sort(optOrder)` → 코어와 동일 navItem 스타일. 도구 섹션은 `!pinned.includes(k)`로 승격된 건 제외. ⚠️ navItem은 key 없어 `.map`에서 `<React.Fragment key={d.key}>`로 감쌈(key 경고 해결).
- **CustomizeModal (A안, m1853 최종)**: 처음엔 3단 세그 `[숨김|도구|상단]`으로 했으나 **행마다 24버튼이라 너무 무거움** → 유저 지적으로 되돌림. 현재 = **토글(켜짐/꺼짐) + 별(★) 핀 아이콘**. 핀은 켜진 행에만 보임(`isOn`), 클릭=상단 승격 토글. 끄면 핀 자동 해제. `.cz-pin`(off는 opacity 0, row hover 시 .25). 드래그 순서변경(optOrder)은 상단·도구 모두 적용.
- 트리거: 워크스페이스 메뉴(Keystone 로고) → "사이드바 편집". 검증: 핀→상단 이동·도구에서 제거·새로고침 유지·끄면 핀 비활성·key 경고 0·콘솔 0.
- ⚠️ show_html이 가끔 캐시 페이지 줄 때는 `location.reload()`로 강제 새로고침 후 검증.
- ⏳ 미착수(큐): 설정 초기화 버튼, 온보딩 플랜 사이클 워크스루, 스크리너 커스텀 산점도, **스크리너 컬럼 시각 위계 개선**(숫자 죄다 빨강·우측 5블록 위계 없음 — 유저가 "볼수록 별로"). **플랜 리스트 컬럼 헤더는 유저가 명시적으로 금지(시키기 전까지 손대지 말 것)**.

## ✅ 완료 — Q1: 스크리너 리스트 컬럼 헤더 (라벨 스택 제거, m1801)

**문제**: 스크리너 리스트 행이 셀마다 `회색 미니라벨(위)+값(아래)` 스택 → 행마다 라벨 7회 반복 지저분(플랜 행은 라벨 없는 자기설명 위젯이라 무관, 스크리너만). 리니어는 컬럼 헤더로 해소. → **옵션 A 채택**(데모 `app/compare-rows.html`에서 A/B/C/D 비교 후 유저가 A 선택).
- **구현**(`app/P4Views.jsx` 리스트 분기 ~571, `reticle.css`):
  - 리스트 분기를 IIFE로 감싸 `gcols`(grid-template-columns 문자열) 1회 계산 → **헤더(`.scv-colhead`)와 모든 행(`.scv-row`)에 같은 인라인 `gridStyle` 적용** → 칼정렬.
  - `gcols = ["14px","44px","minmax(84px,1fr)"] + shownCols×"58px" + (noLens?[]:["52px"=등급]) + ["50px"=괴리,"22px"=플랜,"72px"=현재가,"52px"=등락]`.
  - `MetricCell`에 `bare` prop 추가(라벨 `.scv-ind-lab` 생략, 우정렬). 행에서 `shownCols.map`으로 **정확히 N개 셀**(없으면 `.scv-ind-empty` —) 렌더 → 컬럼 수 고정.
  - 우측 클러스터(등급/괴리/현재가/등락) **라벨 제거**. 등급/괴리는 기존 `.scv-rcell-grade/.scv-rcell-val`(툴팁 CSS 재사용), 현재가/등락은 plain span.
  - 헤더는 `position:sticky;top:0;z-index:3`, 그룹헤더는 `.scv-list .grp-head{top:34px}`로 그 아래 스택.
- **관점→컬럼 자동 변경**: 지표 컬럼 = `shownCols = fw.gradeFocus`. 퀄리티=PER/ROE/영업이익률, 성장=매출성장/영업이익률/ROE, no-lens=지표·등급 없음(괴리/현재가/등락만). 헤더도 같은 `shownCols`에서 생성돼 자동 동기화.
- **⚠️ 정렬 함정(겪음)**: ① grid가 좁은 폭서 오버플로우하면 `minmax` 메트릭이 헤더/행 다르게 압축 → **메트릭 고정폭(58px)**으로 해결. ② `.scv-row { column-gap:10px; gap:0 }`에서 `gap:0`이 column-gap을 덮어써 행 갭만 0 → **`row-gap:0; column-gap:10px`로 분리**. 최종 정렬 maxDelta 0 검증.
- 보드/히트맵/사분면은 컬럼 개념 없어 안 건드림(`MetricCell`은 리스트 전용이라 bare 안전). 검증: 정렬 0·관점별 컬럼 변경·no-lens·보드 6카드 정상·콘솔 0.
- 후속(미착수): 플랜 리스트에도 같은 헤더 시스템 얹기(일관성, 선택), 헤더+그리드 행을 공유 리스트 컴포넌트로 추출(필터 통합과 같은 결의 큰 리팩터).

## ✅ 완료 — 스크리너 필터 = 플랜 기준으로 통일 (클릭형 묶음, m1781)

**진단**: 필터 두 구현이 따로 — 플랜/인박스/일지/뷰는 공유 `FilterPanel`(`Panels.jsx`), **스크리너만 자체 인라인**(`P4Views.jsx` ~636, `view !== "screener"`로 FilterPanel 제외). 껍데기 클래스는 같아 동일해 보였으나 **그룹 헤더 렌더링이 갈라짐**: 플랜=`flt-group-head`(클릭형 묶음+힌트+체크, `onToggle(headerType,...)`), 스크리너=`flt-grp-head`(클릭 안 되는 회색 라벨). 코드 재활용 ❌.
- **수정(플랜 기준)**: 스크리너 그룹 렌더를 플랜과 동일한 `flt-group-head` 클릭형 묶음으로(`묶음` 힌트+체크). `P4Views.jsx`에 `fltGroupOn`/`toggleFltGroup` 헬퍼 추가.
  - 카테고리형(시장 한국/미국): 묶음=leaf 값 전체 토글(한국→KOSPI+KOSDAQ).
  - 수치형(지표조건 밸류/수익/…): 묶음=그룹 메트릭 전체 일괄 추가(관점 임계값 프리필: 퀄리티에서 PER≤15). 검색박스 그대로.
- `FItem`(leaf)는 원래부터 플랜 `Item`과 동일. 검증: 한국 묶음→KOSPI+KOSDAQ+체크·재클릭 해제, 밸류 묶음→PER≤15·PBR≤1… 일괄. 콘솔 0.
- ⚠️ 향후: 두 필터 완전 통합(한 컴포넌트)은 스크리너 고유 기능(수치조건·검색·관점프리필/충돌) 때문에 큰 리팩터 — 미착수.
- ⚠️ **미착수(이전 턴 브레인스토밍 완료, 구현 미시작)**: 리스트 행의 "라벨-위/값-아래" 스탙 셀 → 링크디식 컬럼 헤더로 재디자인(플랜·스크리너 리스트 둘 다 컬럼 없이 행마다 라벨 반복 → 지저분). 추천: 스티키 컬럼 헤더 행 + 값만 남긴 행(링크디식), 그룹 헤더는 풀블리드 구분선.

## ✅ 완료 — 관점별 채점(하이브리드) + 충돌 경고 + 프리필 (Q3 = 3+A+C, m1759)

**유저 질문: 채점기준·필터·관점 방향 충돌 처리? → 3+A+C.** (`app/data.jsx`, `app/P4Views.jsx`, `app/reticle.css`)
- **근본 구조**: 전역 `IND_THRESH`(단일) + 관점별 `thresholds` 오버라이드. 과거엔 `_fwTh`/`_gradeWith`(DetailView) 기계장치만 있고 데이터 비어 죽은 코드였음 → 채움.
- **3 하이브리드**: 8 관점 각각 `thresholds: { KEY:{dir,good,warn} }`(data.jsx STRATEGIES). 예: 퀄리티→PER≤15·ROE≥18·OPM≥15, 성장→REVG≥20·OPM≥8. 헬퍼 `lensThreshOf(fwId,key)`/`gradeWithFw(fwId,key,v)`(data.jsx). 적용: 스크리너 `inds` 재그레이딩(P4Views ~304) + DetailView `_fwTh` 자동 점등 + `ruleTxt`/`scvThreshTxt`/`MetricCell`/`VerdictTip` 모두 `lensThreshOf(fwId,..)`.
- **A 충돌 경고**: `numConflict(nf)` — 필터가 focus이면서 관점 선호 반대방향이면 `.scv-numchip--warn`+⚠+툴팁.
- **C 프리필**: `addNum`이 `lensThreshOf(fwId,key)`로 op+val 프리필.
- **Q1 버그**: 인사이트 시나리오 `t.caseBull`(“Bull”) 하드코딩→`scLabel(c.key,lang)`(한글 상단/중간/하단). Q2(괴리 호버 산식)는 `ValueTip`로 이미 있음.
- CSS: `.scv-numchip--warn/.scv-numchip-warn/.scv-warntip`. ⚠️ 임계값=판단값(데모용), 조정은 STRATEGIES `thresholds`만 고치면 전 surface 반영.

## ✅ 완료 — 인사이트 리디자인 (전략/관점 분리 + viz, m1716)

**사이드바 인사이트(`InsightsView`, `app/Insights.jsx`) 전면 리디자인.** 원본 백업 `app/Insights.bak.jsx`. (`reticle.css` insights viz 블록 추가)
- **전략 vs 관점 분리(버그 정정)**: 기존 "전략 성과"가 `STRATEGIES`(=관점)를 `p.strategyId`로 묶어 라벨만 전략이던 버그 → `PerformanceSection`으로 교체. **[관점|전략] 세그 토글**: 관점=STRATEGIES(.model)/`strategyId`, 전략=EXEC_STRATEGIES/`execId`. (StrategyStrip 주석이 이 데이터 모델 확인: 전략=execId, strategyId=관점.) ⚠️ 유저는 "2섹션(둘 다 상시)"을 원했는데 내가 토글로 구현 — 원하면 두 InsSection 상시노출로 분리 가능(간단).
- **viz 추가(의미 있는 것만, "no 도넛" 철학 유지)**: ① `InsGauge` 반원 게이지(적중률·승률, pathLength dasharray 채움, sweep=1 상단호) ② `PerfScatter` 승률×평균수익 산점도(점=관점/전략, 크기=플랜수) ③ `ins-funnel` 단계 구성막대(관찰·계획/실행중/청산중/종료) ④ `ins-histo` 수익률 분포 히스토그램(보유 플랜, 음수=red/양수=green).
- 성과 기준: `planReturn`(보유 플랜 미실현률). 종료 플랜은 rate 없어 성과표/산점도 제외(기존과 동일), 승률·손익비는 realizedPL ±8 처리(기존 유지).
- 검증(DOM): 관점=퀄리티 PER/성장주 DCF/가치·자산주 PBR, 전략=무한매수법/그리드/… 정확. 게이지 75%·78% 렌더, 산점도·퍼널·히스토그램 정상. 콘솔 에러 0.
- ⏳ 합의했으나 미착수: ③사이드바 도구 승격(C안 구분선) ⑤스크리너 커스텀 산점도. 브레인스토밍만 한 것: 설정 초기화 버튼, 온보딩 플랜 사이클 워크스루.

## ✅ 완료 — 1C 렌즈 스트립 + 2B 아이콘 모드토글 (m1696)

**주제1-C + 주제2-B 라이브 적용.** (`app/DetailView.jsx`, `reticle.css`)
- **2B 아이콘 모드토글**: 양쪽 탭 모드 세그를 `<Lic>` 아이콘으로. **선택된 것만 라벨 노출**(`{imode===k && <span>{lab}</span>}`), 나머지 아이콘+`title` 툴팁. 추세=아이콘 토글(`.ind-trend-ico`). 양쪽 13px 통일(이전 12px 축소 제거), `.ind-subbar .ind-catseg .st{padding:5px 10px}`(특이도 0,3,0 — `.fin-subtabs .st` 14px을 이김)로 1줄 유지(subbarH 33). 아이콘: card→layout-grid, gauge→gauge, heat→grid-3x3, table→table, chart→trending-up, comp→pie-chart, 추세→activity.
- **1C 슬림 렌즈 스트립**: 전체 scope=keyCards 히어로(기존), 하위 scope=`.lens-strip`(azure 틴트 한 줄). 렌즈 없으면 둘 다 null.
  - 투자지표: `{indCat==="all" ? keyCards() : lensStrip()}`. 스트립=fwKeys를 fmt+등급칩+tip. 모든 모드에서 카테고리면 상주.
  - 재무제표: keycards IIFE를 `{(() => {...})()}`로 풀고 `if(stmt!=="all"){ if(!lensOn) return null; return <strip> }`. 스트립=fwHiliteLines를 KLAB+fv+YoY%.
  - CSS: `.lens-strip/.ls-title/.ls-sep/.ls-item/.ls-yoy`(reticle.css).
- **⚠️ 판단필요**: 재무제표 하위 명세서의 스트립은 렌즈 핵심 LINE을 보여서 손익계산서에선 아래 명세서와 약간 중복(헤드라인+디테일 의도). 거슬리면 `stmt!=="all"` 분기만 제거하면 투자지표만 스트립 남음. 비교 데모: `app/compare-demo.html`.

## ✅ 완료 — 투자지표/재무제표 "관점" 모델 (lens=직교축, m1676 최종형)

**두 탭이 동일한 scope×mode 격자 + 직교하는 렌즈(관점) 축으로 통일.** (`app/DetailView.jsx`, `reticle.css`)

### 최종 모델 (양쪽 탭 대칭)
- **연결 seg = scope만.** 투자지표 `[전체·밸류·수익·성장·안정·배당]`(seg 라벨은 단축형, 그룹 헤더·툴팁은 풀네임), 재무제표 `[전체·손익계산서·재무상태표·현금흐름표]`. **관점/핵심 탭 없음.**
- **렌즈 드롭다운(예: 퀘리티 PER) = 유일한 관점 컨트롤**(카테고리와 직교축). 툴바에 상주. 렌즈는 등급 채점 + 핵심 항목 인라인 강조(표 `fin-hilite`/태그) 구동.
- **keyCards 핵심지표 헤더 = 렌즈 구동, `전체`(all/stmt==="all") scope에서만** 콘텐츠 맨 위에 표시. 카테고리·명세서 드릴다운엔 없음. (투자지표 `{indCat==="all" && keyCards()}`, 재무제표 keycards 블록 `{stmt==="all" && …}` — 렌즈 켜지면 `fwHiliteLines`, 꺼지면 손익 헤드라인.)
- **모드토글 항상 표시**(투자지표 카드/게이지/히트맵/표/차트, 재무제표 카드/표/구성/차트).
- **한 줄 레이아웃**: `.ind-subbar`(=`.fin-subbar` 변형)에 `flex-wrap:wrap` 안전망 + seg 라벨 단축 + `.ind-subbar .seg-toggle .st{padding:5px 8px;font-size:12px}`로 좀은 디테일바(~674px)에서도 1줄 유지.

### 경위 (왜 이렇게 됐나)
- m1621에 관점을 "연결 seg 맨 오른쪽 scope"로 통일했으나(0✦D), 유저가 m1676에서 **거부**: ① 관점은 카테고리와 같은 축이 아니라 직교축인데 seg에 끼워 중복(렌즈 드롭다운과), ② seg가 길어져 툴바가 2줄로 깨짐(시각 부담). → 관점을 seg에서 빼고 렌즈 드롭다운만 남김, keyCards는 `전체` scope 헤더로(유저 선택 "A의 변형").
- ⚠️ 미해결 후보(유저가 m1672에서 언급, 이번엔 안 건드림): 투자지표 `sectionChart`(간이 묶음막대)가 `표 모드 + 특정 카테고리`에서만 나옴 — 전체·관점엔 없어 불규칙. 유저가 "재무제표처럼 간이차트 안 나오던 시절"을 원했었음. 필요시 `tableView()`의 sectionChart 호출(`DetailView.jsx` ~2116) 제거하면 표 모드=순수 표로 통일. (renderIndPanel은 이미 죽은 코드.)

---

## 0. 한 줄 요약
한국/미국 주식 **투자 트래킹 앱**. 라이트/다크, 한/영 지원. 다크-퍼스트 Linear 스타일(Vector 디자인 시스템 계열). 백엔드 없는 프로토타입 — **추후 API(DART / SEC EDGAR / Finnhub 등) 연동을 전제로 "제대로 작동하는 원형"을 만드는 게 목표.** 하드코딩 금지, 실제 로직으로 구현.

---

## 1. 빌드 / 작업 규칙 (중요)
- **편집 후 항상 버전 범프**: `Keystone.html` 안의 `?v=NNN` 숫자를 +1 (run_script로 일괄 치환). 안 하면 캐시 때문에 변경이 안 보임.
- `.jsx`는 브라우저에서 Babel로 트랜스파일됨(인-브라우저). 첫 로드 시 잠깐 검은 화면 = 정상(Babel 컴파일 중). `.css`는 `reticle.css`(앱 자체 토큰) + `colors_and_type.css`.
- **스타일 토큰은 `reticle.css`의 `--fg`, `--bg-app`, `--pos`, `--neg`, `--r-base`(앰버) 등 자체 체계**를 씀. DS 린트 경고(~21건, App.jsx raw px/hex)는 이 자체 토큰 체계 때문이며 무시해도 됨.
- 한글 버전이 기본. 새 문자열은 반드시 `data.jsx`의 i18n(en/ko 양쪽)에 추가. 영어가 새어나오지 않게 (Weekly, framework category, Today/월일 같은 사고 전례 있음).
- 숫자 포맷(data.jsx, 전역): `fmtCompact(n, cur)` / `fmtMoney(n, cur)` / `fmtMktCap(nativeTotal, cur)`. 통화는 KRW/USD, mock FX = 1380(`KEYSTONE_FX`). 표시통화(dispCur)는 보기 환산용 — **입력값은 항상 네이티브.**

---

## 2. 핵심 개념 모델 (이 앱의 정신)
세 축이 **서로 독립적**이라는 게 핵심. 자주 혼동돼서 버그남.

- **플랜(Plan)** = 종목 하나에 대한 투자 건. `data.jsx`의 `PLANS[]`. id `PLN-001` 등. 필드: `ticker, tickerName{en,ko}, cur, status, portfolioId, strategyId(=관점!), execId(=실제 전략!), scenarios[], avgPrice, totalShares, divisions, round, currentPrice, executions[], notes[]` 등.
- **시나리오(Scenario)** = **가격 판단**. 전략과 **무관**. `하단 / 중간 / 상단` 3개의 가상 목표가(핵심 3단 고정 — 추가 버튼 없음). 손절/익절/적정가 무엇으로 보든 자유. 막대바 + "괴리(현재가 vs 하단/중간/상단 드롭다운 선택)"로 시각화. `gaugeData(plan)`.
- **전략(Execution Strategy)** = **실행 방법**. `EXEC_STRATEGIES[]`. plan.**execId**로 참조. 종류: 무한매수법, 정액분할매수, 밸류에버리징, 그리드 매매(=박스권), 밸류리밸런싱, 6:4 자산배분, 모멘텀. 각자 `fields[]` + `규칙(when/then)`. 회차·평단·다음매수가 = 전략 영역.
- **관점/프레임워크(Framework)** = **밸류에이션 스키마**. plan.**strategyId**로 참조(이름이 헷갈리게 strategyId임 — 주의). `STRATEGIES[]`. cat: multiple/intrinsic/asset. 재무제표·투자지표·밸류에이션에서 핵심지표 판정에 쓰임. 한글 라벨 "관점". **종목·플랜 내부에서 같은 데이터를 여러 관점으로 보는 용도** — 리스트 필터에는 넣지 않음(고정값이 아니라서).

⚠️ **자주 난 버그**: `plan.strategyId`(관점)를 전략으로 오용. 실제 전략은 **반드시 `plan.execId` → `EXEC_STRATEGIES`**.

---

## 3. 파일 맵 (app/)
- `App.jsx` — 루트. view 라우팅, theme/lang/dispCur 상태, 인박스 read 상태(소유), conn(라이브/재연결), **토스트(`fire`/auto-transition/세션 첫 알림)**, 체결 시 상태 자동전이.
- `Sidebar.jsx` — 좌측 레일. 워크스페이스/도구/전략/관점/포트폴리오, 인박스 안읽음 카운트(앰버 숫자, 라이트모드 대비 보정됨).
- `Chrome.jsx` — 탭바 + 브레드크럼 점프 다이얼로그.
- `Inbox.jsx` — 알람(트리아지). 3단 마스터-디테일. 시나리오 막대 + 전략 스트립 + 호버툴팁.
- `Journal.jsx` — 일지. 인박스와 동일한 3단 마스터-디테일. **메모 리스트: limit=80 + 날짜 그룹핑(오늘/날짜 헤더) + "더 보기(+80)" + 리더 스레드 형제 8개 cap.** 인박스에 기록 남기면 해당 종목/플랜에도 스레드로 남음(양방향).
- `Dashboard.jsx` — 플랜 "현황" 디스플레이 모드. 헤드라인(진행중/검토/평균수익률/보유/확인필요) + 액션큐(종목 클릭 시 해당 플랜으로 점프) + 포트폴리오 미니 히트맵.
- `ListView.jsx` / `BoardTimeline.jsx` — 플랜 리스트/보드/타임라인.
- `DetailView.jsx` — 플랜 세부(우측 디테일바 + 세부탭: 시나리오/체결/규칙/활동, 활동은 맨 뒤). FIELD_TIPS 여기. 시뮬 패널 implied cap = `fmtMktCap`. 전략 축 막대 호버툴팁(가격 막대 전용, **칩 바로 아래** 표시).
- `P5Scenarios.jsx` / `trajectory.jsx` — 시나리오 탭 / 괴리·추적 차트.
- `StrategyEditor.jsx` — 전략/관점 에디터. `strat_diagram.js` — 전략 도식. `icons.jsx` — Lic 아이콘 + `ScenarioGauge` + `StrategyStrip`(값 바닥정렬로 일관성 통일) + `Flag`.
- `valuation.jsx` / `valuation_view.jsx` — 밸류에이션. 멀티플 밴드, 자동계산, **목표주가→필요조건(실적으로/기대감으로 2-path)**, 역산기. `capUnits`(억·조·경 / $B·$T)+`pickU`, `finUnits`. `futuretest*.jsx` — 시뮬레이터.
- `securities.jsx` / `SecurityView.jsx` — 종목 화면(재무제표/투자지표/밸류에이션, 관점 적용). 시총 = `fmtMktCap`. `ledger.jsx` — 체결 장부.
- `Insights.jsx` / `planinsights.jsx` — 인사이트. `P4Views.jsx` — 저장된 뷰 + **스크리너(ScreenerView)** + 시뮬/보관함/휴지통 + 사이드바 편집. `Panels.jsx` — 공용 패널/필터.
- `Auth.jsx` — 로그인/회원가입/온보딩(소셜 4종, 튜토리얼 코치마크).
- `data.jsx` — **모든 데이터 + i18n(T) + 포맷터**. PLANS, EXEC_STRATEGIES, STRATEGIES, SECTORS, FIN_SEED, 종목 데이터.
- `reticle.css` — 앱 전체 스타일. `screenshots/` `scrn/` — 작업 캡처.

---

## 4. 최근 완료한 작업 (이번 세션 누적)
0✚F. **1C 렌즈 스트립 + 2B 아이콘 모드토글** (위 ✅ 섹션): 관점 박스를 전체=히어로/카테고리=슬림 스트립으로 차등(1C), 모드토글 아이콘화로 양쪽 13px 통일(2B). (`DetailView.jsx`, `reticle.css`)
0✦E. **관점 = 직교 렌즈 축으로 재편(m1676 최종형)**: 0✦D(관점=연결 seg 맨 오른쪽 scope)를 유저가 거부 → 관점을 양쪽 탭 seg에서 제거, 렌즈 드롭다운만 관점 컨트롤로. keyCards 핵심지표 헤더는 `전체` scope에서만(렌즈 구동). 투자지표 seg 라벨 단축(밸류/수익/성장/안정/배당) + seg 패딩 축소로 1줄 유지. 재무제표 keycards도 `전체`에서만(렌즈 켜지면 fwHiliteLines). 양쪽 대칭. (위 ✅ 섹션 상세)
0✦D. **투자지표/재무제표 "관점" 모델 통일 완료** (위 ✅ 섹션): 투자지표를 재무제표와 동일한 연결형 scope×mode 격자로 재편(관점=카테고리 seg 맨 오른쪽, 모드토글 상시, 렌즈 툴바 상주, keyCards 관점 헤더). 재무제표는 `핵심`→`관점` 개명 + 맨 뒤 이동. m1603 거부판 완전 제거. (`DetailView.jsx`, `reticle.css .ind-subbar`)
0✦C. **재무제표 등급 라벨 `저조`→`주의` 통일** + **투자지표 관점 모델 통일 작업 착수(미완, 위 ⏳ 섹션 참조)**: 키스톤 전역 등급어가 `우수/보통/주의`라서 재무제표 keycard `gl` 객체의 `bad`를 `저조/Weak`→`주의/Watch`로 교체(투자지표 `GLAB`은 이미 우수/보통/주의). m1603에서 투자지표 관점을 "우측 별도 pill + 모드토글 숨김"으로 만들었으나 **유저가 거부**(관점 누르면 카드/게이지/히트맵 사라짐) → 재무제표식 "연결 scope×mode"로 통일 예정. **현재 코드엔 거부된 m1603 버전이 그대로 남아 있음 — 다음 채팅 첫 작업으로 교체.**
0✦B. **관점-차트 일관성 = 양쪽 탭에 "핵심(관점)" 탭 추가**(`DetailView.jsx` `FinancialsTab`+`IndicatorsTab`): 진단 — 관점이 차트엔 안 닿고(재무제표는 전체에서조차 손익 헤드라인만), 전체 탭이 내부 불일치(차트=관점/표=전부). 해결 — 두 탭 모두 카테고리 줄을 `[핵심(관점)] · 전체 · {카테고리…}`로 통일. ① **핵심 탭** = 관점이 차트를 가지는 유일한 곳: 재무제표=`fwHiliteLines`(영업이익·순이익·매출총이익 등) 묶음막대+핵심항목+표(명세서 가로질러 해당 행만, 빈 명세서 블록 생략), 투자지표=`fwKeys` `sectionChart`+핵심항목+표(교차카테고리 단일 그룹 `_focus`, 별 아이콘+관점색). ② **전체 탭 = 완전 중립**: 재무제표 핵심항목·차트 모두 손익 헤드라인(rev/op/net, 캡션 "손익 헤드라인"), 투자지표는 차트 제거(20개 혼합단위라 무의미)·표만. 관점은 양쪽 다 표 행 `●` 태그로만 은근히 표시(`hiSet`=`fwHiliteLines`로 통일). ③ 카테고리/명세서 탭 = 중립 드릴다운(그대로). ④ 관점 해제 시 focus 탭으로 머무는 stale 방지(`useEffect`로 stmt/indCat 리셋). ⑤ `.fin-chart`에 `colOf` 헬퍼(focus는 토큰 대신 실제 색 직접 전달). 등급 의미는 데이터 성격대로 유지(투자지표=관점 thresholds, 재무제표=YoY 방향) — 의도적 비통일. **⚠️ 이 "핵심을 별도 탭으로"가 0✦C에서 통일형으로 재편될 예정.**
0✚✚✚✚. **투자지표 표 모드 차트 = 재무제표식 "표 위" 단일 묶음막대**(`DetailView.jsx`): ① 차트를 표 **아래→위**로 이동(재무제표가 `fin-chart`→`fin-table` 순서인 것과 일치, `.ind-table-wrap` flex-gap 20px). ② `sectionChart` 미니그리드(지표별 패널) 경로 제거 → **항상 묶음막대**. 단위 섞이면(전체+프레임워크 PER배+ROE%+OPM%) **지수화(2020=100)** 후 한 차트로, 캡션 "지수 2020=100 · 호버 시 실제값". ③ `renderIndBars(keys,{index})` — `idx`면 각 계열 첫 유효값=100 리베이스(`real` 보존), 막대=지수·호버 툴팁=실제값(배/%). 같은 단위 섹션은 종전대로 절대값 막대. 검증: 전체→1차트 15막대 지수+호버 실제값(PER 12.3배 등), 수익성→절대값 5범례, 둘 다 표 위.
0✚✚✚. **투자지표 표 모드 = 재무제표식 하단 차트**(`DetailView.jsx` `tableView()`): [상위 항목으로 대체됨 — 차트는 이제 표 위]
0✚✚b. **PEG 연도 추세 복구**(`indMetricAt`): switch에 `PEG` 케이스 추가 — `(px/eps) / REVG[i]`(카드 현재값과 동일 공식, 매출성장>0 해만), 역성장 해는 자동 제외. 마지막 막대=카드 현재값 일치. PEG는 분모(성장률)가 0 근처면 폭증 → 날것 유지(사용자 합의).
0✚✚. **투자지표 영역차트 = 막대화(B2) + 카드 미니막대(C) + 색 분리**(`DetailView.jsx`/`reticle.css`): ① **`renderIndBars`** 신설 — 같은-단위 영역(수익성=%·밸류=배·성장성·안정성·배당)은 **연도별 묶음 막대(0 기준, 실제값)** + 연도 호버 시 `fcb-tip`(연도별 전 지표값). ② **`renderIndPanel` + `.ind-mini-grid`** — 혼합단위(관점 핵심: PER배+ROE%+영업이익률% 등 gradeFocus가 단위 섞일 때)는 **지표별 미니 막대(각자 축)** small-multiples, 막대 호버 시 `.ind-mini-tip`(연도+값). `sectionChart`가 `fmt`로 same/mixed 판정해 자동 분기, 혼합 시 "단위가 달라 지표별로" 노트. **이유**: 비율은 단위가 섞이면 한 축에 못 올림(14배 vs 8%) → 기존 지수화 라인이 추상적이라 "있으나마나"였음. ③ **카드 미니막대**: `metricSpark`를 라인→**막대**로(지표 tone색, 최근값 강조), `trend` 기본 **ON**이라 카드/게이지/표에 항상 5년 막대 노출. ④ **PALETTE 재정렬**: 0·2번이 둘 다 파랑(accent·#4C8DFF)이라 PER·영업이익률 색 겹침 → 2번을 주황으로 이동(PER 파랑·ROE 초록·영업이익률 주황 분리).

0✚. **스크리너 등급 = 분할 pip + 투자지표 영역 선택창 + 영역 연간차트 + 카드라벨 색**: ① **`ScvPips`**(`P4Views.jsx`) 신설 — 연속 `.scv-meter` 막대(카드/표/제외목록 3곳)를 **점수칸 pip**으로 교체. 칸 수=`r.max`(focus×2), 채움=`r.sc`(good2·mid1·bad0), 색=판정색. VerdictTip "합계 4/6"과 칸 수 1:1 일치. **정렬·랭킹은 연속 `r.ratio` 유지**(pip은 시각요약일 뿐, 수천 종목 동점 안 뭉개짐). CSS `.scv-pips`/`.scv-pip`. ② **투자지표 영역 선택창**(`DetailView.jsx` `IndicatorsTab`): `indCat` state + `.ind-catbar`(`전체·밸류에이션·수익성·성장성·안정성·배당`, 아이템 있는 cat만). 카드/게이지/히트/표 뷰의 그룹을 indCat으로 필터(차트뷰는 자체 picker라 catbar 숨김). ③ **영역 연간차트**: `sectionChart()`+`catKeysOf()` 헬퍼 — `전체`면 focus(관점 핵심) 박스 **아래** fwKeys 묶음차트, 영역 선택 시 focus 숨기고 그 영역 카드 **위**에 같은-단위 묶음 라인차트. `renderIndChart`가 `units.size>1`이면 자동 지수(index=100)화라 혼합단위 안전, 동일단위(수익성=%·밸류=배)는 실값. 표뷰 상단 차트도 indCat 반영. ④ **카드뷰 등급 라벨 색**: `.ind-gtag` 글자색을 dot 색과 일치(`.ind-g-good/mid/bad` 텍스트 색 추가, 라이트모드 darken) — 기존 "faint(회색)+숫자만 색"의 의도적 중복회피를 유저 요청대로 해제. (`reticle.css`)

0✦. **지표 개념 사전 공유 글로벌 + 스크리너 지표 셀 툴팁**(`securities.jsx` `KS_METRIC_DICT(ko)`/`KS_METRIC_FORMULA` 신설·`window` 노출, `DetailView.jsx` 인라인 DICT/FORMULA를 이 글로벌 참조로 교체 — 단일 출처, `P4Views.jsx` `MetricCell`): 스크리너 행의 PER/ROE/영업이익률 등 지표 셀에 종목 상세 카드와 **동일한** 호버 툴팁(개념 + 방향 + 공식 + 등급 밴드 "현재 X · OO 구간 · 우수 ≤a · 주의 ≥b") 추가. `.scv-inds`가 `overflow:hidden`이라 셀 내부 absolute 툴팁이 잘리므로 **`position:fixed` + onMouseEnter에서 getBoundingClientRect로 좌표 계산**(좌우/상하 클램프, VerdictTip/ValueTip와 동일 회피책). 현재가·등락은 자명해 툴팁 제외. 등급 막대(VerdictTip)·괴리(ValueTip) 툴팁은 기존 유지. ⚠️ 등급 임계(IND_THRESH)는 **시장 통념 기반 절대 기준**(업종 무보정) — v2에서 업종 상대 백분위 채점으로 전환 권장.
0★★. **스크리너 요약바 = 필터 정합 + scored 메모이즈**(`P4Views.jsx`): ① **요약바(통과/관찰/탈락) counts를 `scored`(전체 유니버스) → `matched`(필터 통과분) 기준으로 변경** — 이제 통과+관찰 = "후보", 탈락 = "제외"로 리스트와 숫자가 정확히 일치(이전엔 전체 vs 필터라 어긋나 혼동). 검증: 필터無 통과2+관찰9=11후보·탈락3=3제외(=14 전체), PER≤10 시 관찰1+탈락1로 같이 축소. ② **`scored`를 `React.useMemo([fwId, plans, focus.join(",")])`로 메모이즈** — 매 렌더(필터 입력·호버·레이아웃 토글)마다 전 종목 재채점하던 걸 제거. 14개에선 공짜, 수천 개 API 단계의 안전판. 라이브 시세 틱 없음(가격 상수)이라 의존성 단순. **API 확장 시 근본책**: 필터를 서버로 보내 survivors만 받아 채점(클라가 3천 개 안 들고 옴) — 현 "필터→survivors→채점→요약바" 흐름과 그대로 연결.
0★★★★★. **필터 깔때기 스크리너에서도 복원**(`App.jsx` 깔때기 가드): 가드가 `view === "plans"`만이라 스크리너에서 깔때기가 사라졌던 회귀 수정 → `(view === "plans" && !selPlan && !selSec) || view === "screener"`. 스크리너는 App의 `panel`/`setPanel`/`filterAnchor`를 props로 공유받아 헤더 깔때기가 스크리너 필터(지표 조건·밸류·시장·섹터·재무·관심)의 진입점 — 디스플레이(sliders) 바로 왼쪽. 플랜/스크리너 양쪽에서 깔때기 = 표시 옆, 클릭 시 각 뷰의 필터 드롭다운 직접 오픈.
0★★★★. **필터 깔때기 = 드롭다운 직접 오픈 (최종, 기존 동작)**(`App.jsx` viewheader): 깔때기는 우측 `toolbar-icons`의 표시(sliders) 바로 왼쪽. 누르면 `openFilterAt(e)`로 **필터 드롭다운 팝오버를 바로 엶**(상태·포트폴리오·전략·시나리오·수익률) — 깔때기 아래 우측 정렬 앵커, flyout은 왼쪽. active = `panel === "filter"`. 필터바(`.filterbar` 칩 스트립)는 **활성 필터가 있을 때만** 표시(`activePf || activeFilterCount>0`), 그 안의 `+`도 `openFilterAt`로 같은 팝오버. ⚠️ 중간에 시도한 "인라인 필터바 토글(옵션 B)"·"깔때기 좌측 이동"은 **모두 폐기** — 깔때기는 클릭 즉시 드롭다운을 연다.·검토·진행중·종료) 바로 오른쪽**(`.flt-funnel-l`)으로 옮김. `openFilterAt`은 트리거가 화면 좌측 절반이면 좌측 앵커+flyout 오른쪽으로 자동 분기하므로, 깔때기가 좌측이 되면서 팝오버도 좌측에서 열림(리니어와 동일). 표시(sliders)·인박스는 우측 유지. 스크리너는 자체 `+`(scv-toolbar) 트리거 사용 — 무관. 넓은 실뷰에서 검증(깔때기 left≈657, 팝오버 같은 좌측에서 열림).
0★★★. **헤더 깔때기도 트리거 앵커**(`App.jsx` `openFilterAt`에 `rightSide` 분기 + `flyout` 필드, 헤더 깔때기 onClick이 `openFilterAt(e)` 호출, `Panels.jsx`/`P4Views.jsx` 패널에 `fly-left` 클래스, `reticle.css` `.flt-menu.anchored.fly-left .flt-flyout`): 헤더 필터 깔때기가 `right:52` 고정 도킹 → **깔때기 바로 아래 우측 정렬 앵커**(리니어식). 화면 우측 트리거라 플라이아웃은 왼쪽으로 열림. 좌측 트리거(필터바 `+`)는 종전대로 flyout 오른쪽. 플랜·스크리너 양쪽 검증(panelRight=funnelRight, 뷰포트 안).
0★. **필터 `+` 팝오버 전역 앵커**(`App.jsx` `filterAnchor`/`openFilterAt`, `Panels.jsx` FilterPanel `anchor` prop, `P4Views.jsx` 스크리너 인라인 메뉴): 필터바의 `+` 버튼을 누르면 리니어처럼 **그 버튼 바로 아래에 앵커된 팝오버**로 열림(`position:fixed` + getBoundingClientRect, 좌측 clamp `innerWidth-470`). 플랜·스크리너 공통. 우측 헤더 깔때기(list-filter)는 `filterAnchor=null`로 종전대로 우상단(`top:84,right:52`). 앵커 모드에선 카테고리 플라이아웃이 오른쪽으로 열림(`.flt-menu.anchored .flt-flyout{left:calc(100%+7px)}`). 검증: 스크리너 `+`→left=442/top=170, 플랜 `+`→left=362/top=119, 헤더 깔때기→right=52/top=84 비앵커.
0. **스크리너 깔때기 전환 + raw 숫자 필터 + 관점 없음**(`P4Views.jsx` ScreenerView): ① **'탈락'을 버킷 → 접힌 카운트로 강등** — 메인 리스트/보드/히트맵은 통과+관찰(후보)만, 탈락은 "N 제외됨" 푸터로 접어 펼치기(상위 60개 캡, 대규모 대비). 요약바 탈락 클릭=펼침. 사분면은 산점도라 전체 표시 유지. ② **raw 숫자 지표 필터**(필터 패널 "지표 조건") — PER/PBR/PSR/EVEB/PEG/ROE/ROA/OPM/NPM/REVG/OPG/DEBT/DIVY를 `IND_THRESH` 기본 임계값으로 추가, **편집형 칩**(≤/≥ 토글 + 숫자 입력)으로 인라인 조정. AND 결합, 데이터 없으면 제외. `scored`에 `vals` 맵 추가, `fmatch`에 num 루프. 설계 철학: **필터로 모수 좁히고(바닥) → 관점으로 본다(렌즈)**. verdict 필터·"통과만" 링크 제거(요약바가 등급 컨트롤). ③ **관점 없음(No lens)** — 관점 드롭다운 첫 항목. 품질 렌즈를 꺼서 **순수 숫자 필터 스크리닝**(MTS/HTS식). `noLens`=fwId==="none": 품질 채점·통과/관찰/탈락·룰바·요약바·품질메터·제외푸터·사분면·점수정렬·등급묶음 전부 OFF, 숫자필터+밸류+섹터/시장 필터만. 호환 안 되는 상태는 useEffect로 자동 보정(quadrant→list, score→value, verdict→none). 렌즈 ↔ 무렌즈 양방향 전환 검증 완료.
0b. **스크리너 밸류 통합 + 저장된 스크린**(이전): 괴리(밸류) 축·사분면(품질×밸류)·저장된 스크린(`keystone-screener-saves-v1`). 사분면 4칸 라벨(싸고좋음/좋지만비쌈/싸지만약함/비싸고약함).
1. **체결 회차 → 통합 순번**(`ledger.jsx`) — 전 전략 매수·매도를 시간순 1·2·3…으로(무한매수법 1~12 유지). 매도 있는 전략의 이월행은 "기초 보유" 한 줄(평단 기준, 회차칩 없음)로 — 매도분 원가 못 살리던 ₩2,100/"1+" 버그 수정. PLN-011 체결 배열 역순도 교정.
2. **구성탭 묶음 툴팁**(`DetailView` fin-comp) — 세그먼트 단건 → 연도 전체 항목(매출원가·판관비·순이익·기타 + 매출액 100% 합계) 묶음.
3. **시나리오/배수 추가 버튼 제거** — 시나리오는 핵심 3단(하단/중간/상단) 고정, 밸류에이션 슬롯도 3개(하단/기준/상단) 고정(삭제 트랩 제거).
4. **밸류에이션 목표주가→필요조건 재설계** — `실적으로`(매출·영업이익·순이익·EPS·ROE 카드, fundamentals)/`기대감으로`(PER·PBR·PSR 독립 카드, 배수만) 2-path. `absFmt`로 순이익에 capFmt 잘못 곱하던 천문학적 숫자(2051195358240조) 수정. 시뮬레이터에서도 재무제표 비의존으로 매출·영업이익 표시되게 수정.
5. **전략 축 막대 호버툴팁** — 고정 박스 시도 폐기 → **칩 바로 아래**(가격 숫자 6px 아래)로 통일. 가격 막대 전용(`.sc-axis-mark .sc-axis-tip`)만 내려서 다른 축 안 건드림. 폭 152~165px 균일.
6. **시총 단위 tiering**(`fmtMktCap` in data.jsx) — 종목 헤더/시뮬레이터/상세 시뮬 implied cap 3곳 통일. 값 크기에 따라 **억↔조↔경 / B↔T 자동 롤링**. USD 대형주 `3018B`→`3.0T`, KRW 소형주 `0.5조`→`5000억`. 호출: `fmtMktCap(price*sharesOut*1e6, cur)`. 계산값 불변, 표시만 정리.
7. (이전) 일지 3단 재구성, 사이드바 인박스 배지(안읽음 숫자 앰버), 전략 스트립+툴팁, 현황 헤드라인(보유/확인필요), 인박스 플랜 열기 우상단 통일.

---

## 5. 남은 작업 → **실앱 빌드 (Claude Code)**
- 디자인/프로토타입은 사실상 마감. 다음은 **실제 앱 구현**이고, 진입점은 엔지니어링 핸드오프 3종이다:
  - **`app/ARCHITECTURE.md`** — 스택(Supabase+Next+Expo 모노레포)·mock→real 이음새 맵·빌드 마일스톤(1~9). **여기부터 읽어라.**
  - **`app/DATA_MODEL.md`** — Postgres DDL + enum + RLS. 마이그레이션 생성용.
  - **`app/API.md`** — 엔드포인트 계약 + 실시간 채널 + provider 어댑터 정규화.
- MVP 커트라인 = 마일스톤 1~5(로그인→자기 플랜 DB 저장→실데이터 재무+준실시간 시세). 6~9(실시간 WS·모바일·구독)은 증분.
- provider 무료 조합: KIS(KR 시세)·DART(KR 재무)·Finnhub(US 시세)·EDGAR(US 재무)·Frankfurter(FX). 가격/한도는 연동 직전 재확인.·미 재무제표 스키마 분기(K-IFRS vs US-GAAP, `plan.cur`로 판정), mock FX(`KEYSTONE_FX`) → 라이브 환율 교체 지점. **실제 네트워크 연결만 남음.** 백엔드 붙이기 전 "원형 완성"이 목표였고 여기 도달함.

### 선택적(미용) — 안 해도 정상 동작
- 없음(이번 세션에 시총 단위 tiering까지 닫음). 새로 발견되면 여기에 추가.

### ⚠️ HANDOFF 읽을 때 주의 — 아래는 **이미 완료**됨 (예전 문서에 "미구현"으로 잘못 남아 있던 것들)
- **토스트 알림**: App.jsx에 구현(`fire`, 체결 상태전이 토스트, 세션 첫 안읽음 알림). ✅
- **스크리너**: P4Views.jsx `ScreenerView` — 통과/관찰/탈락, 히트맵/보드/리스트, 섹터·재무 필터. ✅
- **전략별 현황 막대 일관성**: 값 바닥정렬로 통일(StrategyStrip). ✅
- **시나리오 괴리 툴팁**: 부호·색·단어로 방향 못박음 — 의도적으로 현 상태 유지(잘 됨). ✅
- **목표가/목표수익률**: 전략 칩 + 호버 편집 구현. ✅
- **달러 단위 / 경 단위 / 메모 스크롤**: 전부 처리됨(아래 6번 사실 확인 참고). ✅

---

## 6. 검증된 사실 (재확인/회귀 방지용)
- **통화 단위**: 라이브 앱의 모든 통화 포맷터는 USD→`$/$B/$T/$M/B`, KRW→`억/조/경`으로 분기. **USD에서 억/조가 새는 곳 없음**(골시크 `krwAbbr`도 `!isUs` 가드). grep에 뜨는 억/조는 옛 `.dc.html` 프로토타입이거나 가드된 KRW 분기.
- **경 단위**: `capUnits`(밸류에이션 `pickU`)와 `fmtMktCap`에 들어 있음(1e16). 개별 종목 시총은 1경(=10,000조)에 안 닿음(최대 ~5,000조=0.5경)이라 단순 표시에선 거의 안 보이지만 로직은 있음.
- **메모 스크롤**: limit=80 초기 cap + 날짜 그룹 + 더보기(+80) + 리더 스레드 8개 cap = "수백 개 무한 스크롤" 해소됨.
- **체결가 통화**: 종목 네이티브 통화 고정(현대차=₩, Apple=$). 표시통화 설정과 무관(체결은 실제 거래 기록이라 네이티브 입력). ADR 등 예외는 향후 종목 메타에 거래소/통화 필드로 대응 예정.

---

## 7. 검증 루틴
- 편집 → 버전 범프 → `show_html` → `eval_js`로 DOM 검증(호버 툴팁은 html-to-image 캡처가 hover를 못 잡으니 `eval_js`로 .gauge-tip-fixed/.sc-axis-tip 존재·텍스트·좌표 확인) → `ready_for_verification`.
- 미리보기 화면이 좁아 잘려 보이는 건 정상(실제 잘림 아님). 스크린샷 도구는 내부 스크롤을 못 잡으니 좌표 검증은 `eval_js`로.
- 콘솔 에러 0 유지가 기준. DS 린트 경고(App.jsx px/hex ~21건)는 무시.


---

## 8. 이번 세션 — 디자인 폴리싱 + IA 정리

프로토타입은 이미 마감 상태였고, 이 세션은 **디자인 다듬기 + 정보구조(IA) 정리**에 집중했다. 코어 데이터/로직 변경 없음(순수 UI·재사용).

### 새 시각화
- **밸류에이션 다방법 적정가 밴드 차트**(`ValFairBandChart`, DetailView, valuation_view에서 마운트): PER·PBR·PSR·EV가 각각 함의하는 적정가를 **시계열**로 겹침. 밴드=방법 간 min→max, 파란선=평균, 흰선=시장가. 각 방법 대표 배수 = 자기 **5년 중앙값**(현재 배수를 쓰면 밴드가 '지금'에서 한 점으로 붕괴). 표시 팝오버로 밴드/평균/시장가 + 방법별 선(실선·점선·굵게) 토글, `keystone-valband-prefs` 저장. GapTab 스플라인/`gap-tip`/`gap-legend` 재사용. 기존 단일방법 백분위 밴드와 별개(위에 추가).
- **종목 월별 지표 히트맵**(`SeasonalityHeatmap`, SecurityView 개요 상단): 연(행)×월(열), 지표 피커 2모드 — 흐름/계절성(수익률·상대강도·변동성; 월 평균/중앙값 푸터, 적·녹 램프) / 밸류·이력(PER·PBR·PSR; 셀=종목 자기 5년 백분위 → 싸다=녹/비싸다=적, "현재·5년 범위" 푸터). 값은 **티커 시드 deterministic**(`seasBuild`) → 실데이터 교체 지점.

### 필터/표시 (전 리스트 = 필터)
- **시나리오 모니터**: 종목·케이스(상단/중간/하단)·상태·출처(플랜/애드혹) 필터 + 종목별/케이스별/상태별 그룹.
- **관심종목**: 시장(KR/US)·섹터·플랜유무·등락 필터 + 정렬·그룹(`keystone-watch-view`). **보관함**은 검색+`matchesFilters` 재사용, **휴지통은 필터 없음**.
- 공유 `FilterPanel`을 `cats`-드리븐으로 일반화 + **옵션 카운트·0값 흐림**(opt-in `n`). 시장=한국/미국만(옛 거래소 폐기), 섹터=전체 **GICS 11개**(관심종목이 스크리너와 동일).
- **표시(Display) 팝오버는 실제 리스트 뷰에만** 노출(재무제표·시뮬·인사이트에서 제거).

### IA 정리 — 종목 리서치 통합
- 독립 도구 **재무제표·시뮬레이터 은퇴** → 단일 **종목 리서치**(최근 본 종목 + 피커 → 종목 상세; 개요·재무제표·투자지표·밸류에이션 탭 이미 보유). `SecurityPicker`·`getSecRecents`·`sec-planrow` 재사용, 신규 UI 0. 사이드바 저장키 `keystone-sidebar-v1→v2` 마이그레이션. 사이드바 도구셋 = 관심종목·인사이트·종목 리서치·시나리오·스크리너·보관함·휴지통.
- **요약 스탯 스트립**(Dashboard `DashStat` 재사용): 관심종목(종목·상승·하락·평균등락·한국/미국)·시나리오(추적·근접·돌파·이탈·평균괴리) 상단, 각 스탯 호버 드릴다운 툴팁. 스크리너는 기존 통과/관찰/탈락 칩 유지(중복 방지).

### 인박스 — 스누즈 전면 제거
- "나중에(스누즈)"를 실시간 재등장 스누즈 + 나중에 탭까지 구현했다가 **전면 제거**. 플랜·시나리오 중심 앱에서 "알림 미루기"는 부적합 — triage = **처리완료·음소거·기록**(액션은 매수/매도). 관련 상태·헬퍼·유저 코치마크·문서까지 정리. 탭 = 전체/안읽음.

### 인사이트/폴리싱
- 전략·관점 성과 산점도: **겹침 회피 레이아웃**(2D relaxation) + **드릴다운 툴팁**(그 점 구성 플랜 목록). 관점 성과 부제 정직화(프레임워크 진리값 아닌 *의사결정 귀속* + 표본수). 시나리오 적중률 ko 라벨 = 상단/중간/하단.
- 갭 차트 툴팁: 추정가↔시장가 이중선 → 단일선, 최근범위 현재가 중앙 정렬, 공용 `.ind-q` "?" 일관성. 마커 팝오버 = 토글+캡션.
- 스크리너 사분면: 리치 호버 툴팁(국기+종목명·등급·품질·적정가대비) + 겹침 회피. 전략 미리보기 "적용 대상" → 펼침 플랜 리스트(40 cap + 더보기). 종목 상세 시나리오 행 → 해당 플랜 시나리오 탭 클릭 이동. 일지·인박스 리더 넓은 화면 중앙 정렬. "기록" → "새 기록".
