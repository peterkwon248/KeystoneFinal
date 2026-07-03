# Screens — reference captures (current state)

> Dark-theme, Korean UI. **The live prototype in `../source/` (open `Keystone.html`) is always the authority** — these are visual references. All are 924×540 viewport captures unless noted.

## Core surfaces
- `01-inbox.png` — Inbox triage (tabs 전체/안읽음; resolve · mute · log). No snooze.
- `02-journal.png` — Journal reader (master/detail, centered reader).
- `03-plans.png` — Plans **list** mode (grouped by status).
- `04-plan-detail.png` — Plan detail (header metrics + tabs 시나리오/전략/재무제표/투자지표/밸류에이션/인사이트/체결/활동).
- `05-strategy-editor.png` — Strategy editor.
- `06-inbox-closeout.png` — Inbox reader for a closed plan (closeout card).

## Plans — the 4 display modes (header segment: 리스트/보드/타임라인/현황)
- `07-plans-dashboard.png` — **현황 (Dashboard)** ← the view that was still a placeholder in the web port. Headline stat strip (진행중·검토·평균수익률·보유·확인필요) + portfolio heatmap (size=평가액, color=수익률, group by 시장/포트폴리오/섹터) + "지금 확인할 종목" action queue.
- `08-plans-board.png` — Board (kanban by status).
- `09-plans-timeline.png` — Timeline (Gantt-style).

## Tools & other views
- `10-scenarios-monitor.png` — Scenarios monitor + summary stat strip (추적·근접·돌파·이탈·평균괴리).
- `11-screener-list.png` / `12-screener-heatmap.png` / `13-screener-quadrant.png` — Screener 3 layouts (사분면 = quality × value, colored verdict dots, rich hover tooltip).
- `14-watchlist.png` — Watchlist + stat strip (종목·상승·하락·평균등락·한국/미국); GICS sector filter.
- `15-research.png` — 종목 리서치 (recent + picker → opens security detail). Replaced retired Statements + Simulator tools.
- `16-insights.png` — Insights (scenario accuracy, 관점/전략 performance scatter with drill-down, process health, win/loss).
- `17-archive.png` / `18-trash.png` — Archive (search + filters) / Trash.

## Security detail (tabs: 개요 / 재무제표 / 투자지표 / 밸류에이션)
- `19-security-overview.png` — Overview top: header + live price chart + metric cards.
- `19b-security-seasonality-heatmap.png` — **Monthly seasonality heatmap** (연×월, 평균/중앙 footer, 약세→강세 ramp). Component is current; this is a build-time capture so surrounding chrome may differ slightly.
- `21-security-indicators.png` — 투자지표 tab (card/gauge/heatmap/table/chart modes; PER/PBR/PSR… with grade chips). Shown on a plan's tab (identical component).
- `22-security-valuation-band.png` — **Multi-method fair-value band chart** (적정가 밴드·여러 방법: band = per-method min–max, blue = avg fair, white = price). Build-time capture.

## Not captured as stills (below the fold in an inner scroller — view live in `../source/`)
- **재무제표 (financials) tab** content — statements (손익계산서/재무상태표/현금흐름표), lens chip, chart/table toggle. Open a security → 재무제표 in the live prototype.
- Deep-scroll regions of the dashboard action queue and security overview scenario/plan/memo sections.

> Capture note: the environment's screenshot tool captures a fixed 924×540 viewport and does not follow inner-scroll, so below-fold sub-components are represented by build-time component captures (seasonality, valuation band) or deferred to the live prototype (financials tab).
