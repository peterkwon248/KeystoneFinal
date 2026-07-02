# Handoff: Keystone — 밸류에이션 투자 트래킹 앱

## Overview
**Keystone** is a dark-first, bilingual (한국어 / English) **investment tracking app** for Korean + US equities. It is *not* a brokerage — it does not place orders. It is a thinking/journaling/triage tool: the user keeps **plans** (one investment thesis per ticker), tracks each plan against **price scenarios** and an **execution strategy** (e.g. 무한매수법, 그리드 매매, 모멘텀), triages rule-fired **alerts** in an inbox, and keeps an investment **journal**. It is modeled on the **Vector design system** (a dark, dense, keyboard-driven Linear-style issue-tracker aesthetic), repurposed for investing.

The current artifact is a **fully working prototype** (real React components, real CSS tokens, real derived business logic) that runs in the browser with no backend — all data is seed data in `source/data.jsx`, persistence is `localStorage`. The goal of this handoff is to **recreate it faithfully in a production environment** (build tooling + real persistence + real market-data APIs).

> **⚙️ Building the real app? Read the engineering-handoff set (in this package root):**
> - **`ARCHITECTURE.md`** — stack (Supabase + Next.js + Expo/RN monorepo), mock→real seam map, provider choices (free-first), realtime fan-out, build milestones 1–9. **Start here.**
> - **`DATA_MODEL.md`** — concrete Postgres DDL + enums + RLS policies (migration-ready).
> - **`API.md`** — endpoint contracts (quote/ohlc/fundamentals/fx/search), realtime channel, adapter normalization.
> - **`HANDOFF.md`** — design/build history log.
>
> This README (below) is the **design** handoff — how to recreate the prototype pixel-for-pixel. The three docs above are the **engineering** handoff — how to turn it into a multi-user SaaS. Note: the standalone **Statements** and **Simulator** tools were later consolidated into a single **Research (종목 리서치)** entry point that opens the security detail (which already carries 개요·재무제표·투자지표·밸류에이션 tabs); the sidebar tool set is now 관심종목 · 인사이트 · 종목 리서치 · 시나리오 · 스크리너 · 보관함 · 휴지통.

## Reference screenshots (`screens/`)
These are the **exact target screens** — the real app must match these pixel-for-pixel (dark theme, Korean default). Each is a high-res capture of the working prototype:
- **`screens/01-inbox.png`** — Inbox triage: notification list + reader with ScenarioGauge + strategy card (그리드 매매, 박스권 격자, 37% 밴드 위치).
- **`screens/02-journal.png`** — Journal: note list + reader with strategy badge (무한매수법), "기록 시점 → 현재" delta, ScenarioGauge + position card.
- **`screens/03-plans.png`** — Plans list grouped by status (관찰 / 실행중), with sparkline + ScenarioGauge per row.
- **`screens/04-plan-detail.png`** — Plan detail: status/framework/strategy pickers, headline stats (현재가/평단가/수익률/평가손익/진행), tabbed sub-views, scenario gap (+10% 저평가).
- **`screens/05-strategy-editor.png`** — Strategy editor (read-only preset): overview with the corrected 그리드 매매 description.
- **`screens/06-inbox-closeout.png`** — Inbox reader for a **closed** plan: closeout card (realized +20.4% / +$3,040, invested / bought / held) instead of a live strategy card.

These screenshots show layout, density, color, and spacing — but they predate a large batch of work (see the ⚠️ note below). **When a screenshot disagrees with the live prototype in `source/`, the live prototype wins** (it is current; several screens are older captures). Use the screenshots for the visual *language*; use `source/` (open `Keystone.html`) for the current *state*.

> ⚠️ **Newer than these captures (see prose + live prototype):** the valuation multi-method fair-value band chart; the security monthly-metric heatmap; the cross-view filter/display popovers (Scenarios / Watchlist / Archive) with GICS sector + KR/US market axes; the **종목 리서치 (Research)** consolidation that retired the standalone Statements + Simulator tools; the summary **stat strips** on Watchlist + Scenarios; and the inbox **snooze removal** (triage is now 처리완료 · 음소거 · 기록 only, tabs 전체/안읽음). The `06-inbox-closeout` etc. inbox captures still show an older triage bar with a 나중에 (snooze) button — that button no longer exists.

## About the Design Files
The files in `source/` are **design references implemented in HTML/JSX** — a high-fidelity prototype showing the intended look, copy, and behavior. They are **not** meant to be shipped as-is:

- They load React, ReactDOM, and Babel from a CDN and transpile `.jsx` **in the browser at runtime** (`<script type="text/babel">`). A real app must move this to a build step (Vite + React, Next.js, or the team's existing stack).
- All state lives in module-level JS objects + `localStorage`. A real app must replace this with a real data layer (DB/API).
- Some values are **synthesized for the demo** (see "Synthesized data" below) and must be replaced with real data.

**The task:** recreate these screens **pixel-for-pixel** in the target codebase using its established framework and patterns. The visual layer (every color, size, spacing, interaction) should be reproduced exactly; the **data layer** is what changes (seed objects → API/DB). If the project has no codebase yet, React + TypeScript + Vite is the most natural target (the prototype is already React).

## Fidelity
**High-fidelity (hifi).** These are pixel-perfect mockups with final colors, typography, spacing, copy, and interactions. The CSS in `source/colors_and_type.css` (design tokens) and `source/reticle.css` (app styles, ~2700 lines) is production-quality and can be carried over almost verbatim. Recreate the UI pixel-perfectly; do not re-interpret the styling.

---

## Core concept model (read this first — it is the soul of the app)

Three axes are **independent**. Conflating them is the #1 source of bugs.

1. **Plan** — one investment case for one ticker. Array `PLANS[]` in `data.jsx`, ids like `PLN-001`. Key fields: `ticker`, `tickerName{en,ko}`, `cur` ("KRW"|"USD"), `status`, `portfolioId`, `strategyId` (= **관점/valuation framework**, confusingly named), `execId` (= **실제 실행 전략**), `scenarios[]`, `avgPrice`, `totalShares`, `totalInvested`, `currentPrice`, `divisions`, `round`, `notes[]`, `executions[]`, `createdAt`, `closedAt`.
2. **Scenario (시나리오)** — a **price judgment**, independent of strategy. Each plan has 3: `하단 / 중간 / 상단` (Bear / Base / Bull) target prices. Visualized as a horizontal gauge + a "괴리 (gap)" readout (current price vs the chosen target). Computed by `gaugeData(plan)`.
3. **Execution strategy (전략)** — *how* you execute. Array `EXEC_STRATEGIES[]`, referenced by `plan.execId`. Types: 무한매수법(ex1), 정액분할매수(ex2), 밸류애버리징(ex3), 그리드 매매(ex4), 밸류리밸런싱(ex5), 6:4 자산배분(ex6), 모멘텀(ex7). Each has `fields[]` (divisions, loc_pct, tp_pct, upper/lower, grids, stop…) and when/then `rules`. Round count, avg cost, next-buy price = strategy territory. **The next-signal logic per strategy lives in `planExecState(plan)` (data.jsx) — one normalized function the UI just renders.**
4. **Framework / 관점 (valuation schema)** — referenced by `plan.strategyId` (misnamed). Array `STRATEGIES[]`, cat = multiple / intrinsic / asset. Used in the financial-statement & metric screens.

⚠️ **The recurring bug:** treating `plan.strategyId` (관점) as the strategy. The real execution strategy is **always `plan.execId` → `EXEC_STRATEGIES`**.

---

## Screens / Views

The app shell (`source/App.jsx`) is a fixed left **sidebar** + a top **tab bar / view header** + a scrollable content area. `view` state routes between the screens below. Theme (light/dark) and language (ko/en) are global state in `App.jsx`; inbox "read" state is also owned there so the sidebar badge stays in sync.

### 1. Sidebar (`source/Sidebar.jsx`)
- **Layout:** fixed `232px` rail, `--bg-sidebar`, scrolls independently. Workspace switcher at top, then nav sections: 도구 (Inbox / 일지 / 플랜), 전략 (the EXEC_STRATEGIES), 관점 (frameworks), 포트폴리오.
- **Inbox unread badge:** amber number only (`--r-base`, semibold), hidden when 0. In **light mode** the badge uses a darker gold (`color-mix(in srgb, var(--r-base) 82%, #7a4a00)`) so it stays legible on white — do not use the raw amber in light mode.
- Nav item: 40px row, hover = `--bg-hover`, active = `--bg-active` pill + `--fg`.

### 2. Inbox (`source/Inbox.jsx`) — the triage surface
- **Layout:** 3-pane master/detail — notification list (left) │ reader (center) │ read-only props sidebar (right).
- **Forward-looking / present-tense.** Each rule that fired becomes an actionable notification.
- **Reader center** shows: subject meta line (`AAPL · Microsoft 클라우드 · 무한매수법 · 오늘 09:01` — ticker, plan name, **strategy badge**, relative time), the **ScenarioGauge**, the **strategy card** (`StrategyStrip` in `icons.jsx`, driven by `planExecState`), then the action + triage bars.
  - For **closed plans**: no strategy card (a live next-signal is meaningless). Instead a **closeout card** (realized P/L hero + invested / bought / held). The strategy name still appears as a meta badge.
- **Actions (bottom of reader):**
  - **매수 체결 입력 (Record buy):** an *editable fill-entry form* — fill price + qty are pre-filled (current price, computed unit qty) and the total auto-computes; both are editable. Hint reads "예상 …" to mark it an estimate. Footnote: "실제 체결 내역을 입력하세요 — 위 값은 추정치입니다." On confirm, records the *user's actual* fill. Enter = record, Esc = cancel. (This editability is deliberate — there is no broker sync, so the app must never write a fixed estimate as fact.)
  - **매도 체결 입력 (Record sell):** symmetric editable form. Records a partial sell → reduces shares, **plan stays active** (strategy keeps running). When shares hit 0, `addExecution` auto-moves status to `closing`. A secondary **ghost** "청산중으로 전환" button moves to closing without a specific fill.
- **Triage bar:** 처리완료 (Resolve), 이 알림 음소거 (Mute), 기록 남기기 (Log). These are the surface's true verbs (resolve ≠ read). (A snooze/"나중에" defer action was intentionally removed — a plan-centric app acts, mutes, or logs a decision; deferring an alert to later has no meaning here.)
  - **Log:** opens a box with 실행함 / 건너뜀 quick-chips + free text → writes a journal note to the plan (prefixed with the alert name, with a price snapshot). Critically captures *why you skipped* — the non-action that's otherwise lost.
  - Triaged items collapse into a "처리됨" footer with Restore / Unmute. Every triage action shows an **undo snackbar** (6s).
- **State:** read / resolved / muted sets persisted in `localStorage` keys `keystone-inbox-read-v1` / `-resolved-v1` / `-muted-v1`. A notification is "active" when none of those contain it and its rule isn't muted. `inboxUnreadCount(plans, lang)` feeds the sidebar badge.

### 3. Journal / 일지 (`source/Journal.jsx`) — the reflective surface
- **Layout:** 3-pane master/detail mirroring the inbox — note list │ reader + subject context │ summary rail. Compose mode (default) shows a write box in the center with a searchable subject (plan/security) dropdown.
- **Backward-looking / past-tense.** Deliberately does **NOT** show the live strategy next-signal card (that's a present-tense triage datum). Instead shows **"since this note":** `기록 시점 가격 → 현재 가격 (+/−%)` — a journal-native delta.
- **Reader:** subject head, meta line (`005930 · 무한매수법 · 6월 22일`, with `· 수정됨` if edited), the note text (inline-editable — hover → pencil; ⌘/Ctrl+Enter save, Esc cancel; editing preserves `when` and price snapshot, only text changes), the "since this note" track, then context: **ScenarioGauge** + a **position card** (P/L hero + avg / price / value / cost). Below: a thread of the same subject's other notes, each tagged with its write-time price.
- Note model: `{ id, when, text, price (snapshot at write), editedAt?, fromAlert? }`. Every new note (from Journal, Security detail, Plan detail, or an inbox Log) stamps the subject's current price into `price`.

### 4. Plans — Dashboard / List / Board / Timeline
- **Dashboard (`Dashboard.jsx`)** — "현황" display mode: headline stats (진행중 / 검토 / 평균 수익률 / 보유 / 확인 필요) with per-ticker hover tooltips, an action queue, and a portfolio mini-heatmap.
- **List (`ListView.jsx`)** / **Board + Timeline (`BoardTimeline.jsx`)** — plans grouped by status, with the strategy mechanism diagram (`strat_diagram.js`) as a status bar.

### 5. Plan detail (`source/DetailView.jsx`)
- Right-hand detail bar + tabbed sub-views. `FIELD_TIPS` (hover definitions for fields) live here. Notes section is inline-editable + records price snapshot on add (`price: plan.currentPrice`).
- Sub-tabs include Scenarios (`P5Scenarios.jsx` + `trajectory.jsx` gap/tracking chart), Valuation (`valuation*.jsx`), Future test / simulator (`futuretest*.jsx`), Ledger/executions (`ledger.jsx`).
- **Valuation tab — multi-method fair-value band chart** (`ValFairBandChart` in `DetailView.jsx`, mounted from `valuation_view.jsx`): overlays the fair value each method (PER · PBR · PSR · EV) implies **over time** — band = min→max across methods, blue line = average, white line = market price. Each method's representative multiple = its own **5-yr median** (using the current multiple would collapse the band to a point at "now"). A 표시 popover toggles band / average / price + each method line (line color matches the hover-tooltip dots); prefs persist to `keystone-valband-prefs`. Reuses GapTab's spline / `gap-tip` / `gap-legend` visual language. Distinct from — and shown above — the existing historical single-method percentile band.

### 6. Security view (`source/SecurityView.jsx`, `securities.jsx`)
- Per-security screen: financial statements + investment metrics (K-IFRS vs US-GAAP schema difference is structured for), with the selected 관점 applied. Has its own journal (`s.journal`, separate store from plan notes).
- **Monthly metric heatmap** (`SeasonalityHeatmap`, top of the overview tab): year(row) × month(col) grid with a **metric picker** in the title. Two adaptive modes — **flow / seasonal** (return · relative strength · volatility; adds month avg/median footer rows, red/green ± ramp) and **valuation / history** (PER · PBR · PSR; each cell colored by the value's **percentile vs the security's own 5-yr range** → cheap = green / rich = red, with a "current · 5-yr range" footer instead of avg rows). Color uses the ValSensitivity `tone()` ramp (muted, Vector tone). Values are **ticker-seeded deterministic** (`seasBuild`) — replace with real history. Month-header hover → avg / median / positive-years / best / worst tooltip. Legend swatches mix with the surface color (opaque chips) so the ramp reads on the dark base.

### 7. Strategy / framework editor (`source/StrategyEditor.jsx`)
- CRUD for strategy/framework fields, when/then rules, grade rules, with a live preview diagram. Built-in presets are **read-only** ("읽기 전용 · 전략·관점은 고정된 카탈로그입니다 (수익화·API 연동 후 편집 가능)").

### 8. Filtering & Display (cross-view) — `source/Panels.jsx`, `source/P4Views.jsx`, `source/App.jsx`
Follows the Linear principle **"every list is filterable"**: the toolbar **필터 (list-filter icon)** + **표시 (sliders icon)** popovers appear on every list surface. The popover open-state (`panel`) and anchor (`filterAnchor`, set by `openFilterAt` from the button's bounding rect) live in `App.jsx`, but each list view renders its own popover **content** (the screener pattern) so filters never bleed between views.

**Shared `FilterPanel` (`Panels.jsx`)** renders every filter popover. It takes a `cats` prop — an array of axes `{ type, label, axis (Lucide icon name), options:[{value,label,icon}] }` (or grouped `{groups, head, headerType}` as the plans strategy axis uses). If `cats` is omitted it falls back to `filterCats(t,lang)` (the plan axes). Each axis is a hover-flyout; any axis with ≥8 options gets an inline search box. Toggling calls `onToggle(type,value)`; active values render as removable chips in a `.filterbar` (`.filter-chip` / `.fc-seg` / `.fc-key` / `.fc-x`) with a 초기화 (clear) link. **When adding a new filterable list, build a `cats` array + a local match function and reuse `FilterPanel` — do not write a new popover.**

Per-view axes & controls:
- **Plans** (`App.jsx` + shared `matchesFilters`): status · portfolio · strategy (관점 categories + items) · scenario-status · return (profit/loss) · gap · dwell. Display = view (list/board/timeline/dashboard) + group + order + properties. Active filters can be **saved as a View** (`savedViews`).
- **Scenarios monitor** (`ScenariosMonitor`): security(ticker) · case (Bull/Base/Bear, from `sc.label.en`) · scenario-status · source (plan/adhoc). Display = group by status / security / case / none. This is what solves "show only 현대차's scenarios." Filter state is component-local (ephemeral); grouping persists to `keystone-scen-group`.
- **Watchlist** (`WatchlistView`): market (KR/US) · sector (**full GICS taxonomy** via `GICS_SECTORS`, same source as the screener — the shared `FilterPanel` now renders per-option counts + dims empty sectors when an option carries `n`; grouping keys on `s.gics || s.sector`) · plans (has / watch-only) · change (up/down). Display = sort (default/change/name) + group (none/market/sector), persisted to `keystone-watch-view`. Price sort is intentionally omitted — KRW/USD prices aren't comparable. Carries a summary stat strip (종목 · 상승 · 하락 · 평균 등락 · 한국/미국) with per-stat hover tooltips, reusing Dashboard's `DashStat`.
- **Archive** (`ArchiveView`): a search box (name/ticker/id) + the shared `matchesFilters` reused **directly** (portfolio · strategy · return — archive items are closed plans) + sort (recent/return/name).
- **Trash**: intentionally **no filter** (transient, auto-purge).

### Shared components (`source/icons.jsx`)
- `Lic` (Lucide icon wrapper), `Flag` (market flag), `StatusIcon`, **`ScenarioGauge`** (the price-scenario bar), **`StrategyStrip`** (the strategy card: hero stat + progress bar + stat cells, each label with a hover **definition tooltip** via `metricDef`).

---

## Interactions & Behavior

- **Status automation (in `addExecution`, App.jsx):** (1) a *buy* on a research/planning plan → auto `active`; (2) a *sell* that brings shares to 0 on an active/paused plan → auto `closing`. Everything else holds. `closing → closed` is **manual** (user confirms the final close — realized-P/L settlement is involved). No other status transitions are automatic.
- **Buy/Sell entry:** editable forms, not one-click. Total = price × qty live. Validation: price > 0 and qty > 0 to enable record.
- **Inline note editing** (Journal + Detail + Security): hover reveals a pencil; edit preserves `when` + `price`, sets `editedAt`; shows "· 수정됨".
- **Dropdowns (`MiniDropdown` in DetailView.jsx):** the panel is `position: fixed`, anchored to the trigger via `getBoundingClientRect`, re-placed on scroll/resize, and clamped to the viewport — so it overlays siblings and is never clipped by an `overflow` ancestor. The search box focuses with `focus({ preventScroll: true })` so opening it never shifts the pane.
- **Transitions:** ~110–120ms ease on background/border/opacity. No bounces, no large slides. Hover lightens via translucent-white overlay; press = `translateY(0.5px)`; focus = 1px accent border + 3px `--accent-soft` ring.
- **Undo:** triage actions and recorded fills flash a 6s undo snackbar.

## State Management
- **Global (App.jsx):** `view`, `theme` (light|dark, persisted `keystone-theme-v1`), `lang` (ko|en, persisted `keystone-lang-v1`), display currency, inbox read set, connection (live/reconnect) state, `plans` (with `patchPlan`, `addExecution`, `setStatus`).
- **Inbox triage:** localStorage sets (read/resolved/muted), see Inbox section.
- **Per-screen UI state:** selection, compose mode, edit mode, etc. are local React state.
- **Data fetching (to build):** none yet. Plan/security/price data must come from a real source — see Synthesized data + Assets.

## Design Tokens

All tokens are in `source/colors_and_type.css` (Vector base) and the `:root` block of `source/reticle.css` (app lifecycle/scenario colors). Carry these over verbatim. Both light and dark themes are defined (`:root` = dark, `:root[data-theme="light"]` = light).

**Brand / accent**
- `--accent #4C8DFF` (azure — primary actions, links, active), `--accent-hover #6AA0FF`, `--accent-press #3D7BE6`, `--accent-soft` (focus ring).

**Dark surfaces / text**
- `--bg-app #08090A`, `--bg-sidebar #0B0C0D`, `--bg-subtle #0F1011`, `--bg-elevated #18191B`, `--bg-elevated-2 #202123`.
- `--bg-hover rgba(255,255,255,.045)`, `--bg-active rgba(255,255,255,.075)`. Borders `rgba(255,255,255,.07–.14)`.
- Text ramp: `--fg #F7F8F8` → `--fg-2 #C9CCD1` → `--fg-3 #8A8F98` → `--fg-4 #62666D`.

**Light surfaces / text**
- `--bg-app #FFFFFF`, `--bg-sidebar #F6F7F8`, `--bg-subtle #F0F1F3`, `--bg-elevated #FFFFFF`, `--bg-elevated-2 #F3F4F6`.
- Text ramp: `--fg #16171A` → `--fg-2 #3C3F44` → `--fg-3 #6B7079` → `--fg-4 #9A9FA7`.

**Semantic (lifecycle + scenario + P/L)** — from reticle.css
- Lifecycle: `--r-research #8A8F98` (관찰중; light `#6B7079`), `--r-planning #F2C94C`, `--r-active #4C8DFF` (live), `--r-paused #BB6BD9`, `--r-closing #F2994A`, `--r-closed #4CB782`.
- Scenario / P/L: `--r-bull / --pos #4CB782` (gain green), `--r-base #F2C94C` (amber), `--r-bear / --neg #EB5757` (loss red).

**Type** — Pretendard (primary, Latin+Hangul), Inter fallback; weights 400/500/600/700, **500 is the workhorse**, 600 for titles/active/buttons.
- `--font-sans: "Pretendard Variable", Pretendard, "Inter", …`. Numbers use the same sans with tabular figures (Linear-style).
- Sizes: `--fs-micro 11px` (timestamps/counts), `--fs-meta 12px`, `--fs-body 13px` (DEFAULT — nav/rows/menus), `--fs-base 14px` (titles), `--fs-h3 15px`, plus larger headings. Slight negative letter-spacing on large headings.
- Semantic classes: `.v-h1/.v-h2/.v-h3`, `.v-title`, `.v-body`, `.v-ui`, `.v-meta`, `.v-micro`, `.v-mono`, `.v-caption`.

**Radii / spacing / elevation**
- Radii: `--r-xs 4px` (chips), `--r-sm 6px` (buttons/inputs/rows), `--r-md 8px` (cards/menus), `--r-lg 12px` (modals), `--r-pill 999px`.
- 4px base grid. Rows ~40px, small controls 28px, buttons 32px. Sidebar 232px, tab bar ~36px, view header ~44px.
- Elevation: flat surfaces + hairline borders; only floating layers get `--shadow-card / --shadow-popover / --shadow-modal`. No gradients, no images, no illustrations in chrome (only line-art empty-state glyphs).

**Primitives (colors_and_type.css):** `.v-btn`, `.v-chip`, `.v-input`, `.v-menu` / `.v-menu-item` (with right-aligned dimmed `.shortcut`).

## Numbers, currency & i18n
- Formatters in `data.jsx`: `fmtCompact(n, cur)` and `fmtMoney(n, cur)`. Currency is `"KRW"` or `"USD"`; mock FX = **1380**.
- **Korean is the default language.** Every user-facing string must exist in both `en` and `ko` (the i18n table `T` in `data.jsx`). Watch for English leaking through (past regressions: "Weekly", strategy category labels). New copy → add both languages.
- Date display: `fmtDate` / `fmtRel` in `data.jsx`. Bare "Mon D" dates have **no year** in the data, so year is **inferred** (most recent past occurrence relative to the app's "today" anchor `KS_REF = {y:2026, mo:6, d:26}`) and shown **only when it isn't the current year** (so a carried-over close from last year reads "2025년 9월 2일", but this year reads "4월 8일"). `fmtRel` also handles "Today HH:MM", "Yesterday", "Mon D HH:MM", and relative "3d / 2h / 2mo / 1y". Replace the `KS_REF` anchor with the real current date in production.

## Copy / voice
Terse, functional, **sentence case everywhere**, no emoji in chrome, no exclamation marks. Labels are short noun/verb phrases. Counts are bare numbers next to a label. (Vector design-system voice.) Korean copy follows the same calm, terse register.

## Synthesized data (MUST replace with real data)
These are demo conveniences, deliberately added so the prototype demonstrates features before APIs exist. In production they should be **removed** and replaced with real values:
- **Journal write-time price** for seed notes without a `price` (function `jrWritePrice` in Journal.jsx): synthesized deterministically from the note id, clamped to the scenario band. Real `n.price` always wins.
- **Momentum recent-high** and other strategy inputs in `planExecState` (data.jsx) fall back to derived/synthesized values when the underlying series is absent.
- All `PLANS`, securities, financials, and `currentPrice` are seed data. Wire to real market-data + fundamentals APIs (the project anticipated DART / SEC EDGAR / Finnhub; K-IFRS vs US-GAAP schemas are structured for).

## Assets
- **Icons:** Lucide (loaded from CDN in the prototype). Status/priority/scenario marks are custom inline SVG in `icons.jsx`. In production, install `lucide-react` (or the team's icon lib) rather than the CDN global.
- **Fonts:** Pretendard (SIL OFL, ship-safe) + Inter fallback, imported via `@import` inside `colors_and_type.css`. Self-host in production.
- **No images / illustrations.** Only line-art glyphs for empty states. Avatars are solid-color rounded squares with initials.

## Files (in `source/`)
- **`Keystone.html`** — entry point. Shows the exact module load order (data → securities → … → App) and a **boot guard** (the in-browser Babel pipeline occasionally leaves `#root` empty; the guard polls for mount and self-reloads twice before showing a retry notice). Both the runtime-Babel approach and the boot guard go away in a real build.
- **`data.jsx`** — ALL data + i18n table `T` + formatters. `PLANS`, `EXEC_STRATEGIES`, `STRATEGIES`, sectors, securities, `planExecState`, `gaugeData`, `fmtCompact/fmtMoney/fmtDate/fmtRel`, `planReturn`. Start here.
- **`App.jsx`** — root, routing, global state, `addExecution` / `setStatus` / `patchPlan` (status automation lives here). Owns the filter/display `panel` open-state + `filterAnchor`, and gates the 필터 button per view.
- **`Sidebar.jsx`, `Chrome.jsx`** — shell (rail + tab bar / breadcrumb jump).
- **`Inbox.jsx`, `Journal.jsx`** — the two master/detail surfaces.
- **`Dashboard.jsx`, `ListView.jsx`, `BoardTimeline.jsx`, `DetailView.jsx`** — plan displays + detail.
- **`P5Scenarios.jsx`, `trajectory.jsx`** — scenarios + gap chart.
- **`StrategyEditor.jsx`, `strat_diagram.js`** — strategy/framework editor + mechanism diagram.
- **`valuation.jsx`, `valuation_view.jsx`, `futuretest*.jsx`** — valuation + simulator.
- **`securities.jsx`, `SecurityView.jsx`, `ledger.jsx`** — securities + executions.
- **`P4Views.jsx`** — Watchlist, Scenarios monitor, Archive, Trash, Screener, **Research browser** (종목 리서치 — recent + picker → opens security detail; replaced the retired standalone Statements + Simulator tools), Customize-sidebar modal. Watchlist & Scenarios monitor carry a **summary stat strip** at the top (reusing Dashboard's `DashStat`). Each list view owns its filter/sort/group state (see §8 Filtering & Display).
- **`Panels.jsx`** — shared `FilterPanel` (now `cats`-driven, reused by every list surface) + `DisplayPanel` + `matchesFilters` / `groupConfig` / `orderPlans` helpers.
- **`Insights.jsx`, `planinsights.jsx`** — insights + saved views.
- **`Auth.jsx`** — login / auth gate (loaded just before `App.jsx`).
- **`icons.jsx`** — shared icon + `ScenarioGauge` + `StrategyStrip`.
- **`colors_and_type.css`** — design tokens + semantic type/primitive classes.
- **`reticle.css`** — app styles (~2700 lines). Production-quality; carry over.

## Suggested build approach
1. Scaffold React + TypeScript + Vite (the prototype is already React 18).
2. Port `colors_and_type.css` + `reticle.css` verbatim (or convert tokens to CSS variables in your styling system — keep the exact values).
3. Convert each `.jsx` module into a real component/module; keep `planExecState`, `gaugeData`, formatters, and the status-automation rules **exactly** as the single source of truth for behavior.
4. Replace `data.jsx` seed objects + `localStorage` with your data layer; keep the same shapes (Plan/Scenario/EXEC_STRATEGIES/note/execution) so the UI is unchanged.
5. Replace synthesized fallbacks with real data; keep them only behind a "demo mode" flag if useful.
6. Install `lucide-react`, self-host Pretendard, drop the runtime Babel + boot guard.
