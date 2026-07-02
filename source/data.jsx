// data.jsx — Keystone entity model: Portfolios, Strategies, Trade Plans,
// Scenarios, Executions, Rules + EN/KR i18n dictionary.

// 전략·프레임워크는 수익화/API 연동 전까지 읽기 전용 카탈로그로 고정. true → 생성·편집·삭제 잠금.
const LIBRARY_LOCKED = true;

/* ============ i18n ============ */
const I18N = {
  en: {
    workspace: "kyunghoon's space", search: "Search", create: "New plan",
    inbox: "Inbox", journal: "Journal", myplans: "My plans", active: "Active",
    ibx_all: "All", ibx_unread: "Unread", ibx_markAll: "Mark all read", ibx_today: "Today", ibx_earlier: "Earlier", ibx_thisWeek: "This week",
    ibx_when: "When", ibx_then: "Then", ibx_recordBuy: "Record one buy", ibx_toClosing: "Move to Closing", ibx_openPlan: "Open plan", ibx_markRead: "Mark read", ibx_archive: "Archive",
    ibx_empty: "Inbox zero", ibx_emptySub: "No alerts to triage", ibx_pick: "Select an alert", ibx_pickSub: "Pick a notification to see context and actions", ibx_unitBuy: "Unit buy", ibx_done: "Handled",
    portfolios: "Portfolios", strategies: "Strategies", views: "Views",
    plans: "Plans", board: "Board", timeline: "Timeline", list: "List",
    allplans: "All plans", research_tab: "Research", closed_tab: "Closed",
    filter: "Filter", display: "Display", clear: "Clear", save: "Save",
    askReticle: "Ask Keystone", newPlan: "New plan", planName: "Plan name…",
    cancel: "Cancel", createPlan: "Create plan",
    // statuses
    s_research: "Research", s_planning: "Planning", s_active: "Active",
    s_paused: "Paused", s_closing: "Closing", s_closed: "Closed",
    // columns / metrics
    current: "Current", avg: "Avg cost", retRate: "Return", retAmt: "P/L", entry: "Entry", roundUnit: "rd",
    progress: "Fill", invested: "Invested", shares: "Shares", updated: "Updated",
    exitPrice: "Exit price", avgBuy: "Avg buy", realizedPL: "Realized P/L", realizedRet: "Realized return", holdPeriod: "Holding period",
    closeout: "Closeout", totalInvestedLab: "Total invested", totalBought: "Total bought", avgBuySell: "Avg buy→sell",
    tip_avgCost: "Average buy price — your cost basis (what you paid)", tip_exitPrice: "Average sell price (proceeds-weighted)",
    pb_avgImprove: "Cost basis", pb_remainPL: "Open P/L", pb_realizedSoFar: "Realized", pb_bought: "Bought",
    tip_current: "Current market price (live tick demo)", tip_retRate: "Unrealized return vs your avg cost", tip_retAmt: "Unrealized P/L in money", tip_progress: "Buy rounds filled / total divisions", tip_bought: "Total purchased — money and shares, all rounds",
    tip_tab_scenarios: "BEAR–NOW–BULL range with target & stop prices", tip_tab_valuation: "Reverse-engineer fair value, forward P/E from financials", tip_tab_executions: "Round-by-round fill ledger — running avg cost & P/L", tip_tab_rules: "WHEN→THEN automation (buy / exit triggers)", tip_tab_insights: "This plan's performance, avg-cost trend, rule history", tip_tab_activity: "Timeline of status changes, fills, and edits",
    composeMore: "Create more", memoPh: "Add thesis memo… (optional, becomes the Base scenario rationale)",
    pb_journey: "Trajectory", pb_peak: "Peak", pb_trough: "Trough", pb_mdd: "MDD", pb_mock: "mock",
    tip_pb_avgImprove: "Change in avg cost vs your first buy — negative means you averaged down", tip_pb_hold: "Days since your first buy", tip_pb_peak: "Highest unrealized return reached along the path", tip_pb_trough: "Lowest unrealized return reached", tip_pb_mdd: "Max drawdown — deepest drop from a peak", tip_pb_mock: "Derived from the mock price path — illustrative until live data is wired in", tip_pb_remain: "Unrealized P/L on the shares you still hold", tip_pb_realizedSoFar: "P/L already locked in from partial sells",
    // detail tabs
    scenarios: "Scenarios", executions: "Executions", rules: "Rules", activity: "Activity",
    // scenario
    scRange: "Scenario range", now: "Now", addScenario: "Add scenario", scNamePh: "Name", scThesisPh: "Add a thesis…", delete: "Delete", scEditHint: "Click to edit", scEditStatus: "Change status",
    scAuto: "Auto", scAutoTip: "Auto-generated default — 5y PER band × EPS (mock data). Edit the target or thesis to make it your own; the badge then disappears.",
    customFields: "Custom fields", cfNamePh: "Field name", add: "Add", cfType_text: "Text", cfType_number: "Number", cfType_percent: "Percent", cfType_date: "Date", cfType_select: "Select",
    target: "Target", expRet: "Exp. return", revPer: "Reverse PER", mktCap: "Mkt cap", expPL: "Exp. P/L",
    simulator: "Scenario simulator", simHint: "Enter a target price to reverse-engineer the implied metrics",
    targetPrice: "Target price", currentEps: "EPS (TTM)", sharesOut: "Shares out",
    impliedPer: "Implied PER", impliedCap: "Implied mkt cap", impliedRet: "Implied return",
    // future-test
    futureTest: "Future-test", ft_playout: "Strategy playout", ft_valuation: "Valuation",
    ftHint: "Set a what-if price scenario and watch how your strategy plays out over time.",
    ft_assumption: "Assumption · not a forecast", ft_scenario: "Price scenario", ft_params: "Strategy parameters",
    ft_maxdrop: "Max drawdown", ft_horizon: "Horizon", ft_budget: "Budget", ft_months: "mo",
    ft_troughT: "Trough timing", ft_peak: "Peak gain", ft_peakT: "Peak timing", ft_landing: "Ends at", ft_vol: "Volatility",
    ft_draw: "Draw", ft_drawHint: "Drag the dots to draw your own path", ft_drawNote: "Drag the dots on the chart up/down to shape the path.",
    ft_play: "Play", ft_pause: "Pause", ft_replay: "Replay",
    ft_finalAvg: "Final avg cost", ft_maxDeployed: "Max deployed", ft_rounds: "Buys",
    ft_mdd: "Max unreal. loss", ft_breakeven: "Breakeven", ft_return: "Scenario return", ft_finalValue: "End value",
    ft_divisions: "Divisions", ft_buyAmount: "Per buy", ft_tp: "Take-profit", ft_valueStep: "Value step",
    ft_gridLow: "Range low", ft_gridHigh: "Range high", ft_gridCount: "Grids", ft_interval: "Buy interval", ft_days: "d",
    ft_targetVal: "Target value", ft_bandLow: "Band low %", ft_bandHigh: "Band high %",
    // valuation tool
    val_tab: "Valuation",
    val_intro: "Enter financials and target multiples to derive EPS/BPS, forward PER/PBR/PSR, and a fair value. Forecast auto-fills from the growth rate, then push it to the scenario targets.",
    val_basic: "Basic", val_price: "Current price", val_shares: "Shares",
    val_currentFin: "Assumed financials", val_revenue: "Revenue", val_op: "Op. profit", val_net: "Net income", val_equity: "Equity",
    val_growth: "Growth rate", val_growthNote: "Rev/profit ×(1+g) · equity ×(1+0.8g)",
    val_computed: "Computed", val_curFwd: "(input → with growth)",
    val_opMargin: "Op. margin", val_netMargin: "Net margin", val_divYield: "Div. yield",
    val_fair: "Fair value & target multiples", val_tPer: "Target PER", val_tPbr: "Target PBR", val_tPsr: "Target PSR", val_tEv: "Target EV/EBITDA", val_tFcf: "Target EV/FCF", val_fairAvg: "Blended",
    val_dist: "Fair-value distribution", val_anchors: "Driving assumptions", val_sens: "Sensitivity", val_sens_g: "Growth", val_sens_m: "Target multiple", val_sensHint: "Upside vs. current price across growth × the primary slot's multiple",
    val_v_under: "Undervalued", val_v_fair: "Fairly valued", val_v_over: "Overvalued",
    scv_value: "Value", scv_quadrant: "Quadrant", scv_fairLab: "Fair", scv_gapLab: "vs fair", scv_qual: "Quality",
    scv_saved: "Saved screens", scv_saveCur: "Save current screen\u2026", scv_screenName: "Screen name", scv_noSaves: "No saved screens", scv_buyzone: "Cheap & strong", scv_overpriced: "Pricey", scv_valGapTip: "Current price vs fair value (EPS \u00d7 mid of the 5yr PER band). + = undervalued.",
    val_apply: "Apply to scenarios", val_applied: "Applied", val_applyNote: "Sets targets", val_applyTip: "Bull = the high-multiple slot · Base = the mid-multiple slot · Bear = the low-multiple slot, each applied 1:1 to its scenario. The spread between slots is your uncertainty range.",
    val_mode_per: "PER band", val_mode_pbr: "PBR band", val_mode_psr: "PSR band", val_mode_ev: "EV/EBITDA band", val_mode_fcf: "EV/FCF band", val_mode_por: "POR band", val_mode_mix: "Multiple mix",
    val_mixTip: "Click to include/exclude this method from the mix",
    val_methodHint: "Check several to blend (max / avg / min)", val_methodLast: "At least one method is required",
    val_tPor: "Target P/OP", val_tDivy: "Target div. yield", val_addSlot: "Add multiple", val_presetHint: "Pick the band metric — all three multiples use it",
    val_bandLo: "Bear", val_bandMid: "Base", val_bandHi: "Bull",
    val_applyTipBand: "Bull/Base/Bear = forward per-share value × each band multiple — the same logic as the auto-scenario PER band.",
    val_reverse: "Reverse calculators", val_revPer: "PER → price", val_revCap: "Market cap → price",
    val_tCapKr: "Target cap (T)", val_tCapUs: "Target cap ($B)", val_needEps: "EPS required", val_needShares: "Shares required",
    dash_tab: "Status", dash_value: "Value", dash_watching: "Watching", dash_open: "In progress", dash_pre: "Reviewing", dash_avgRet: "Avg return", dash_holdings: "Holdings", dash_actionq: "To check", dash_empty: "No plans to show", dash_mixed: "mixed currency", dash_fxNote: "Converted to KRW at ≈₩1,380/$",
    stratCat: "Category", newCat: "New", newPortfolio: "New portfolio",
    lg_cumQty: "Cum. qty", lg_cumInv: "Cum. invested", lg_dAvg: "Cost Δ", lg_pnlAt: "P&L at fill",
    tip_lg_round: "Execution sequence — buys and sells, oldest first", tip_lg_date: "Execution date", tip_lg_side: "Buy or sell", tip_lg_price: "Unit price of this fill", tip_lg_qty: "Shares in this fill (sells are negative)", tip_lg_amount: "Price × qty — this fill's cash", tip_lg_cumQty: "Shares held after this row", tip_lg_cumInv: "Capital deployed (buys) after this row", tip_lg_dAvg: "Change in avg cost vs the previous round — ▼ down means averaging down worked", tip_lg_pnlAt: "Buy: paper P&L vs current avg · Sell: realized P&L (at each fill's price)",
    scenStatus: "Scenario", scn_st_tracking: "Tracking", scn_st_approaching: "Approaching", scn_st_realized: "Realized", scn_st_invalidated: "Invalidated",
    saveView: "Save as view", viewSaved: "View saved", renameView: "Rename", deleteView: "Delete", viewsHint: "Set filters on the plan list, then “Save as view” — it will appear here and in the sidebar.", applyView: "Open",
    ftm_playout: "Playout", ftm_compare: "Compare", ftm_stress: "Path stress",
    cmp_hint: "Same assumed path · same budget · same costs — which strategy holds up? Buy & hold is the benchmark.",
    cmp_strategy: "Strategy", cmp_ret: "Return", cmp_trades: "Buys/sells", cmp_vsBH: "Excess return", cmp_best: "Best",
    cmp_note: "Return = P&L ÷ max deployed. MDD = worst unrealized dip vs max deployed.",
    cmp_pick: "Strategies to compare", cmp_signalNote: "This strategy type doesn't support playout yet", cmp_bhNote: "Benchmark — always included",
    tip_depth: "How far price dips below today's price at worst, during the period (for rally presets: max gain).",
    tip_trough: "WHEN the low (or peak) arrives within the period — decisive for staged-buying avg cost.",
    tip_landing: "Where the assumed path ENDS at the period's close, vs today. Independent of dip depth — e.g. dip -30% then recover to +6%, or stay at -11%.",
    tip_vol: "How jagged the path is. Smooth vs choppy — affects grid/rebalance trigger frequency.",
    tip_horizon: "Total length of the assumption. Switch units (D/M/Y) in the panel header.",
    tip_cost: "Commission + slippage applied to every fill price, per side.", tip_click: "Click to type a number",
    ft_tpPct: "Target return %", ft_slPct: "Stop-loss %", ft_exitAt: "Exit", ft_exitNone: "Not reached", ft_slFired: "Stopped",
    ft_buyGroup: "Buy setup", ft_exitGroup: "Exit rules", ft_tpName: "Take-profit", ft_slName: "Stop-loss",
    ft_maWin: "MA window", ft_trailPct: "Trailing stop %", ft_stopPct: "Hard stop %",
    ft_signalNote: "Exits are driven by the trailing/hard stop above — re-enters on the next up-cross.",
    ft_entries: "Entries", ft_trades: "Round-trips", ft_tradesUnit: "", ft_holding: "Holding",
    tip_tpsl: "Universal exit rule — sell everything when profit reaches the target (by return % or amount), or falls to the stop. 0 = off.",
    tip_p_budget: "Total capital allocated to this strategy over the whole run.",
    tip_p_maWin: "Moving-average window. Entry fires when price crosses ABOVE this MA; longer = slower, fewer signals.",
    tip_p_trailPct: "Trailing stop — exits when price falls this % from its PEAK since entry. The stop rises with the price, locking in gains.",
    tip_p_stopPct: "Hard stop — exits when price falls this % below the ENTRY price. A fixed floor (loss cut).",
    tip_p_divisions: "How many slices the budget is split into for staged buying.",
    tip_p_buyAmount: "Amount bought per scheduled buy.",
    tip_p_valueStep: "Target portfolio-value increase each period; buy/sell to hit it.",
    tip_p_gridLow: "Bottom of the grid range — buys ladder down to here.",
    tip_p_gridHigh: "Top of the grid range — sells ladder up to here.",
    tip_p_gridCount: "Number of grid levels between low and high.",
    tip_p_targetValue: "Target position value to hold; rebalance back to it when bands breach.",
    tip_p_bandLow: "Lower band (% of target) — buy back up when position value drops below it.",
    tip_p_bandHigh: "Upper band (% of target) — trim when position value exceeds it.",
    tip_range: "하단·중간·상단 = price HYPOTHESES (where price could go). SL/TP ticks = ACTION levels set by rules (where you act). They are deliberately separate.",
    tip_bull: "Optimistic hypothesis — where price could reach if the thesis plays out. A guess about the market, not an order level.",
    tip_base: "Base hypothesis — the most plausible target on your reasoning.",
    tip_bear: "Pessimistic hypothesis — where price could fall if risks materialize. NOT a stop-loss; that's an action level you set separately.",
    tip_actionDrag: "Drag to set this action level for the plan",
    str_hint: "One strategy, all six assumed paths — the question isn't “which path comes true” but “how path-sensitive is the strategy”.",
    str_path: "Path", str_end: "Path ends", ft_cost: "Cost % (per side)",
    tip_col_path: "An assumed price scenario — one of the six preset paths.",
    tip_col_end: "Where the path itself lands — final price vs today, before any strategy.",
    tip_col_strat: "Return if you traded this path with the selected strategy (P&L ÷ max deployed).",
    tip_col_mdd: "Max drawdown — the worst unrealized dip the strategy suffers along the path.",
    tip_col_bh: "Benchmark — buy once at the start and just hold to the end of the path.",
    tip_col_delta: "Strategy return − buy & hold return. Positive = the strategy beat doing nothing.",
    tip_col_trades: "Number of buy/sell fills the strategy executed on this path.",
    tip_col_deployed: "Peak capital actually invested at any point — the real money at risk.",
    tl_overlays: "Overlays", tl_ov_avg: "Avg-cost line", tl_ov_band: "P/L band", tl_ov_execs: "Buy/sell markers", tl_ov_trans: "Status transitions",
    scn_vrebound: "V-rebound", scn_lshape: "L-shaped", scn_stair: "Staircase down", scn_range: "Range-bound", scn_uptrend: "Uptrend", scn_spike: "Spike & fade",
    ft_market: "Assumed price", ft_avg: "Avg cost", ft_noPlayout: "Full playout for this strategy type isn't wired up yet — showing the price path only.",
    ft_now: "Now", ft_end: "End",
    sc_tracking: "Tracking", sc_approaching: "Approaching", sc_realized: "Breached", sc_invalidated: "Broke down", scAutoStatusTip: "Auto-determined from price vs target",
    // executions
    round: "Round", side: "Side", price: "Price", qty: "Qty", amount: "Amount", date: "Date", buy: "Buy", sell: "Sell",
    addExec: "Add execution",
    // rules
    when: "WHEN", then: "THEN", and: "AND", lastTriggered: "Last triggered", never: "Never", addRule: "Add rule",
    // properties
    sysProps: "Properties", stratFields: "Framework fields", stratFieldsExec: "Strategy fields", scSummary: "Scenario summary",
    status: "Status", portfolio: "Portfolio", strategy: "Strategy", framework: "Framework", ticker: "Ticker",
    created: "Created", addField: "Add field", noStrategy: "No strategy", noFramework: "No framework", noPortfolio: "No portfolio", assignStrategy: "Assign framework",
    cat_accum: "Accumulate", cat_rebal: "Rebalance", cat_signal: "Signal", fwcat_multiple: "Multiple-based", fwcat_intrinsic: "Intrinsic value", fwcat_asset: "Asset / SOTP",
    // strategy editor
    overview: "Overview", fields: "Fields", rulesNav: "Rules", preview: "Preview",
    stratName: "Framework name", stratDesc: "Description", themeColor: "Theme color", icon: "Icon",
    guiMode: "GUI", exprMode: "Expression", availTriggers: "Available triggers", availActions: "Available actions",
    appliedTo: "Applied to", activePlans: "active plans",
    stepFields: "Fields auto-created", stepDefaults: "Default values set", stepRules: "Rules activated",
    editStrategy: "Edit framework", default: "Default",
    theme: "Toggle theme", lang: "한국어", dispCurTitle: "Display currency", curAuto: "Auto (native)", curKRW: "KRW", curUSD: "USD",
    // filter / display
    addFilter: "Add filter", group: "Grouping", order: "Ordering", properties: "Properties",
    showEmpty: "Show empty groups", view: "View", none: "None", returnCat: "Return",
    inProfit: "In profit", inLoss: "In loss", is: "is",
    o_updated: "Updated", o_return: "Return", o_name: "Name",
    c_gauge: "Scenario gauge", c_return: "Return", c_fill: "Fill", c_strategy: "Strategy", c_spark: "Sparkline",
    tab_all: "All", tab_pre: "Watching", tab_open: "Open", tab_closed: "Closed", home: "Plans",
    securities: "Securities", market: "Market", watchlist: "Watchlist", watch: "Watch", watching: "Watching",
    chartNote: "Live price chart — connects to real market data", plansOn: "Plans on this security",
    sector: "Sector", change: "Change", searchSec: "Search any ticker or name\u2026", noPlansYet: "No plans yet",
    createPlanHere: "Create plan", quickSim: "Quick simulate", openSecurity: "Open security",
    settings: "Settings", preferences: "Preferences", invitePeople: "Invite people", customizeSidebar: "Customize sidebar",
    help: "Help", keyboardShortcuts: "Keyboard shortcuts", contact: "Contact us", whatsNew: "What’s new", docs: "Docs", logout: "Log out",
    deletePlan: "Delete plan", duplicate: "Duplicate", archive: "Archive", moveToTrash: "Move to trash", changeStatus: "Change status",
    appearance: "Appearance", themeL: "Theme", langL: "Language", defaultView: "Default view", notifications: "Notifications",
    dark: "Dark", light: "Light", collapseSb: "Collapse sidebar", expandSb: "Expand sidebar", hideProps: "Hide properties", showProps: "Show properties",
    simulator: "Simulator", scenariosMon: "Scenarios", statementsNav: "Financials", screenerNav: "Screener", archiveNav: "Archive", trash: "Trash", restore: "Restore", deleteForever: "Delete permanently",
    emptyTrash: "Trash is empty", emptyArchive: "No archived plans", emptyWatch: "No watched securities", emptyScen: "No scenarios",
    optionalDest: "Tools", customizeHint: "Choose which sections appear in the sidebar", pickSecurity: "Pick a security", standaloneSimHint: "Run a what-if on any security — no plan needed",
    research: "Research", researchHint: "Pick any security — overview, financials, metrics, valuation. No plan needed.", recentlyViewed: "Recently viewed",
    insights: "Insights", insightsSub: "How your process is performing — not just the numbers",
    secAccuracy: "Scenario accuracy", secAccuracySub: "How well your Bull / Base / Bear calls have played out",
    stratPerf: "Strategy performance", stratPerfSub: "Which strategies are actually winning",
    procHealth: "Process health", procHealthSub: "How investments flow from research to close",
    winLoss: "Win / loss", winLossSub: "Hit rate and profit factor across closed & open plans",
    realized: "Realized", invalidated: "Invalidated", pending: "Pending", hitRate: "Hit rate",
    avgTargetErr: "Avg target error", calls: "calls", caseBull: "Bull", caseBase: "Base", caseBear: "Bear",
    avgReturn: "Avg return", winRate: "Win rate", avgHold: "Avg hold", planCount: "Plans", days: "d",
    toResearch: "Research", toEntry: "Entry", toClose: "Close", avgDuration: "Avg duration",
    rulesFired: "Rules fired", ruleActRate: "Action rate", transitions: "Transitions",
    winners: "Winners", losers: "Losers", profitFactor: "Profit factor", avgWin: "Avg win", avgLoss: "Avg loss",
    bestPlan: "Best", worstPlan: "Worst", openPos: "Open", closedPos: "Closed", allTime: "All-time",
    newScenario: "New scenario", scenarioOn: "Scenarios on this security", addScenarioHere: "Add scenario", saveScenario: "Save scenario", promoteToPlan: "Promote to plan", adhoc: "Ad-hoc", fromPlan: "From plan", scThesisPh: "One-line thesis…", scLabel: "Case", noPlanYet2: "No plan — ad-hoc",
    takeProfit: "Take-profit", stopLoss: "Stop-loss", exitL: "Exit", gaugeTitle: "Scenario range",
  },
  ko: {
    workspace: "경훈의 워크스페이스", search: "검색", create: "새 플랜",
    inbox: "인박스", journal: "일지", myplans: "내 플랜", active: "실행중",
    ibx_all: "전체", ibx_unread: "안 읽음", ibx_markAll: "모두 읽음", ibx_today: "오늘", ibx_earlier: "이전", ibx_thisWeek: "이번 주",
    ibx_when: "조건", ibx_then: "실행", ibx_recordBuy: "1회 매수 기록", ibx_toClosing: "청산중으로 전환", ibx_openPlan: "플랜 열기", ibx_markRead: "읽음 처리", ibx_archive: "보관",
    ibx_empty: "받은 알림 없음", ibx_emptySub: "처리할 알림이 없어요", ibx_pick: "알림을 선택하세요", ibx_pickSub: "알림을 고르면 맥락과 액션이 표시됩니다", ibx_unitBuy: "1회 매수금", ibx_done: "처리됨",
    portfolios: "포트폴리오", strategies: "전략", views: "뷰",
    plans: "플랜", board: "보드", timeline: "타임라인", list: "리스트",
    allplans: "전체", research_tab: "관찰", closed_tab: "종료",
    filter: "필터", display: "표시", clear: "초기화", save: "저장",
    askReticle: "Keystone에게 질문", newPlan: "새 플랜", planName: "플랜 이름…",
    cancel: "취소", createPlan: "플랜 생성",
    s_research: "관찰", s_planning: "계획", s_active: "실행중",
    s_paused: "보류", s_closing: "청산중", s_closed: "종료",
    current: "현재가", avg: "평단가", retRate: "수익률", retAmt: "평가손익", entry: "진입가", roundUnit: "회차",
    progress: "진행", invested: "투자금", shares: "보유수량", updated: "업데이트",
    exitPrice: "청산가", avgBuy: "평균 매수가", realizedPL: "실현손익", realizedRet: "실현 수익률", holdPeriod: "보유 기간",
    closeout: "청산 요약", totalInvestedLab: "총 투입", totalBought: "총 매수", avgBuySell: "평균 매수→매도",
    tip_avgCost: "평균 매수 단가 — 취득원가(평가 기준선)", tip_exitPrice: "평균 매도 단가",
    pb_avgImprove: "평단 개선", pb_remainPL: "잔여 평가손익", pb_realizedSoFar: "실현(누적)", pb_bought: "총 매입",
    tip_current: "현재 시장가 (실시간 틱 데모)", tip_retRate: "평단 대비 미실현 수익률", tip_retAmt: "미실현 평가손익 (금액)", tip_progress: "분할 진행 — 매수 회차 / 총 분할 수", tip_bought: "총 매입 — 전 회차 합산 금액·수량",
    tip_tab_scenarios: "BEAR–NOW–BULL 범위 + 목표가·손절가 시나리오", tip_tab_valuation: "재무 입력으로 적정주가·포워드 PER 역산", tip_tab_executions: "회차별 체결 원장 — 누적 평단·손익", tip_tab_rules: "WHEN→THEN 자동화 (매수/청산 트리거)", tip_tab_insights: "이 플랜의 성과·평단 추이·룰 이력", tip_tab_activity: "상태 전이·체결·편집 타임라인",
    composeMore: "연속 생성", memoPh: "투자 논거 메모… (선택 — 기준 시나리오의 논거로 들어가요)",
    pb_journey: "궤적 범위", pb_peak: "최고", pb_trough: "최저", pb_mdd: "최대 낙폭", pb_mock: "목업",
    tip_pb_avgImprove: "첫 매수가 대비 현재 평단 변화 — 음수면 물타기로 평단을 낮춘 것", tip_pb_hold: "첫 매수 이후 경과일", tip_pb_peak: "여정 중 도달한 최고 평가수익률", tip_pb_trough: "여정 중 최저 평가수익률", tip_pb_mdd: "최대 낙폭 — 고점 대비 가장 깊었던 하락", tip_pb_mock: "목업 가격 경로 기반 — 실데이터 연동 전까지 참고용", tip_pb_remain: "아직 보유 중인 수량의 평가손익", tip_pb_realizedSoFar: "부분 매도로 이미 확정한 손익",
    scenarios: "시나리오", executions: "체결", rules: "규칙", activity: "활동",
    scRange: "시나리오 범위", now: "현재", addScenario: "시나리오 추가", scNamePh: "이름", scThesisPh: "논거를 입력하세요…", delete: "삭제", scEditHint: "클릭해 수정", scEditStatus: "상태 변경",
    scAuto: "자동", scAutoTip: "자동 생성된 기본값 — 5년 PER 밴드 × EPS (목업 데이터). 목표가나 논거를 수정하면 내 논거가 되고 배지는 사라집니다.",
    customFields: "커스텀 필드", cfNamePh: "필드 이름", add: "추가", cfType_text: "텍스트", cfType_number: "숫자", cfType_percent: "퍼센트", cfType_date: "날짜", cfType_select: "선택",
    target: "목표가", expRet: "예상 수익률", revPer: "역산 PER", mktCap: "시가총액", expPL: "예상 손익",
    simulator: "시나리오 시뮬레이터", simHint: "목표가를 입력하면 역산 지표가 자동 계산됩니다",
    targetPrice: "목표가", currentEps: "주당순이익(TTM)", sharesOut: "발행 주식수",
    impliedPer: "역산 PER", impliedCap: "역산 시가총액", impliedRet: "역산 수익률",
    // future-test
    futureTest: "퓨처테스트", ft_playout: "전략 전개", ft_valuation: "밸류에이션",
    ftHint: "가정 가격 시나리오를 설정하고, 내 전략이 시간에 따라 어떻게 작동하는지 전개해 보세요.",
    ft_assumption: "가정 시나리오 · 예측 아님", ft_scenario: "가격 시나리오", ft_params: "전략 파라미터",
    ft_maxdrop: "최대 낙폭", ft_horizon: "기간", ft_budget: "예산", ft_months: "개월",
    ft_troughT: "저점 시점", ft_peak: "정점 상승", ft_peakT: "정점 시점", ft_landing: "최종 도달가", ft_vol: "변동성",
    ft_draw: "직접 그리기", ft_drawHint: "점을 드래그해 경로를 직접 그려요", ft_drawNote: "차트의 점을 위아래로 끌어 경로를 만들어요.",
    ft_play: "재생", ft_pause: "일시정지", ft_replay: "다시재생",
    ft_finalAvg: "최종 평단", ft_maxDeployed: "최대 투입", ft_rounds: "매수 횟수",
    ft_mdd: "최대 평가손", ft_breakeven: "손익분기", ft_return: "시나리오 수익률", ft_finalValue: "최종 평가액",
    ft_divisions: "분할 수", ft_buyAmount: "회당 매수", ft_tp: "익절 기준", ft_valueStep: "목표 증가액",
    ft_gridLow: "구간 하단", ft_gridHigh: "구간 상단", ft_gridCount: "격자 수", ft_interval: "매수 주기", ft_days: "일",
    ft_targetVal: "목표 평가액", ft_bandLow: "밴드 하한 %", ft_bandHigh: "밴드 상한 %",
    // valuation tool
    val_tab: "밸류에이션",
    val_intro: "재무 수치와 목표 배수를 입력하면 EPS/BPS·포워드 PER/PBR/PSR·적정주가를 산출해요. 예상 실적은 성장률로 자동 채워지고, 적정주가를 시나리오 타겟에 바로 꽂을 수 있어요.",
    val_basic: "기본 정보", val_price: "현재가", val_shares: "발행주식수",
    val_currentFin: "예상 실적", val_revenue: "매출액", val_op: "영업이익", val_net: "순이익", val_equity: "자본총계",
    val_growth: "성장률", val_growthNote: "매출·이익 ×(1+성장률) · 자본 ×(1+0.8×성장률)",
    val_computed: "자동 계산", val_curFwd: "(입력 → 성장률 반영)",
    val_opMargin: "영업이익률", val_netMargin: "순이익률", val_divYield: "배당수익률",
    val_fair: "적정주가 & 목표 배수", val_tPer: "목표 PER", val_tPbr: "목표 PBR", val_tPsr: "목표 PSR", val_tEv: "목표 EV/EBITDA", val_tFcf: "목표 EV/FCF", val_fairAvg: "종합 적정주가",
    val_dist: "적정주가 분포", val_anchors: "핵심 가정", val_sens: "민감도", val_sens_g: "성장률", val_sens_m: "목표 배수", val_sensHint: "성장률 × 첫 슬롯 배수 조합별 현재가 대비 상승여력",
    val_v_under: "저평가", val_v_fair: "적정", val_v_over: "고평가",
    scv_value: "밸류", scv_quadrant: "사분면", scv_fairLab: "적정가", scv_gapLab: "적정가 대비", scv_qual: "품질",
    scv_saved: "저장된 스크린", scv_saveCur: "현재 화면 저장\u2026", scv_screenName: "스크린 이름", scv_noSaves: "저장된 스크린이 없습니다", scv_buyzone: "싸고 좋음", scv_overpriced: "비쌈", scv_valGapTip: "현재가 vs 적정가(EPS × 5년 PER 밴드 중앙값). +면 저평가.",
    val_apply: "시나리오 타겟에 적용", val_applied: "적용됨", val_applyNote: "적용 결과", val_applyTip: "상단 = 고배수 슬롯 · 기준 = 중간배수 슬롯 · 하단 = 저배수 슬롯을 각 시나리오에 1:1로 적용합니다. 슬롯 간 편차가 곧 불확실성 범위입니다.",
    val_mode_per: "PER 밴드", val_mode_pbr: "PBR 밴드", val_mode_psr: "PSR 밴드", val_mode_ev: "EV/EBITDA 밴드", val_mode_fcf: "EV/FCF 밴드", val_mode_por: "POR 밴드", val_mode_mix: "멀티플 혼합",
    val_mixTip: "클릭해서 이 방법을 혼합에 포함/제외",
    val_methodHint: "여러 개 체크 시 혼합 (최대/평균/최소)", val_methodLast: "최소 한 개는 필요해요",
    val_tPor: "목표 POR(영업익)", val_tDivy: "목표 배당수익률", val_addSlot: "배수 추가", val_presetHint: "밴드 지표 선택 — 세 배수가 모두 이 지표로 통일돼요",
    val_bandLo: "하단", val_bandMid: "기준", val_bandHi: "상단",
    val_applyTipBand: "상단/기준/하단 = 예상 주당가치 × 각 밴드 배수 — 자동 시나리오의 PER 밴드와 같은 논리입니다.",
    val_reverse: "역산기", val_revPer: "PER → 주가", val_revCap: "시가총액 → 주가",
    val_tCapKr: "목표 시총 (조)", val_tCapUs: "목표 시총 ($B)", val_needEps: "EPS 필요", val_needShares: "발행주식수 필요",
    dash_tab: "현황", dash_value: "평가액", dash_watching: "관찰 중", dash_open: "진행중", dash_pre: "검토", dash_avgRet: "평균 수익률", dash_holdings: "보유", dash_actionq: "확인 필요", dash_empty: "표시할 플랜 없음", dash_mixed: "혼합 통화", dash_fxNote: "원화 환산 (≈₩1,380/$)",
    stratCat: "카테고리", newCat: "새로 추가", newPortfolio: "새 포트폴리오",
    lg_cumQty: "누적 수량", lg_cumInv: "누적 투입", lg_dAvg: "평단 변화", lg_pnlAt: "시점 손익",
    tip_lg_round: "체결 순번 — 매수·매도 시간순 통합 번호", tip_lg_date: "체결 날짜", tip_lg_side: "매수 / 매도 구분", tip_lg_price: "이 체결의 단가", tip_lg_qty: "이 체결의 수량 (매도는 음수)", tip_lg_amount: "단가 × 수량 — 이 체결의 금액", tip_lg_cumQty: "이 행 이후 보유 수량", tip_lg_cumInv: "이 행 이후 누적 투입 원금", tip_lg_dAvg: "직전 회차 대비 평단가 변화 — ▼ 하락이면 물타기 성공", tip_lg_pnlAt: "매수: 현재 평단 대비 평가손익 · 매도: 실현손익 (각 체결 시점 단가 기준)",
    scenStatus: "시나리오", scn_st_tracking: "추적", scn_st_approaching: "근접", scn_st_realized: "실현", scn_st_invalidated: "무효화",
    saveView: "뷰로 저장", viewSaved: "뷰가 저장되었습니다", renameView: "이름 변경", deleteView: "삭제", viewsHint: "플랜 리스트에서 필터를 걸고 “뷰로 저장”을 누르면 여기와 사이드바에 추가됩니다.", applyView: "열기",
    ftm_playout: "전개", ftm_compare: "전략 비교", ftm_stress: "경로 스트레스",
    cmp_hint: "같은 가정 경로 · 같은 예산 · 같은 비용 — 어떤 전략이 견디는가. 벤치마크는 바이앤홀드.",
    cmp_strategy: "전략", cmp_ret: "수익률", cmp_trades: "매수/매도", cmp_vsBH: "초과수익", cmp_best: "최고",
    cmp_note: "수익률 = 손익 ÷ 최대 투입금. MDD = 최대 투입금 대비 최악 평가손실 깊이.",
    cmp_pick: "비교 전략", cmp_signalNote: "이 전략 유형은 아직 전개를 지원하지 않아요", cmp_bhNote: "벤치마크 — 항상 포함",
    tip_depth: "기간 중 가격이 현재가 대비 최대 몇 %까지 빠지는지 (상승형 프리셋에서는 최대 상승 폭)",
    tip_trough: "저점(또는 정점)이 기간 중 언제 오는지 — 분할매수 평단에 결정적",
    tip_landing: "가정 경로가 기간 끝에 도착하는 가격 (현재가 대비). 낙폭과는 별개로 회복 정도를 정해요 — 예: -30% 찍고 +6%까지 회복 vs -11%에 머물기",
    tip_vol: "경로가 매끄러운지 톱니처럼 출렁이는지 — 그리드·리밸런싱 체결 빈도에 영향",
    tip_trough_peak: "정점이 기간 중 언제 오는지",
    tip_horizon: "가정하는 전체 기간 — 단위는 패널 상단 일/월/년으로 변경",
    tip_cost: "매수·매도마다 체결가에 반영되는 수수료+슬리피지 (편도)", tip_click: "클릭해 숫자 입력",
    ft_tpPct: "목표 수익률 %", ft_slPct: "손절 %", ft_exitAt: "청산 도달", ft_exitNone: "미도달", ft_slFired: "손절 발동",
    ft_buyGroup: "매수 설정", ft_exitGroup: "청산 룰", ft_tpName: "목표 익절", ft_slName: "손절",
    ft_maWin: "이평 구간", ft_trailPct: "트레일링 스탑 %", ft_stopPct: "하드 스탑 %",
    ft_signalNote: "청산은 위의 트레일링/하드 스탑으로 결정 — 다음 상향 돌파 때 재진입해요.",
    ft_entries: "진입 횟수", ft_trades: "완료 매매", ft_tradesUnit: "회", ft_holding: "보유 중",
    tip_tpsl: "전략 공통 청산 룰 — 평가손익이 목표에 닿으면(수익률 % 또는 금액 기준), 또는 손절선까지 떨어지면 전량 청산. 0 = 끄기",
    tip_p_budget: "이 전략에 전체 기간 동안 투입할 총 자본.",
    tip_p_maWin: "이동평균 구간. 가격이 이 이평선을 상향 돌파할 때 진입 — 길수록 신호가 느리고 적어져요.",
    tip_p_trailPct: "트레일링 스탑 — 진입 후 '고점 대비' 이 %만큼 하락하면 청산. 가격이 오르면 청산선도 따라 올라가 이익을 보호해요.",
    tip_p_stopPct: "하드 스탑 — '진입가 대비' 이 %만큼 하락하면 청산. 고정된 손절 바닥선.",
    tip_p_divisions: "예산을 몇 회로 나눠 분할 매수할지.",
    tip_p_buyAmount: "정해진 주기마다 매수하는 금액.",
    tip_p_valueStep: "매 주기 목표 평가액 증가분 — 부족하면 더, 초과하면 덜 매수.",
    tip_p_gridLow: "그리드 하단 — 여기까지 내려오며 분할 매수.",
    tip_p_gridHigh: "그리드 상단 — 여기까지 올라가며 분할 매도.",
    tip_p_gridCount: "하단~상단 사이 그리드 칸 수.",
    tip_p_targetValue: "유지할 목표 포지션 평가액 — 밴드 이탈 시 여기로 리밸런싱.",
    tip_p_bandLow: "하한 밴드(목표 대비 %) — 평가액이 이 아래로 내려가면 다시 매수.",
    tip_p_bandHigh: "상한 밴드(목표 대비 %) — 평가액이 이를 초과하면 일부 매도.",
    tip_range: "하단·중간·상단 = 가격 가설(어디까지 갈 수 있나) · SL/TP 틱 = 행동 레벨(어디서 내가 행동하나). 의도적으로 분리돼 있어요.",
    tip_bull: "낙관 가설 — 투자 논리가 실현될 때 도달 가능한 상단 가격. 익절 주문선이 아니라 시장에 대한 가설",
    tip_base: "중간 가설 — 내 논리상 가장 개연성 높은 목표가",
    tip_bear: "비관 가설 — 리스크가 현실화될 때의 하단 가격. 손절가가 아니에요 — 손절은 따로 설정하는 행동 레벨",
    tip_actionDrag: "드래그해서 이 플랜의 행동 레벨을 설정",
    str_hint: "한 전략을 6개 가정 경로 전부에 전개 — 질문은 “어느 경로가 맞는가”가 아니라 “전략이 경로에 얼마나 민감한가”입니다.",
    str_path: "경로", str_end: "경로 끝", ft_cost: "비용 % (편도)",
    tip_col_path: "가정 가격 시나리오 — 6개 프리셋 경로 중 하나",
    tip_col_end: "경로 자체의 최종 도달가 — 전략 적용 전, 시작가 대비 %",
    tip_col_strat: "선택한 전략으로 이 경로를 매매했을 때의 수익률 (손익 ÷ 최대 투입금)",
    tip_col_mdd: "최대 평가손실 — 경로 진행 중 전략이 겪는 최악의 순간 손실 깊이",
    tip_col_bh: "벤치마크 — 시작할 때 한 번 사서 끝까지 그냥 보유했을 때의 수익률",
    tip_col_delta: "전략 수익률 − 바이앤홀드 수익률. +면 전략이 ‘그냥 보유’보다 잘한 것",
    tip_col_trades: "이 경로에서 전략이 실행한 매수/매도 체결 횟수",
    tip_col_deployed: "어느 시점이든 실제로 투입돼 있던 자본의 최대치 — 진짜 리스크 금액",
    tl_overlays: "오버레이", tl_ov_avg: "평단가 선", tl_ov_band: "손익 밴드", tl_ov_execs: "매수/매도 마커", tl_ov_trans: "상태 전이",
    scn_vrebound: "V자 반등", scn_lshape: "L자 횡보", scn_stair: "계단식 하락", scn_range: "박스권", scn_uptrend: "우상향", scn_spike: "급등 후 조정",
    ft_market: "가정 가격", ft_avg: "평단가", ft_noPlayout: "이 전략 유형의 전개는 아직 준비 중이에요 — 가격 경로만 표시합니다.",
    ft_now: "현재", ft_end: "종료",
    sc_tracking: "추적", sc_approaching: "근접", sc_realized: "돌파", sc_invalidated: "이탈", scAutoStatusTip: "현재가와 목표가를 비교해 자동으로 판정됩니다",
    round: "회차", side: "구분", price: "체결가", qty: "수량", amount: "체결금액", date: "날짜", buy: "매수", sell: "매도",
    addExec: "체결 추가",
    when: "조건", then: "동작", and: "AND", lastTriggered: "마지막 트리거", never: "없음", addRule: "규칙 추가",
    sysProps: "속성", stratFields: "관점 필드", stratFieldsExec: "전략 필드", scSummary: "시나리오 요약",
    status: "상태", portfolio: "포트폴리오", strategy: "전략", framework: "관점", ticker: "종목",
    created: "생성", addField: "필드 추가", noStrategy: "전략 없음", noFramework: "관점 없음", noPortfolio: "포트폴리오 없음", assignStrategy: "관점 선택",
    cat_accum: "분할·누적", cat_rebal: "리밸런싱", cat_signal: "시그널", fwcat_multiple: "멀티플", fwcat_intrinsic: "내재가치", fwcat_asset: "자산·SOTP",
    overview: "개요", fields: "필드", rulesNav: "규칙", preview: "미리보기",
    stratName: "관점 이름", stratDesc: "설명", themeColor: "테마 컬러", icon: "아이콘",
    guiMode: "GUI", exprMode: "수식", availTriggers: "사용 가능한 트리거", availActions: "사용 가능한 액션",
    appliedTo: "적용 대상", activePlans: "개 실행중 플랜",
    stepFields: "필드 자동 생성", stepDefaults: "기본값 세팅", stepRules: "규칙 활성화",
    editStrategy: "관점 편집", default: "기본값",
    theme: "테마 전환", lang: "English", dispCurTitle: "표시 통화", curAuto: "자동 (원래 통화)", curKRW: "원화", curUSD: "달러",
    addFilter: "필터 추가", group: "그룹", order: "정렬", properties: "표시 항목",
    showEmpty: "빈 그룹 표시", view: "뷰", none: "없음", returnCat: "수익률",
    inProfit: "수익 구간", inLoss: "손실 구간", is: "—",
    o_updated: "업데이트순", o_return: "수익률순", o_name: "종목명순",
    c_gauge: "시나리오 게이지", c_return: "수익률", c_fill: "진행률", c_strategy: "전략", c_spark: "스파크라인",
    tab_all: "전체", tab_pre: "검토", tab_open: "진행중", tab_closed: "종료", home: "플랜",
    securities: "종목", market: "시장", watchlist: "관심종목", watch: "관심", watching: "관심중",
    chartNote: "실시간 가격 차트 — 실데이터 연동 시 표시", plansOn: "이 종목의 플랜",
    sector: "섹터", change: "등락", searchSec: "종목 코드 또는 이름 검색…", noPlansYet: "아직 플랜 없음",
    createPlanHere: "플랜 생성", quickSim: "빠른 시뮬레이션", openSecurity: "종목 열기",
    settings: "설정", preferences: "환경설정", invitePeople: "사람 초대", customizeSidebar: "사이드바 편집",
    help: "도움말", keyboardShortcuts: "키보드 단축키", contact: "문의하기", whatsNew: "새로운 소식", docs: "문서", logout: "로그아웃",
    deletePlan: "플랜 삭제", duplicate: "복제", archive: "보관", moveToTrash: "휴지통으로", changeStatus: "상태 변경",
    appearance: "테마", themeL: "테마", langL: "언어", defaultView: "기본 뷰", notifications: "알림",
    dark: "다크", light: "라이트", collapseSb: "사이드바 접기", expandSb: "사이드바 펼기", hideProps: "속성 숨기기", showProps: "속성 표시",
    simulator: "시뮬레이터", scenariosMon: "시나리오", statementsNav: "재무제표", screenerNav: "스크리너", archiveNav: "보관함", trash: "휴지통", restore: "복구", deleteForever: "영구 삭제",
    emptyTrash: "휴지통이 비어 있습니다", emptyArchive: "보관된 플랜 없음", emptyWatch: "관심종목 없음", emptyScen: "시나리오 없음",
    optionalDest: "도구", customizeHint: "사이드바에 표시할 섹션을 선택하세요", pickSecurity: "종목 선택", standaloneSimHint: "플랜 없이 어떤 종목이든 가정해보기",
    research: "종목 리서치", researchHint: "종목을 골라 개요·재무제표·투자지표·밸류에이션을 봅니다 — 플랜 없이.", recentlyViewed: "최근 본 종목",
    insights: "인사이트", insightsSub: "수치가 아닌, 내 투자 프로세스가 얼마나 잘 돌고 있는가",
    secAccuracy: "시나리오 적중률", secAccuracySub: "상단 / 중간 / 하단 예측이 얼마나 맞았는가",
    stratPerf: "전략 성과", stratPerfSub: "어떤 전략이 실제로 이기고 있나",
    procHealth: "프로세스 건강도", procHealthSub: "관찰에서 청산까지 흐름이 얼마나 빠른가",
    winLoss: "승률 · 손익비", winLossSub: "종료·진행 플랜의 적중률과 손익비",
    realized: "실현", invalidated: "무효화", pending: "진행중", hitRate: "적중률",
    avgTargetErr: "평균 목표 오차", calls: "개", caseBull: "Bull", caseBase: "Base", caseBear: "Bear",
    avgReturn: "평균 수익률", winRate: "승률", avgHold: "평균 보유", planCount: "플랜", days: "일",
    toResearch: "관찰", toEntry: "진입", toClose: "청산", avgDuration: "평균 소요",
    rulesFired: "규칙 발동", ruleActRate: "행동 전환율", transitions: "상태 전이",
    winners: "수익", losers: "손실", profitFactor: "손익비", avgWin: "평균 수익", avgLoss: "평균 손실",
    bestPlan: "최고", worstPlan: "최저", openPos: "진행", closedPos: "종료", allTime: "전체 기간",
    newScenario: "새 시나리오", scenarioOn: "이 종목의 시나리오", addScenarioHere: "시나리오 추가", saveScenario: "시나리오 저장", promoteToPlan: "플랜으로 승격", adhoc: "임시", fromPlan: "플랜", scThesisPh: "한 줄 근거…", scLabel: "시나리오", noPlanYet2: "플랜 없음 — 임시",
    takeProfit: "익절가", stopLoss: "손절가", exitL: "청산가", gaugeTitle: "시나리오 범위",
  },
};

/* ============ Status system (Reticle lifecycle) ============ */
const PLAN_STATUS = {
  research: { color: "var(--r-research)", key: "research" },
  planning: { color: "var(--r-planning)", key: "planning" },
  active:   { color: "var(--r-active)",   key: "active" },
  paused:   { color: "var(--r-paused)",   key: "paused" },
  closing:  { color: "var(--r-closing)",  key: "closing" },
  closed:   { color: "var(--r-closed)",   key: "closed" },
};
const STATUS_ORDER = ["research", "planning", "active", "paused", "closing", "closed"];
// workflow-tab grouping: 검토(pre) / 진행중(open) / 종료(closed)
const WF_TYPE = { research: "pre", planning: "pre", active: "open", paused: "open", closing: "open", closed: "closed" };

/* ============ Portfolios ============ */
const PORTFOLIOS = [
  { id: "pf1", name: { en: "Korea growth", ko: "국내 성장주" }, color: "#4C8DFF", icon: "trending-up" },
  { id: "pf2", name: { en: "US big tech", ko: "미국 빅테크" }, color: "#BB6BD9", icon: "cpu" },
  { id: "pf3", name: { en: "Value & dividend", ko: "가치·배당" }, color: "#4CB782", icon: "landmark" },
];

/* ============ Valuation Frameworks (구 Strategies) ============ */
// 프레임워크 = 밸류에이션 스키마. 각 프레임워크가 모델 + 가정 필드 + 시나리오를 가르는
// 스윙 변수(swing:true)를 정의한다. cat: multiple(멀티플) / intrinsic(내재가치) / asset(자산).
const STRATEGIES = [
  {
    id: "st1", name: { en: "Quality P/E", ko: "퀄리티 PER" }, color: "#4CB782", icon: "gauge", isPreset: true, cat: "multiple", model: "PER", gradeFocus: ["PER", "ROE", "OPM"], thresholds: { PER: { dir: "low", good: 15, warn: 40 }, ROE: { dir: "high", good: 25, warn: 8 }, OPM: { dir: "high", good: 32, warn: 9 } },
    desc: { en: "Forward EPS × target P/E. Standard for earnings-visible compounders.", ko: "예상 EPS × 목표 PER. 이익 가시성 높은 우량주 표준 평가." },
    fields: [
      { key: "eps_growth", label: { en: "EPS growth", ko: "예상 EPS 성장률" }, type: "Percent", default: "8%" },
      { key: "target_per", label: { en: "Target P/E", ko: "목표 PER" }, type: "Number", default: "12", swing: true },
      { key: "fwd_eps", label: { en: "Forward EPS", ko: "예상 EPS" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st2", name: { en: "Growth DCF", ko: "성장주 DCF" }, color: "#4C8DFF", icon: "trending-up", isPreset: true, cat: "intrinsic", model: "DCF", gradeFocus: ["REVG", "OPM", "ROE"], thresholds: { REVG: { dir: "high", good: 20, warn: 4 }, OPM: { dir: "high", good: 32, warn: 9 }, ROE: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Discounted free cash flow. For high-growth, services-heavy businesses.", ko: "미래 잉여현금흐름 할인. 고성장·서비스 비즈니스에 적합." },
    fields: [
      { key: "fcf_growth", label: { en: "FCF growth (5y)", ko: "FCF 성장률(5y)" }, type: "Percent", default: "12%", swing: true },
      { key: "discount_rate", label: { en: "Discount rate", ko: "할인율(WACC)" }, type: "Percent", default: "9%" },
      { key: "term_growth", label: { en: "Terminal growth", ko: "영구성장률" }, type: "Percent", default: "2.5%" },
    ],
  },
  {
    id: "st3", name: { en: "Asset / Book P/B", ko: "가치·자산주 PBR" }, color: "#2D9CDB", icon: "layers", isPreset: true, cat: "asset", model: "PBR", gradeFocus: ["PBR", "ROE", "DIVY"], thresholds: { PBR: { dir: "low", good: 1.2, warn: 8 }, ROE: { dir: "high", good: 25, warn: 8 }, DIVY: { dir: "high", good: 1.4, warn: 0.2 } },
    desc: { en: "Net-asset based. For low-P/B, asset-rich names. Does ROE justify the multiple?", ko: "순자산 기반. 저PBR·자산주. ROE가 목표 PBR을 정당화하는가." },
    fields: [
      { key: "target_pbr", label: { en: "Target P/B", ko: "목표 PBR" }, type: "Number", default: "0.9", swing: true },
      { key: "roe", label: { en: "Normalized ROE", ko: "정상 ROE" }, type: "Percent", default: "10%" },
      { key: "bps", label: { en: "BPS", ko: "주당순자산" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st4", name: { en: "Dividend DDM", ko: "배당주 DDM" }, color: "#F2994A", icon: "coins", isPreset: true, cat: "intrinsic", model: "DDM", gradeFocus: ["DIVY", "NPM", "DEBT"], thresholds: { DIVY: { dir: "high", good: 1.4, warn: 0.2 }, NPM: { dir: "high", good: 25, warn: 8 }, DEBT: { dir: "low", good: 33, warn: 120 } },
    desc: { en: "Dividend discount model. For stable payers. Growth & required return drive it.", ko: "배당할인모형. 안정적 배당주. 배당성장률·요구수익률이 핵심." },
    fields: [
      { key: "div_growth", label: { en: "Dividend growth", ko: "배당성장률" }, type: "Percent", default: "4%" },
      { key: "req_return", label: { en: "Required return", ko: "요구수익률" }, type: "Percent", default: "8%", swing: true },
      { key: "dps", label: { en: "DPS", ko: "주당배당금" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st5", name: { en: "Cyclical EV/EBITDA", ko: "경기민감 EV/EBITDA" }, color: "#F2C94C", icon: "activity", isPreset: true, cat: "multiple", model: "EV", gradeFocus: ["OPM", "DEBT", "GPM"], thresholds: { OPM: { dir: "high", good: 32, warn: 9 }, DEBT: { dir: "low", good: 33, warn: 120 }, GPM: { dir: "high", good: 52, warn: 30 } },
    desc: { en: "Capital-structure-neutral. For semis/materials cycles. Normalized EBITDA is key.", ko: "자본구조 중립 평가. 반도체·소재 사이클. 정상화 EBITDA가 관건." },
    fields: [
      { key: "ebitda_growth", label: { en: "EBITDA growth", ko: "EBITDA 성장률" }, type: "Percent", default: "10%" },
      { key: "target_ev", label: { en: "Target EV/EBITDA", ko: "목표 EV/EBITDA" }, type: "Number", default: "6", swing: true },
      { key: "net_debt", label: { en: "Net debt", ko: "순부채" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st6", name: { en: "Platform P/S", ko: "플랫폼 PSR" }, color: "#BB6BD9", icon: "boxes", isPreset: true, cat: "multiple", model: "PSR", gradeFocus: ["REVG", "GPM", "NPM"], thresholds: { REVG: { dir: "high", good: 20, warn: 4 }, GPM: { dir: "high", good: 52, warn: 30 }, NPM: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Revenue-based. For loss-making early growth. Margin-normalization is the bet.", ko: "매출 기반 평가. 적자·초기 고성장 기업. 마진 정상화 가정이 핵심." },
    fields: [
      { key: "rev_growth", label: { en: "Revenue growth", ko: "매출 성장률" }, type: "Percent", default: "25%" },
      { key: "target_psr", label: { en: "Target P/S", ko: "목표 PSR" }, type: "Number", default: "8", swing: true },
      { key: "sps", label: { en: "Sales per share", ko: "주당매출" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st7", name: { en: "Sum-of-the-Parts", ko: "부분합산 SOTP" }, color: "#9B6BD9", icon: "pie-chart", isPreset: true, cat: "asset", model: "PBR", gradeFocus: ["PBR", "DEBT", "ROE"], thresholds: { PBR: { dir: "low", good: 1.2, warn: 8 }, DEBT: { dir: "low", good: 33, warn: 120 }, ROE: { dir: "high", good: 25, warn: 8 } },
    desc: { en: "Value each segment separately, sum, subtract net debt. For conglomerates.", ko: "사업부별로 따로 평가해 합산 후 순부채 차감. 지주·복합기업용." },
    fields: [
      { key: "core_mult", label: { en: "Core segment mult.", ko: "핵심 사업부 배수" }, type: "Number", default: "10", swing: true },
      { key: "holdco_disc", label: { en: "Holdco discount", ko: "지주 할인율" }, type: "Percent", default: "30%" },
      { key: "sotp_value", label: { en: "SOTP value", ko: "합산 가치" }, type: "Currency", default: "auto", auto: true },
    ],
  },
  {
    id: "st8", name: { en: "Turnaround", ko: "턴어라운드" }, color: "#2BB3A3", icon: "rotate-ccw", isPreset: true, cat: "intrinsic", model: "PER", gradeFocus: ["OPM", "DEBT", "REVG"], thresholds: { OPM: { dir: "high", good: 32, warn: 9 }, DEBT: { dir: "low", good: 33, warn: 120 }, REVG: { dir: "high", good: 20, warn: 4 } },
    desc: { en: "Values normalized recovery earnings × target P/E. For margin-recovery / restructuring stories.", ko: "정상화된 회복 이익 × 목표 PER로 평가. 마진 회복·구조조정 국면 기업에 적합." },
    fields: [
      { key: "norm_opm", label: { en: "Normalized op. margin", ko: "정상 영업이익률" }, type: "Percent", default: "10%", swing: true },
      { key: "recovery_years", label: { en: "Recovery horizon", ko: "회복 기간" }, type: "Text", default: "2y" },
      { key: "target_per", label: { en: "Target P/E (norm.)", ko: "목표 PER(정상)" }, type: "Number", default: "11" },
      { key: "norm_eps", label: { en: "Normalized EPS", ko: "정상 EPS" }, type: "Currency", default: "auto", auto: true },
    ],
  },
];

/* ============ Execution Strategies (키스톤 실행 전략 — 사이드바 '전략' 섹션) ============ */
// 프레임워크(밸류에이션 렌즈)와 별개. 전략 = 어떻게 사고파나. cat: accum/rebal/signal.
// 편집형 카테고리 레지스트리 — 사용자가 이름 변경·추가 가능 (localStorage 영속)
let EXEC_CATS = [
  { id: "accum", label: { en: "Accumulate", ko: "분할·누적" } },
  { id: "rebal", label: { en: "Rebalance", ko: "리밸런싱" } },
  { id: "signal", label: { en: "Signal", ko: "시그널" } },
];
(function loadCats() { try { const s = localStorage.getItem("alphastone-exec-cats"); if (s) { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) EXEC_CATS = arr; } } catch (e) {} })();
function saveCats() { try { localStorage.setItem("alphastone-exec-cats", JSON.stringify(EXEC_CATS)); } catch (e) {} }
function catLabel(id, lang) { const c = EXEC_CATS.find(x => x.id === id); return c ? c.label[lang] : id; }
const EXEC_STRATEGIES = [
  { id: "ex1", name: { en: "Infinite Buying", ko: "무한매수법" }, color: "#BB6BD9", icon: "repeat-2", cat: "accum", isPreset: true, desc: { en: "40-way split LOC accumulation with a fixed take-profit (라오어).", ko: "40분할 LOC 누적 매수 + 고정 익절(라오어 방식)." }, fields: [
    { key: "divisions", label: { en: "Divisions", ko: "분할 수" }, type: "Number", default: "40" },
    { key: "loc_pct", label: { en: "LOC threshold", ko: "LOC 기준" }, type: "Percent", default: "-5.0%" },
    { key: "unit_buy", label: { en: "Unit buy", ko: "1회 매수금" }, type: "Currency", default: "auto", auto: true },
    { key: "tp_pct", label: { en: "Take-profit", ko: "익절 기준" }, type: "Percent", default: "10.0%" },
    { key: "round", label: { en: "Current round", ko: "현재 회차" }, type: "Number", default: "auto", auto: true },
    { key: "loc_price", label: { en: "LOC price", ko: "LOC 가격" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex2", name: { en: "Dollar-Cost Averaging", ko: "정액분할매수" }, color: "#4C8DFF", icon: "calendar-clock", cat: "accum", isPreset: true, desc: { en: "Buy a fixed amount on a set schedule, regardless of price.", ko: "가격과 무관하게 정해진 주기마다 같은 금액을 매수." }, fields: [
    { key: "amount", label: { en: "Per-period amount", ko: "회당 매수금" }, type: "Currency", default: "500,000" },
    { key: "interval", label: { en: "Interval", ko: "매수 주기" }, type: "Select", default: "Weekly", options: [{ en: "Daily", ko: "매일" }, { en: "Weekly", ko: "매주" }, { en: "Biweekly", ko: "격주" }, { en: "Monthly", ko: "매월" }] },
    { key: "avg_cost", label: { en: "Avg cost", ko: "평균 단가" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex3", name: { en: "Value Averaging", ko: "밸류애버리징" }, color: "#F2994A", icon: "trending-up", cat: "accum", isPreset: true, desc: { en: "Buy more when below the target value path, less when above.", ko: "목표 평가액 경로보다 부족하면 더, 넘으면 덜 매수." }, fields: [
    { key: "target_path", label: { en: "Target growth/mo", ko: "목표 증가액/월" }, type: "Currency", default: "600,000" },
    { key: "gap", label: { en: "Gap to path", ko: "경로 대비 갭" }, type: "Currency", default: "auto", auto: true },
  ] },
  { id: "ex4", name: { en: "Grid Trading", ko: "그리드 매매" }, color: "#9B6BD9", icon: "grid-3x3", cat: "accum", isPreset: true, desc: { en: "Buy/sell in steps across a price band — a systematic way to trade a range-bound (box) market.", ko: "설정 구간을 격자로 나눠 등락마다 분할 매수·매도. 가격이 박스권에서 횡보할 때 효과적인 대표적 분할 매매 방식입니다." }, fields: [
    { key: "upper", label: { en: "Upper band", ko: "상단" }, type: "Currency", default: "90,000" },
    { key: "lower", label: { en: "Lower band", ko: "하단" }, type: "Currency", default: "60,000" },
    { key: "grids", label: { en: "Grid count", ko: "그리드 수" }, type: "Number", default: "20" },
  ] },
  { id: "ex5", name: { en: "Value Rebalance", ko: "밸류리밸런싱" }, color: "#4CB782", icon: "scale", cat: "rebal", isPreset: true,
    desc: { en: "Track a target value line that grows yearly; trim above the upper band, add below the lower band, using a cash pool.", ko: "매년 커지는 목표 가치선을 따라 — 상단 밴드를 넘으면 매도, 하단 밴드를 이탈하면 현금풀로 매수합니다." },
    fields: [
      { key: "vr_vline", label: { en: "Target value line (V)", ko: "목표 가치선 (V)" }, type: "Currency", default: "auto", auto: true },
      { key: "vr_upper", label: { en: "Upper band", ko: "상단 밴드" }, type: "Percent", default: "15%" },
      { key: "vr_lower", label: { en: "Lower band", ko: "하단 밴드" }, type: "Percent", default: "15%" },
      { key: "vr_growth", label: { en: "Annual growth", ko: "연 성장률" }, type: "Percent", default: "15%" },
      { key: "vr_pool", label: { en: "Cash pool limit", ko: "현금풀 한도" }, type: "Percent", default: "25%" },
    ] },
  { id: "ex6", name: { en: "60/40 Allocation", ko: "6:4 자산배분" }, color: "#2D9CDB", icon: "pie-chart", cat: "rebal", isPreset: true, desc: { en: "Classic 60% equity / 40% defensive, rebalanced periodically.", ko: "주식 60 / 방어자산 40 비중을 주기적으로 리밸런싱." }, fields: [
    { key: "equity_w", label: { en: "Equity weight", ko: "주식 비중" }, type: "Percent", default: "60%" },
    { key: "rebal", label: { en: "Rebalance cycle", ko: "리밸런싱 주기" }, type: "Select", default: "Quarterly", options: [{ en: "Monthly", ko: "매월" }, { en: "Quarterly", ko: "분기마다" }, { en: "Yearly", ko: "매년" }] },
  ] },
  { id: "ex7", name: { en: "Momentum", ko: "모멘텀" }, color: "#2D9CDB", icon: "activity", cat: "signal", isPreset: true, desc: { en: "Ride relative-strength trends with a trailing stop.", ko: "상대강도 추세를 추종하고 트레일링 스탑으로 관리." }, fields: [
    { key: "lookback", label: { en: "Lookback", ko: "조회 기간" }, type: "Text", default: "12-1mo" },
    { key: "stop", label: { en: "Trailing stop", ko: "트레일링 스탑" }, type: "Percent", default: "-15%" },
  ] },
];

/* ============ Trade Plans ============ */
// scenarios: {label, thesis(en/ko), target, status, color, per, cap}
// gauge derives bear/base/bull from scenarios.
const PLANS = [
  {
    id: "PLN-001", ticker: "005930", tickerName: { en: "Samsung Electronics", ko: "삼성전자" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "Samsung memory discount", ko: "삼성전자 메모리 저평가" },
    status: "active", portfolioId: "pf1", strategyId: "st1",
    currentPrice: 71200, avgPrice: 68500, totalShares: 184, totalInvested: 12604000,
    round: 12, divisions: 40, createdAt: "Mar 3", updatedAt: "2d",
    goal: { type: "return", value: 25 },
    eps: 4830, sharesOut: 5969,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 92000, status: "tracking", per: 19.0, cap: 549,
        thesis: { en: "HBM3E ramp + memory super-cycle re-rating into 2026.", ko: "HBM3E 양산 + 메모리 슈퍼사이클 리레이팅 (2026)." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 78000, status: "approaching", per: 16.1, cap: 466,
        thesis: { en: "Gradual DRAM recovery, foundry breakeven by H2.", ko: "DRAM 점진 회복, 하반기 파운드리 손익분기." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 58000, status: "tracking", per: 12.0, cap: 346,
        thesis: { en: "China oversupply, capex cut, weak handset demand.", ko: "중국 공급과잉, 캐펙스 축소, 핸드셋 수요 약세." } },
    ],
    executions: [
      { round: 12, side: "buy", price: 70100, qty: 14, date: "Jun 5" },
      { round: 11, side: "buy", price: 69400, qty: 15, date: "Jun 3" },
      { round: 10, side: "buy", price: 68200, qty: 15, date: "May 30" },
      { round: 9, side: "buy", price: 67500, qty: 16, date: "May 28" },
    ],
    rules: [
      { id: "r1", name: { en: "LOC buy alert", ko: "LOC 매수 알림" }, on: true, last: "Today 09:01",
        when: { en: "Price ≤ LOC price", ko: "현재가 ≤ LOC 가격" }, then: { en: "Notify + show unit buy", ko: "매수 알림 + 1회 매수금 표시" } },
      { id: "rgoal", name: { en: "Goal return alert", ko: "목표 수익률 도달 알림" }, on: true, last: "Never", trig: "ret_ge", trigVal: "25%",
        when: { en: "Return ≥ goal 25%", ko: "수익률 ≥ 목표 25%" }, then: { en: "Goal reached (alert)", ko: "목표 도달 알림" } },
      { id: "r2", name: { en: "Round increment", ko: "회차 증가" }, on: true, last: "Jun 5",
        when: { en: "Buy execution added", ko: "매수 체결 입력됨" }, then: { en: "Round +1, recompute avg", ko: "회차 +1, 평단가 재계산" } },
      { id: "r3", name: { en: "Take-profit alert", ko: "익절 알림" }, on: true, last: "Never",
        when: { en: "Return ≥ 10%", ko: "수익률 ≥ 10%" }, then: { en: "Alert + suggest Closing", ko: "익절 알림 + 청산 제안" } },
    ],
    notes: [
      { id: "nt1718000003", when: { en: "Jun 22", ko: "6월 22일" }, text: "HBM3E 12단 양산 인증 통과 기사. 논제 강화 — 하단 이탈 시 추가매수 유지." },
      { id: "nt1718000002", when: { en: "Jun 14", ko: "6월 14일" }, text: "외국인 5거래일 연속 순매수. 수급 개선 신호지만 펀더멘털 변화는 아님. 관망." },
      { id: "nt1718000001", when: { en: "Jun 3", ko: "6월 3일" }, text: "11회차 매수 체결. 평단 68,500까지 내려옴. DRAM 현물가 반등이 관건." },
    ],
  },
  {
    id: "PLN-002", ticker: "AAPL", tickerName: { en: "Apple", ko: "Apple" }, flag: "🇺🇸", cur: "USD",
    name: { en: "Apple services margin", ko: "Apple 서비스 마진" },
    status: "active", portfolioId: "pf2", strategyId: "st1",
    currentPrice: 198.50, avgPrice: 205.20, totalShares: 38, totalInvested: 7797.6,
    round: 9, divisions: 40, createdAt: "Feb 18", updatedAt: "4h",
    eps: 6.43, sharesOut: 15204,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 260, status: "tracking", per: 40.4, cap: 3953,
        thesis: { en: "Apple Intelligence drives upgrade super-cycle.", ko: "Apple Intelligence가 교체 슈퍼사이클 견인." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 220, status: "tracking", per: 34.2, cap: 3345,
        thesis: { en: "Services keep compounding, hardware flat.", ko: "서비스 성장 지속, 하드웨어 보합." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 170, status: "approaching", per: 26.4, cap: 2585,
        thesis: { en: "China share loss + regulatory pressure on App Store.", ko: "중국 점유율 하락 + 앱스토어 규제 압박." } },
    ],
    executions: [
      { round: 9, side: "buy", price: 199.10, qty: 4, date: "Jun 6" },
      { round: 8, side: "buy", price: 202.40, qty: 4, date: "Jun 2" },
      { round: 7, side: "buy", price: 206.80, qty: 4, date: "May 29" },
    ],
    rules: [
      { id: "r1", name: { en: "LOC buy alert", ko: "LOC 매수 알림" }, on: true, last: "Today 04:00",
        when: { en: "Price ≤ LOC price", ko: "현재가 ≤ LOC 가격" }, then: { en: "Notify + show unit buy", ko: "매수 알림 + 1회 매수금 표시" } },
      { id: "r3", name: { en: "Take-profit alert", ko: "익절 알림" }, on: false, last: "Never",
        when: { en: "Return ≥ 10%", ko: "수익률 ≥ 10%" }, then: { en: "Alert + suggest Closing", ko: "익절 알림 + 청산 제안" } },
    ],
    notes: [
      { id: "nt1718000012", when: { en: "Jun 18", ko: "6월 18일" }, text: "WWDC 이후 래량 해소 구간. 서비스 매출 비중 확대 확인되면 중간 목표가 상향 여지." },
      { id: "nt1718000011", when: { en: "Jun 6", ko: "6월 6일" }, text: "9회차 매수. 평단 205달러대 — 하단(170) 접근 중이라 규정대로 분할 진행." },
    ],
  },
  {
    id: "PLN-005", ticker: "NVDA", tickerName: { en: "NVIDIA", ko: "NVIDIA" }, flag: "🇺🇸", cur: "USD",
    name: { en: "NVIDIA datacenter growth", ko: "NVIDIA 데이터센터 성장" },
    status: "active", portfolioId: "pf2", strategyId: "st1",
    currentPrice: 1185.00, avgPrice: 920.40, totalShares: 22, totalInvested: 20248.8,
    round: 18, divisions: 40, createdAt: "Jan 12", updatedAt: "1h",
    eps: 18.90, sharesOut: 2460,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 1500, status: "tracking", per: 79.4, cap: 3690,
        thesis: { en: "Blackwell sells out, sovereign AI demand accelerates.", ko: "Blackwell 완판, 소버린 AI 수요 가속." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 1250, status: "approaching", per: 66.1, cap: 3075,
        thesis: { en: "Datacenter growth normalizes but stays strong.", ko: "데이터센터 성장 정상화되나 견조 유지." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 800, status: "tracking", per: 42.3, cap: 1968,
        thesis: { en: "Hyperscaler capex digestion, custom-silicon share loss.", ko: "하이퍼스케일러 캐펙스 소화, 커스텀 실리콘 잠식." } },
    ],
    executions: [
      { round: 18, side: "buy", price: 1170.00, qty: 1, date: "Jun 7" },
      { round: 17, side: "buy", price: 1095.00, qty: 1, date: "Jun 1" },
      { round: 16, side: "buy", price: 980.00, qty: 2, date: "May 24" },
    ],
    rules: [
      { id: "r3", name: { en: "Take-profit alert", ko: "익절 알림" }, on: true, last: "Jun 7 14:20",
        when: { en: "Return ≥ 10%", ko: "수익률 ≥ 10%" }, then: { en: "Alert + suggest Closing", ko: "익절 알림 + 청산 제안" } },
      { id: "r4", name: { en: "Completion badge", ko: "매수 완료 뱃지" }, on: true, last: "Never",
        when: { en: "Round = divisions", ko: "회차 = 분할수" }, then: { en: "Badge + wait mode", ko: "완료 뱃지 + 대기 모드" } },
    ],
    notes: [
      { id: "nt1718000022", when: { en: "Jun 21", ko: "6월 21일" }, text: "수익률 +28% 도달. 익절 알림 울렸지만 상단(1500) 논제 유효 — 절반만 접고 나머지 홀딩." },
      { id: "nt1718000021", when: { en: "Jun 7", ko: "6월 7일" }, text: "Blackwell 서플라이 지속. 하이퍼스케일러 capex 소화 여부가 하단 리스크의 핵심." },
    ],
  },
  {
    id: "PLN-004", ticker: "000660", tickerName: { en: "SK hynix", ko: "SK하이닉스" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "SK hynix HBM cycle", ko: "SK하이닉스 HBM 사이클" },
    status: "active", portfolioId: "pf1", strategyId: "st3",
    currentPrice: 178000, avgPrice: 170200, totalShares: 15, totalInvested: 2553000,
    createdAt: "Apr 28", updatedAt: "6h",
    eps: 9870, sharesOut: 728,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 240000, status: "tracking", per: 24.3, cap: 175,
        thesis: { en: "HBM leadership, pricing power through 2026.", ko: "HBM 리더십, 2026년까지 가격 결정력." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 195000, status: "approaching", per: 19.8, cap: 142,
        thesis: { en: "Cyclical recovery, steady HBM mix.", ko: "사이클 회복, HBM 믹스 견조." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 130000, status: "tracking", per: 13.2, cap: 95,
        thesis: { en: "Memory glut returns, capex overhang.", ko: "메모리 공급과잉 재현, 캐펙스 부담." } },
    ],
    executions: [
      { round: null, side: "buy", price: 182000, qty: 3, date: "Jun 16" },
      { round: null, side: "buy", price: 176000, qty: 3, date: "Jun 9" },
      { round: null, side: "buy", price: 170000, qty: 3, date: "Jun 2" },
      { round: null, side: "buy", price: 158000, qty: 3, date: "May 26" },
      { round: null, side: "buy", price: 165000, qty: 3, date: "May 19" },
    ],
    rules: [
      { id: "r1", name: { en: "Scheduled buy alert", ko: "정기 매수 알림" }, on: true, last: "Jun 16",
        when: { en: "Weekly interval reached", ko: "매주 정기 주기 도래" }, then: { en: "Buy alert (fixed amount)", ko: "정액 매수 알림" } },
    ],
  },
  {
    id: "PLN-003", ticker: "TSLA", tickerName: { en: "Tesla", ko: "Tesla" }, flag: "🇺🇸", cur: "USD",
    name: { en: "Tesla robotaxi optionality", ko: "Tesla 로보택시 옵션" },
    status: "research", portfolioId: "pf2", strategyId: "st2",
    currentPrice: 242.00, avgPrice: null, totalShares: 0, totalInvested: 0,
    createdAt: "Jun 6", updatedAt: "1d",
    eps: 3.65, sharesOut: 3180,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 340, status: "tracking", per: 93.2, cap: 1081,
        thesis: { en: "Robotaxi launch + FSD inflection.", ko: "로보택시 출시 + FSD 변곡점." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 260, status: "approaching", per: 71.2, cap: 827,
        thesis: { en: "Auto margins stabilize, energy grows.", ko: "차량 마진 안정화, 에너지 성장." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 160, status: "tracking", per: 43.8, cap: 509,
        thesis: { en: "Demand slump, price war intensifies.", ko: "수요 둔화, 가격 전쟁 심화." } },
    ],
    executions: [],
    rules: [],
  },
  {
    id: "PLN-006", ticker: "035720", tickerName: { en: "Kakao", ko: "카카오" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "Kakao governance discount", ko: "카카오 거버넌스 디스카운트" },
    status: "paused", portfolioId: "pf1", strategyId: "st1",
    currentPrice: 41200, avgPrice: 48500, totalShares: 96, totalInvested: 4656000,
    round: 14, divisions: 40, createdAt: "Feb 2", updatedAt: "5d",
    eps: 1240, sharesOut: 4434,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 62000, status: "tracking", per: 50.0, cap: 27,
        thesis: { en: "AI services monetize, governance overhang clears.", ko: "AI 서비스 수익화, 거버넌스 리스크 해소." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 50000, status: "tracking", per: 40.3, cap: 22,
        thesis: { en: "Ad recovery, flat platform growth.", ko: "광고 회복, 플랫폼 성장 보합." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 33000, status: "approaching", per: 26.6, cap: 15,
        thesis: { en: "Regulatory fines, talent exodus continue.", ko: "규제 과징금, 인력 이탈 지속." } },
    ],
    executions: [
      { round: 14, side: "buy", price: 42100, qty: 7, date: "May 20" },
      { round: 13, side: "buy", price: 44800, qty: 6, date: "May 14" },
    ],
    rules: [
      { id: "r3", name: { en: "Take-profit alert", ko: "익절 알림" }, on: false, last: "Never",
        when: { en: "Return ≥ 10%", ko: "수익률 ≥ 10%" }, then: { en: "Alert + suggest Closing", ko: "익절 알림 + 청산 제안" } },
    ],
  },
  {
    id: "PLN-007", ticker: "005380", tickerName: { en: "Hyundai Motor", ko: "현대차" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "Hyundai Korea discount", ko: "현대차 코리아 디스카운트" },
    status: "closing", portfolioId: "pf3", strategyId: "st3",
    currentPrice: 248000, avgPrice: 205000, totalShares: 30, totalInvested: 6150000,
    createdAt: "Nov 8", updatedAt: "3d",
    eps: 47200, sharesOut: 209,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 290000, status: "approaching", per: 6.1, cap: 61,
        thesis: { en: "EV margin lead + record shareholder return.", ko: "EV 마진 우위 + 사상 최대 주주환원." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 250000, status: "realized", per: 5.3, cap: 52,
        thesis: { en: "Steady volumes, dividend re-rating.", ko: "판매량 견조, 배당 리레이팅." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 180000, status: "tracking", per: 3.8, cap: 38,
        thesis: { en: "US tariff shock, demand softens.", ko: "미국 관세 충격, 수요 둔화." } },
    ],
    executions: [
      { round: null, side: "sell", price: 246000, qty: 10, date: "Jun 5" },
      { round: null, side: "buy", price: 205000, qty: 30, date: "Nov 8" },
    ],
    rules: [
      { id: "r5", name: { en: "Value upper trim", ko: "가치선 상단 매도 알림" }, on: true, last: "Jun 5",
        when: { en: "Value above upper band", ko: "평가액이 가치선 상단 밴드 초과" }, then: { en: "Trim to value line (alert)", ko: "가치선까지 매도 알림" } },
    ],
  },
  {
    id: "PLN-008", ticker: "MSFT", tickerName: { en: "Microsoft", ko: "Microsoft" }, flag: "🇺🇸", cur: "USD",
    name: { en: "Microsoft cloud (closed)", ko: "Microsoft 클라우드 (종료)" },
    status: "closed", portfolioId: "pf2", strategyId: "st2",
    currentPrice: 448.00, avgPrice: 372.00, totalShares: 0, totalInvested: 0,
    realizedPL: 3040, createdAt: "Sep 2", updatedAt: "Apr 18", closedAt: "Apr 18",
    eps: 11.80, sharesOut: 7430,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 460, status: "realized", per: 39.0, cap: 3418,
        thesis: { en: "Copilot attach + Azure AI re-acceleration.", ko: "Copilot 부착 + Azure AI 재가속." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 410, status: "realized", per: 34.7, cap: 3046,
        thesis: { en: "Durable cloud growth, margin expansion.", ko: "견조한 클라우드 성장, 마진 확대." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 330, status: "invalidated", per: 28.0, cap: 2452,
        thesis: { en: "AI capex outpaces monetization.", ko: "AI 캐펙스가 수익화 추월." } },
    ],
    executions: [
      { round: null, side: "sell", price: 448000 / 1000, qty: 40, date: "Apr 18" },
      { round: null, side: "buy", price: 372, qty: 40, date: "Sep 2" },
    ],
    rules: [],
  },
  {
    id: "PLN-009", ticker: "035420", tickerName: { en: "NAVER", ko: "NAVER" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "NAVER commerce/fintech", ko: "NAVER 커머스·핀테크" },
    status: "research", portfolioId: "pf1", strategyId: null,
    currentPrice: 168500, avgPrice: null, totalShares: 0, totalInvested: 0,
    createdAt: "Jun 7", updatedAt: "12h",
    eps: 11200, sharesOut: 164,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 230000, status: "tracking", per: 20.5, cap: 38,
        thesis: { en: "Commerce + AI search monetization surprise.", ko: "커머스 + AI 검색 수익화 서프라이즈." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 190000, status: "approaching", per: 17.0, cap: 31,
        thesis: { en: "Ad recovery, Webtoon steady.", ko: "광고 회복, 웹툰 견조." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 140000, status: "tracking", per: 12.5, cap: 23,
        thesis: { en: "Search share erosion to AI rivals.", ko: "AI 경쟁사에 검색 점유율 잠식." } },
    ],
    executions: [],
    rules: [],
  },
  {
    id: "PLN-010", ticker: "GOOGL", tickerName: { en: "Alphabet", ko: "Alphabet" }, flag: "🇺🇸", cur: "USD",
    name: { en: "Alphabet AI search", ko: "Alphabet AI 검색" },
    status: "active", portfolioId: "pf2", strategyId: "st1",
    currentPrice: 176.20, avgPrice: 162.80, totalShares: 44, totalInvested: 7163.2,
    round: 11, divisions: 40, createdAt: "Mar 20", updatedAt: "3h",
    eps: 7.54, sharesOut: 12300,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 220, status: "tracking", per: 29.2, cap: 2706,
        thesis: { en: "Gemini wins, Cloud margin inflects.", ko: "Gemini 우위, 클라우드 마진 변곡." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 195, status: "approaching", per: 25.9, cap: 2399,
        thesis: { en: "Search resilient, Cloud compounds.", ko: "검색 견조, 클라우드 성장 지속." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 140, status: "tracking", per: 18.6, cap: 1722,
        thesis: { en: "AI disrupts search ad economics.", ko: "AI가 검색 광고 경제성 훼손." } },
    ],
    executions: [
      { round: 11, side: "buy", price: 175.40, qty: 4, date: "Jun 7" },
      { round: 10, side: "buy", price: 171.20, qty: 4, date: "Jun 3" },
    ],
    rules: [
      { id: "r1", name: { en: "LOC buy alert", ko: "LOC 매수 알림" }, on: true, last: "Today 04:00",
        when: { en: "Price ≤ LOC price", ko: "현재가 ≤ LOC 가격" }, then: { en: "Notify + show unit buy", ko: "매수 알림 + 1회 매수금 표시" } },
    ],
  },
  {
    id: "PLN-011", ticker: "005930", tickerName: { en: "Samsung Elec", ko: "삼성전자" }, flag: "🇰🇷", cur: "KRW",
    name: { en: "Samsung range grid", ko: "삼성전자 박스권 그리드" },
    status: "active", portfolioId: "pf1", strategyId: "st1",
    currentPrice: 71200, avgPrice: 68400, totalShares: 120, totalInvested: 8208000,
    createdAt: "Apr 8", updatedAt: "2h",
    eps: 3841, sharesOut: 5969,
    scenarios: [
      { label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 90000, status: "tracking", per: 23.4, cap: 537,
        thesis: { en: "Memory upcycle lifts price to the band top.", ko: "메모리 업사이클로 박스 상단 회복." } },
      { label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 75000, status: "approaching", per: 19.5, cap: 448,
        thesis: { en: "Range-bound; grid harvests the chop.", ko: "박스권 등락 — 그리드로 수익 적립." } },
      { label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 60000, status: "tracking", per: 15.6, cap: 358,
        thesis: { en: "Demand soft; price tests the band floor.", ko: "수요 약세로 박스 하단 테스트." } },
    ],
    executions: [
      { side: "buy", price: 69000, qty: 60, date: "Jun 9" },
      { side: "buy", price: 66000, qty: 30, date: "May 19" },
      { side: "sell", price: 73500, qty: 30, date: "May 2" },
      { side: "buy", price: 67500, qty: 30, date: "Apr 14" },
    ],
    rules: [
      { id: "r1", name: { en: "Grid step buy", ko: "그리드 하단 매수 알림" }, on: true, last: "Jun 9",
        when: { en: "Price drops one grid step", ko: "현재가가 한 칸 하락" }, then: { en: "Buy one rung (alert)", ko: "한 칸 매수 알림" } },
      { id: "r2", name: { en: "Grid step sell", ko: "그리드 상단 매도 알림" }, on: true, last: "May 2",
        when: { en: "Price rises one grid step", ko: "현재가가 한 칸 상승" }, then: { en: "Sell one rung (alert)", ko: "한 칸 매도 알림" } },
    ],
  },
];

/* ============ 동행: 내재가치–가격 갭 추적 보강 ============ */
// 각 플랜(=종목 동행)에 유저 편집형 내재가치(iv) + iv/가격 6분기 히스토리 +
// 저평가 사유·촉매를 부여한다. iv 시드 = 기준(Base) 시나리오 target.
// 가치는 천천히 변하고(iv선 완만), 가격은 출렁이며(가격선) 그 사이 '갭'이 핵심.
const GAP_NOTES = {
  "005930": { reason: { ko: "메모리 다운사이클 공포로 과매도. HBM 경쟁력이 가격에 거의 반영 안 됨.", en: "Oversold on memory-cycle fear; HBM edge barely priced in." }, catalyst: { ko: "HBM3E 대형 고객 납품 본격화 · 메모리 가격 반등", en: "HBM3E ramp to major customers · memory price rebound" } },
  "000660": { reason: { ko: "HBM 1위지만 사이클 피크아웃 우려로 디레이팅.", en: "HBM leader, de-rated on peak-cycle fears." }, catalyst: { ko: "HBM 캐파 증설 가시화 · 2026 가격 결정력", en: "HBM capacity expansion · 2026 pricing power" } },
  "AAPL": { reason: { ko: "성장 둔화 우려로 멀티플 정체. 서비스 마진·설치기반 과소평가.", en: "Multiple stalled on growth worries; services margin underrated." }, catalyst: { ko: "Apple Intelligence 교체 사이클 · 서비스 두 자릿수 성장", en: "Apple Intelligence upgrade cycle · services growth" } },
  "NVDA": { reason: { ko: "이미 고평가 논쟁 — 동행보다 밸류 점검 대상.", en: "Valuation hotly debated — a watch-the-gap case." }, catalyst: { ko: "Blackwell 매출 인식 · 소버린 AI 수요", en: "Blackwell revenue recognition · sovereign AI demand" } },
  "TSLA": { reason: { ko: "자동차 멀티플로 보면 비싸고, 로보택시 옵션은 미반영.", en: "Pricey on auto multiple; robotaxi optionality unpriced." }, catalyst: { ko: "로보택시 상용화 · FSD 변곡", en: "Robotaxi launch · FSD inflection" } },
  "035720": { reason: { ko: "거버넌스·규제 오버행으로 사업가치 대비 과도한 할인.", en: "Excessive discount to business value on governance overhang." }, catalyst: { ko: "AI 서비스 수익화 · 규제 불확실성 해소", en: "AI monetization · regulatory clarity" } },
  "005380": { reason: { ko: "사상 최대 실적에도 PBR 0.6 — 전형적 코리아 디스카운트.", en: "Record earnings yet 0.6x PBR — classic Korea discount." }, catalyst: { ko: "주주환원 확대 · 밸류업 리레이팅", en: "Bigger shareholder returns · value-up re-rating" } },
  "035420": { reason: { ko: "커머스·핀테크 가치가 검색 둔화에 가려 합산가치 미반영.", en: "Commerce/fintech value masked by search-growth worries." }, catalyst: { ko: "커머스 거래액 · AI 검색 수익화 서프라이즈", en: "Commerce GMV · AI search monetization" } },
  "GOOGL": { reason: { ko: "AI 검색 잠식 공포로 디레이팅. 클라우드·유튜브 과소평가.", en: "De-rated on AI-search cannibalization fear." }, catalyst: { ko: "Gemini 경쟁력 입증 · 클라우드 마진 변곡", en: "Gemini proof points · cloud margin inflection" } },
};
(function enrichGap() {
  // 종목별 갭 튜닝: gap=내재가치 대비 현재가 저평가%, dwellQ=저평가 연속 분기, ivTrend=가치추세(논제훼손 판정용)
  const TUNE = {
    "005930": { gap: 18, dwellQ: 5, ivTrend: 6 },   // 삼성 — 깊은 저평가, 오래 기다림
    "000660": { gap: 9, dwellQ: 3, ivTrend: 10 },    // 하이닉스 — 보통
    "AAPL": { gap: 2, dwellQ: 1, ivTrend: 4 },       // Apple — 목표가 근접
    "NVDA": { gap: -6, dwellQ: 0, ivTrend: 12 },     // NVIDIA — 고평가
    "TSLA": { gap: -10, dwellQ: 0, ivTrend: -3 },    // Tesla — 고평가
    "035720": { gap: 24, dwellQ: 6, ivTrend: -8 },   // 카카오 — 깊은 저평가지만 논제 훼손(가치 하락)
    "005380": { gap: 16, dwellQ: 4, ivTrend: 9 },    // 현대차 — 깊은 저평가
    "035420": { gap: 14, dwellQ: 4, ivTrend: 7 },    // NAVER — 저평가
    "GOOGL": { gap: 11, dwellQ: 2, ivTrend: 8 },     // 구글 — 저평가
  };
  PLANS.forEach(p => {
    const baseSc = p.scenarios.find(s => s.label && s.label.en === "Base") || p.scenarios[1] || p.scenarios[0];
    const tu = TUNE[p.ticker] || { gap: 8, dwellQ: 2, ivTrend: 5 };
    const iv = Math.round(p.currentPrice * (1 + tu.gap / 100));  // 현재가 기준 목표 갭으로 내재가치 설정
    p.iv = iv;
    p.ivUpdatedAt = p.updatedAt;
    const rnd = (v) => p.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v / 10) * 10;
    const ivStart = iv / (1 + tu.ivTrend / 100);               // 가치 추세(상승/하락)
    p.ivHistory = [0, 1, 2, 3, 4, 5].map(i => ({ q: i, v: rnd(ivStart + (iv - ivStart) * (i / 5)) }));
    // 가격 히스토리: 최근 dwellQ 분기는 내재가치 아래(저평가 체류), 그 이전은 위
    p.priceHistory = [0, 1, 2, 3, 4, 5].map(i => {
      const ivAtI = ivStart + (iv - ivStart) * (i / 5);
      const underwater = i >= (6 - tu.dwellQ);
      if (i === 5) return { q: i, v: p.currentPrice };
      const f = underwater ? (0.82 + 0.06 * Math.sin(i * 1.7)) : (1.04 + 0.05 * Math.sin(i * 1.3));
      return { q: i, v: rnd(ivAtI * f) };
    });
    p.gapMonths = tu.dwellQ * 3;
    // 시나리오 목표가 편집 스냅샷(계단식 '내 기준'선용). 마지막 = 현재 목표가.
    const getT = (en) => { const s = p.scenarios.find(x => x.label && x.label.en === en); return s ? s.target : null; };
    const bN2 = getT("Base") || iv, uN2 = getT("Bull") || Math.round(iv * 1.25), dN2 = getT("Bear") || Math.round(iv * 0.75);
    let snapQs;
    if (tu.dwellQ >= 5) snapQs = [0];                 // 장기 보유·소신 유지 → 변경 없음(평평)
    else if (tu.ivTrend >= 8) snapQs = [0, 3, 5];     // 가치 상승에 맞춰 목표가 2회 상향
    else if (tu.ivTrend <= -3) snapQs = [0, 4];       // 논제 약화로 목표가 하향
    else snapQs = [0, 2];                              // 초반 1회 수정
    const lastQ = snapQs[snapQs.length - 1];
    const oldF = 1 / (1 + tu.ivTrend / 100);          // 과거(q=0) 목표가 배율
    p.scenarioHistory = snapQs.map((qi, k) => {
      const isLast = k === snapQs.length - 1;
      const f = isLast ? 1 : (lastQ ? (oldF + (1 - oldF) * (qi / lastQ)) : 1);
      return { q: qi, base: rnd(bN2 * f), bull: rnd(uN2 * f), bear: rnd(dN2 * f) };
    });
    const note = GAP_NOTES[p.ticker];
    p.gapReason = note ? note.reason : (baseSc ? baseSc.thesis : { ko: "", en: "" });
    p.catalyst = note ? note.catalyst : { ko: "", en: "" };
  });
})();

(function assignExec() {
  const m = { "PLN-001": "ex1", "PLN-002": "ex1", "PLN-005": "ex1", "PLN-006": "ex1", "PLN-010": "ex1", "PLN-004": "ex2", "PLN-003": "ex7", "PLN-007": "ex5", "PLN-008": "ex7", "PLN-009": null, "PLN-011": "ex4" };
  PLANS.forEach(p => { p.execId = (p.id in m) ? m[p.id] : "ex1"; });
})();
/* ============ 재무 시계열 + 투자지표 보강 ============ */
// 플랜에 단년 eps/sharesOut만 있으므로, 종목별 5년 재무 시계열을 합성한다.
// FIN_SEED = {ticker: {rev5(매출 5년, 십억/native), opm(영업이익률%), npm(순이익률%), roe, debt(부채비율%), curr(유동비율%), divy(배당수익률%), revg(매출성장%)}}
const FIN_SEED = {
  "005930": { unit: 1e12, rev: [236.8, 279.6, 302.2, 258.9, 300.9], opm: [15.2, 18.5, 14.3, 2.5, 10.9], npm: 11.4, roe: 8.6, gpm: 37, debt: 28, curr: 248, divy: 2.0, revg: 16.2 },
  "000660": { unit: 1e12, rev: [31.9, 43.0, 44.6, 32.8, 66.2], opm: [15.7, 28.9, 15.3, -23.6, 35.5], npm: 29.9, roe: 27.7, gpm: 43, debt: 70, curr: 120, divy: 0.8, revg: 101.8 },
  "AAPL": { unit: 1e9, rev: [274.5, 365.8, 394.3, 383.3, 391.0], opm: [24.1, 29.8, 30.3, 29.8, 31.5], npm: 24.0, roe: 164.6, gpm: 46, debt: 540, curr: 87, divy: 0.4, revg: 2.0 },
  "NVDA": { unit: 1e9, rev: [16.7, 26.9, 27.0, 60.9, 130.5], opm: [27.2, 37.3, 20.7, 54.1, 62.4], npm: 55.8, roe: 91.9, gpm: 75, debt: 41, curr: 444, divy: 0.03, revg: 114.2 },
  "TSLA": { unit: 1e9, rev: [31.5, 53.8, 81.5, 96.8, 97.7], opm: [6.3, 12.1, 16.8, 9.2, 7.8], npm: 7.3, roe: 20.4, gpm: 18, debt: 45, curr: 187, divy: 0, revg: 0.9 },
  "035720": { unit: 1e12, rev: [4.2, 6.1, 7.1, 7.6, 7.9], opm: [12.0, 9.8, 8.5, 7.2, 6.5], npm: 4.0, roe: 3.1, gpm: 30, debt: 38, curr: 140, divy: 0.2, revg: 3.9 },
  "005380": { unit: 1e12, rev: [104.0, 117.6, 142.2, 162.7, 175.2], opm: [2.7, 5.7, 6.9, 9.3, 8.1], npm: 7.5, roe: 14.2, gpm: 20, debt: 175, curr: 130, divy: 4.6, revg: 7.7 },
  "035420": { unit: 1e12, rev: [5.3, 6.8, 8.2, 9.7, 10.7], opm: [21.0, 19.4, 16.9, 14.1, 14.5], npm: 18.0, roe: 7.1, gpm: 40, debt: 42, curr: 120, divy: 0.5, revg: 10.3 },
  "GOOGL": { unit: 1e9, rev: [182.5, 257.6, 282.8, 307.4, 350.0], opm: [22.6, 30.6, 26.5, 27.4, 32.0], npm: 27.0, roe: 30.8, gpm: 57, debt: 33, curr: 180, divy: 0.5, revg: 13.9 },
  "005490": { unit: 1e12, rev: [57.8, 76.3, 84.8, 77.1, 72.7], opm: [4.2, 9.2, 7.1, 4.6, 4.9], npm: 4.6, roe: 5.8, gpm: 14, debt: 78, curr: 175, divy: 3.4, revg: -5.7 },
  "207940": { unit: 1e12, rev: [1.16, 1.57, 3.01, 3.69, 4.55], opm: [25.0, 34.3, 32.6, 30.7, 31.5], npm: 24.5, roe: 11.2, gpm: 45, debt: 38, curr: 220, divy: 0, revg: 23.3 },
  "MSFT": { unit: 1e9, rev: [143.0, 168.1, 198.3, 211.9, 245.1], opm: [37.0, 41.6, 42.1, 41.8, 44.6], npm: 36.0, roe: 38.5, gpm: 69, debt: 75, curr: 130, divy: 0.7, revg: 15.7 },
  "AMD": { unit: 1e9, rev: [9.76, 16.4, 23.6, 22.7, 25.8], opm: [14.0, 22.2, 5.4, 1.8, 8.0], npm: 6.5, roe: 5.1, gpm: 50, debt: 14, curr: 250, divy: 0, revg: 13.7 },
  "TSM": { unit: 1e9, rev: [45.5, 56.8, 73.6, 69.3, 90.0], opm: [42.3, 40.9, 49.5, 42.6, 45.7], npm: 40.0, roe: 27.8, gpm: 54, debt: 28, curr: 230, divy: 1.4, revg: 30.0 },
};
const IND_THRESH = { PER: { dir: "low", good: 10, warn: 25 }, PBR: { dir: "low", good: 1, warn: 3 }, PSR: { dir: "low", good: 1.5, warn: 6 }, PCR: { dir: "low", good: 8, warn: 20 }, EVEB: { dir: "low", good: 8, warn: 18 }, PEG: { dir: "low", good: 1, warn: 2 }, ROE: { dir: "high", good: 15, warn: 5 }, ROA: { dir: "high", good: 8, warn: 2 }, OPM: { dir: "high", good: 12, warn: 5 }, NPM: { dir: "high", good: 8, warn: 2 }, GPM: { dir: "high", good: 40, warn: 20 }, REVG: { dir: "high", good: 10, warn: 0 }, OPG: { dir: "high", good: 10, warn: 0 }, NPG: { dir: "high", good: 10, warn: 0 }, DEBT: { dir: "low", good: 100, warn: 200 }, CURR: { dir: "high", good: 150, warn: 100 }, INTCOV: { dir: "high", good: 5, warn: 1.5 }, DIVY: { dir: "high", good: 3, warn: 1 }, PAYOUT: { dir: "high", good: 30, warn: 10 }, DIVG: { dir: "high", good: 5, warn: 0 } };
function gradeOf(key, v) { const t = IND_THRESH[key]; if (!t || v == null || !isFinite(v)) return "neutral"; if (t.dir === "low") return v <= t.good ? "good" : v >= t.warn ? "bad" : "mid"; return v >= t.good ? "good" : v <= t.warn ? "bad" : "mid"; }
// 관점(렌즈)별 채점 임계값 — 관점에 thresholds 오버라이드가 있으면 그걸, 없으면 전역 IND_THRESH를 쓴다. (하이브리드: 전역 기본 + 관점이 핵심 지표만 재정의)
function lensThreshOf(fwId, key) { const fw = (typeof STRATEGIES !== "undefined" && fwId && fwId !== "none") ? STRATEGIES.find(s => s.id === fwId) : null; return (fw && fw.thresholds && fw.thresholds[key]) || IND_THRESH[key] || null; }
function gradeWithFw(fwId, key, v) { const t = lensThreshOf(fwId, key); if (!t || v == null || !isFinite(v)) return "neutral"; if (t.dir === "low") return v <= t.good ? "good" : v >= t.warn ? "bad" : "mid"; return v >= t.good ? "good" : v <= t.warn ? "bad" : "mid"; }
function buildFin(ticker, px, eps, sharesOut) {
  const years = ["2020", "2021", "2022", "2023", "2024"];
  const s = FIN_SEED[ticker]; if (!s) return null;
  {
    const per = eps ? px / eps : null, pbr = s.roe ? per * (s.roe / 100) : null;
    const tax = 0.22;                                  // 유효법인세율 가정
    const daR = s.unit === 1e12 ? 0.06 : 0.04;         // 감가상각/매출
    const capexR = (s.gpm >= 60 ? 0.05 : s.debt >= 150 ? 0.05 : 0.07); // capex/매출
    const lastRev = s.rev[s.rev.length - 1];
    // 손익계산서(IS) — 5년 풀라인
    const is = years.map((y, i) => {
      const rev = s.rev[i] * s.unit;
      const cogs = rev * (1 - s.gpm / 100);
      const gross = rev - cogs;
      const op = rev * (s.opm[i] / 100);
      const sga = gross - op;
      const nonOp = rev * 0.005 * (i % 2 ? 1 : -1);     // 영업외손익(소액)
      const pretax = op + nonOp;
      const taxAmt = pretax > 0 ? pretax * tax : 0;
      const net = rev * (s.npm / 100) * (s.opm[i] >= 0 ? 1 : 0.4);
      return { y, rev, cogs, gross, sga, op, nonOp, pretax, tax: taxAmt, net, opm: s.opm[i] };
    });
    // 재무상태표(BS) — 자본=순이익/ROE, 부채=자본×부채비율, 자산=자본+부채. 5년 역산(매출 비례)
    const lastNet = is[is.length - 1].net;
    const equityLast = s.roe ? lastNet / (s.roe / 100) : lastRev * s.unit * 0.5;
    const bs = years.map((y, i) => {
      const scale = s.rev[i] / lastRev;                 // 규모 프록시
      const equity = equityLast * (0.78 + 0.22 * scale);
      const liab = equity * (s.debt / 100);
      const assets = equity + liab;
      const curLiab = liab / (1 + (s.debt > 120 ? 1.2 : 0.6));
      const curAssets = curLiab * (s.curr / 100);
      return { y, curAssets, nonCurAssets: assets - curAssets, assets, curLiab, nonCurLiab: liab - curLiab, liab, equity };
    });
    // 현금흐름표(CF) — 5년
    const cf = years.map((y, i) => {
      const rev = s.rev[i] * s.unit, net = is[i].net;
      const da = rev * daR;
      const wc = -rev * 0.01 * (i % 2 ? 1 : -1);
      const ocf = net + da + wc;
      const capex = -rev * capexR;
      const icf = capex - rev * 0.005;
      const div = -(net > 0 ? net * (s.divy > 0 ? 0.3 : 0) : 0);
      const fcf_fin = div - rev * 0.01;
      return { y, ocf, da, capex, icf, fcf_fin, net: ocf + icf + fcf_fin, fcf: ocf + capex };
    });
    return {
      unit: s.unit, rows: is, is, bs, cf,
      indicators: (() => {
        const shares = (sharesOut || 1) * 1e6;
        const L = is[is.length - 1], P0 = is[is.length - 2], lastBs = bs[bs.length - 1];
        const sps = L.rev / shares, pcf = cf[cf.length - 1].ocf / shares;
        const psr = sps > 0 ? px / sps : null;
        const pcr = pcf > 0 ? px / pcf : null;
        const mktcap = px * shares, netDebt = lastBs.liab - (cf[cf.length - 1].ocf * 0.4);
        const ebitda = L.op * 1.18;
        const eveb = ebitda > 0 ? (mktcap + Math.max(0, netDebt)) / ebitda : null;
        const peg = (per && s.revg > 0) ? per / s.revg : null;
        const roa = lastBs.assets > 0 ? L.net / lastBs.assets * 100 : null;
        const opg = P0.op ? (L.op - P0.op) / Math.abs(P0.op) * 100 : null;
        const npg = P0.net ? (L.net - P0.net) / Math.abs(P0.net) * 100 : null;
        const payout = (s.divy != null && per) ? s.divy * per : null;   // 배당성향 = 배당수익률 × PER
        const divg = s.divg != null ? s.divg : (s.divy > 0 ? 6 : 0);     // 배당성장률
        const intcov = L.op > 0 ? L.op / Math.max(1, lastBs.liab * 0.03) : null; // 이자보상배율
        return [
          { key: "PER", cat: "value", v: per, fmt: "x" },
          { key: "PBR", cat: "value", v: pbr, fmt: "x" },
          { key: "PSR", cat: "value", v: psr, fmt: "x" },
          { key: "PCR", cat: "value", v: pcr, fmt: "x" },
          { key: "EVEB", cat: "value", v: eveb, fmt: "x" },
          { key: "PEG", cat: "value", v: peg, fmt: "x" },
          { key: "ROE", cat: "profit", v: s.roe, fmt: "pct" },
          { key: "ROA", cat: "profit", v: roa, fmt: "pct" },
          { key: "OPM", cat: "profit", v: s.opm[s.opm.length - 1], fmt: "pct" },
          { key: "NPM", cat: "profit", v: s.npm, fmt: "pct" },
          { key: "GPM", cat: "profit", v: s.gpm, fmt: "pct" },
          { key: "REVG", cat: "growth", v: s.revg, fmt: "pct" },
          { key: "OPG", cat: "growth", v: opg, fmt: "pct" },
          { key: "NPG", cat: "growth", v: npg, fmt: "pct" },
          { key: "DEBT", cat: "stability", v: s.debt, fmt: "pct" },
          { key: "CURR", cat: "stability", v: s.curr, fmt: "pct" },
          { key: "INTCOV", cat: "stability", v: intcov, fmt: "x" },
          { key: "DIVY", cat: "dividend", v: s.divy, fmt: "pct" },
          { key: "PAYOUT", cat: "dividend", v: payout, fmt: "pct" },
          { key: "DIVG", cat: "dividend", v: divg, fmt: "pct" },
        ].map(m => ({ ...m, tone: gradeOf(m.key, m.v) }));
      })(),
    };
  }
}
const FIN_CACHE = {};
function finOf(ticker, px, eps, sharesOut) { if (!(ticker in FIN_CACHE)) FIN_CACHE[ticker] = buildFin(ticker, px, eps, sharesOut); return FIN_CACHE[ticker]; }
(function enrichFin() {
  PLANS.forEach(p => { const f = buildFin(p.ticker, p.currentPrice, p.eps, p.sharesOut); if (f) p.fin = f; });
})();

/* ============ helpers ============ */
// ===== global display currency (app-level) =====
// Money values are stored/passed in each plan's NATIVE currency. A global display
// preference (null = native) converts every fmtMoney/fmtCompact call at format time,
// so no call site needs the display currency threaded through. FX is a single mock
// constant today — swap KEYSTONE_FX for a live rate later and the whole app reflows.
let KEYSTONE_FX = 1380;            // ₩ per $ (mock; replace with live API rate later)

// recently-viewed securities (most-recent-first ticker list, persisted) — used to
// rank the default search list so "All" surfaces what you actually touch, not array order.
const SEC_RECENT_KEY = "keystone-sec-recent-v1";
function getSecRecents() { try { return JSON.parse(localStorage.getItem(SEC_RECENT_KEY)) || []; } catch (e) { return []; } }
function pushSecRecent(ticker) { if (!ticker) return; try { const next = [ticker, ...getSecRecents().filter(x => x !== ticker)].slice(0, 16); localStorage.setItem(SEC_RECENT_KEY, JSON.stringify(next)); } catch (e) {} }

let KEYSTONE_DISP = null;          // null | "KRW" | "USD"
function setDisplayCurrency(c) { KEYSTONE_DISP = c || null; }
function setFxRate(r) { if (r > 0) KEYSTONE_FX = r; }
function getFxRate() { return KEYSTONE_FX; }
// convert a native-currency amount to the active display currency
function toDispCur(n, planCur) {
  const pc = planCur || "KRW";
  if (!KEYSTONE_DISP || KEYSTONE_DISP === pc) return { v: n, cur: pc };
  const v = pc === "KRW" ? n / KEYSTONE_FX : n * KEYSTONE_FX;
  return { v, cur: KEYSTONE_DISP };
}
function fmtMoney(n, cur) {
  if (n == null) return "—";
  const d = toDispCur(n, cur);
  if (d.cur === "USD") return "$" + d.v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "₩" + Math.round(d.v).toLocaleString("en-US");
}
function fmtCompact(n, cur) {
  if (n == null) return "—";
  const d = toDispCur(n, cur);
  if (d.cur === "USD") return "$" + (d.v >= 1000 ? d.v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : d.v.toFixed(2));
  return "₩" + Math.round(d.v).toLocaleString("en-US");
}
// market-cap formatter — respects the active display currency (자동/원화/달러), then ROLLING units (억↔조↔경 · B↔T).
function fmtMktCap(nativeTotal, cur) {
  if (nativeTotal == null || !isFinite(nativeTotal) || nativeTotal <= 0) return "—";
  const d = toDispCur(nativeTotal, cur);
  const isUSD = d.cur === "USD";
  const units = isUSD
    ? [{ s: "B", b: 1e9 }, { s: "T", b: 1e12 }]
    : [{ s: "억", b: 1e8 }, { s: "조", b: 1e12 }, { s: "경", b: 1e16 }];
  let u = units[0];
  for (const x of units) if (d.v >= x.b) u = x;
  const v = d.v / u.b;
  const num = v.toFixed(v >= 100 ? 0 : 1);
  return isUSD ? "$" + num + u.s : num + u.s;
}
// return rate from avg & current
function planReturn(p) {
  if (p.avgPrice == null || !p.totalShares) return null;
  const rate = (p.currentPrice - p.avgPrice) / p.avgPrice * 100;
  const amt = (p.currentPrice - p.avgPrice) * p.totalShares;
  return { rate, amt };
}
// planTag — the distinguishing part of a plan name, with the ticker name stripped so it reads as a
// subtitle next to the (separately shown) ticker. "삼성전자 메모리 저평가" → "메모리 저평가".
// If the name doesn't contain the ticker name, return it whole (e.g. "코리아 디스카운트").
function planTag(p, lang) {
  const full = (p.name && (p.name[lang] || p.name.en)) || "";
  const tk = (p.tickerName && (p.tickerName[lang] || p.tickerName.en)) || "";
  if (!tk) return full;
  let out = full;
  // strip the ticker name wherever it sits, then tidy leftover separators/space
  out = out.split(tk).join(" ").replace(/\s{2,}/g, " ").replace(/^[\s\u00b7:,\-]+|[\s\u00b7:,\-]+$/g, "").trim();
  return out || full;
}
// localized dates: createdAt is an absolute "Mon D"; updatedAt is relative ("2d"/"4h"/"now") or absolute.
const MON_KO = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// App "today" anchor — bare "Mon D" dates have no year, so infer the most recent past occurrence.
const KS_REF = { y: 2026, mo: 6, d: 26 };
function inferYear(mo, d) { return (mo < KS_REF.mo || (mo === KS_REF.mo && d <= KS_REF.d)) ? KS_REF.y : KS_REF.y - 1; }
function fmtDate(s, lang) {
  if (!s) return s;
  // "Mon D" or "Mon D, YYYY" → infer year if absent; show the year only when it isn't the current year.
  const m = /^([A-Z][a-z]{2})\s+(\d+)(?:,?\s+(\d{4}))?$/.exec(s);
  if (!m || !MON_KO[m[1]]) return s;
  const mo = MON_KO[m[1]], d = +m[2];
  const yr = m[3] ? +m[3] : inferYear(mo, d);
  const showY = yr !== KS_REF.y;
  if (lang === "ko") return (showY ? yr + "년 " : "") + mo + "월 " + d + "일";
  return MON_EN[mo - 1] + " " + d + (showY ? ", " + yr : "");
}
function fmtRel(s, lang) {
  if (!s) return s;
  if (lang === "ko") {
    if (s === "now") return "방금";
    let m;
    if (m = /^(\d+)d$/.exec(s)) return m[1] + "일 전";
    if (m = /^(\d+)h$/.exec(s)) return m[1] + "시간 전";
    if (m = /^(\d+)mo$/.exec(s)) return m[1] + "개월 전";
    if (m = /^(\d+)y$/.exec(s)) return m[1] + "년 전";
    if (m = /^today(?:\s+(\d{1,2}:\d{2}))?$/i.exec(s)) return "오늘" + (m[1] ? " " + m[1] : "");
    if (m = /^yesterday(?:\s+(\d{1,2}:\d{2}))?$/i.exec(s)) return "어제" + (m[1] ? " " + m[1] : "");
    if (m = /^([A-Z][a-z]{2})\s+(\d+)\s+(\d{1,2}:\d{2})$/.exec(s)) return fmtDate(m[1] + " " + m[2], lang) + " " + m[3];
    return fmtDate(s, lang);
  }
  // en: relative strings pass through; absolute dates get year-aware formatting
  if (s === "now" || /^\d+(d|h|mo|y)$/.test(s)) return s;
  return fmtDate(s, "en");
}
// gauge geometry: position of current price between bear & bull targets
const SC_LABEL_MAP = { Bull: { en: "Bull", ko: "상단" }, Base: { en: "Base", ko: "중간" }, Bear: { en: "Bear", ko: "하단" } };
function scLabel(enKey, lang) { return (SC_LABEL_MAP[enKey] || {})[lang] || enKey; }
// derive take-profit / stop-loss price from a plan's strategy fields (if defined)
function planActionLines(p) {
  const out = {};
  // per-plan overrides (set by dragging the SL/TP ticks) win over strategy-field defaults
  const st = STRATEGIES.find(s => s.id === p.strategyId);
  if (st && p.avgPrice != null) {
    const fieldPct = (key) => { const f = st.fields.find(x => x.key === key); if (!f) return null; const n = parseFloat(String(f.default).replace('%','')); return isNaN(n) ? null : n / 100; };
    const tp = fieldPct('tp_pct'); if (tp != null) out.tp = p.avgPrice * (1 + tp);
    const sl = fieldPct('stop_line'); if (sl != null) out.sl = p.avgPrice * (1 + sl);
  }
  if (p.tpPrice != null) out.tp = p.tpPrice;
  if (p.slPrice != null) out.sl = p.slPrice;
  return out;
}

// METRIC_DEFS — plain-language definitions for the metrics shown on strategy / position / closeout cards.
// Hovering a metric label reveals its def. Keep them terse (Vector voice). Keyed by a stable id.
const KS_METRIC_DEFS = {
  avg_cost:      { ko: "평균 매수 단가 — 취득원가 기준선. 현재가가 이보다 높으면 평가이익.", en: "Average buy price — your cost basis." },
  cur_price:     { ko: "현재 시장가격.", en: "Current market price." },
  eval_value:    { ko: "현재가 × 보유수량 — 지금 청산 시 평가액.", en: "Price × shares held — value if sold now." },
  invested:      { ko: "지금까지 투입한 총 원금.", en: "Total capital deployed so far." },
  pl:            { ko: "평가액 − 투자금. 아직 실현되지 않은 손익.", en: "Value minus cost — unrealized P/L." },
  next_buy:      { ko: "현재가가 이 가격 이하로 내려오면 다음 분할 매수가 발동 (평단 × (1 − LOC 기준)).", en: "Drops here → the next split buy triggers." },
  take_profit:   { ko: "평단 대비 목표 수익률에 닿는 가격. 도달 시 청산을 검토.", en: "Price at the target return — consider closing." },
  progress:      { ko: "전체 분할 회차 중 지금까지 매수한 비율.", en: "Share of total split rounds completed." },
  per_buy:       { ko: "정기 매수마다 투입하는 고정 금액.", en: "Fixed amount bought each period." },
  dca_interval:  { ko: "정기 매수 주기 — 가격과 무관하게 이 주기마다 매수.", en: "Scheduled buy cadence, regardless of price." },
  value_path:    { ko: "매월 목표로 하는 평가액 증가분. 부족하면 더, 넘으면 덜 매수.", en: "Target monthly value growth to track." },
  band_pos:      { ko: "설정 박스권에서 현재가 위치 (하단 0% ~ 상단 100%).", en: "Where price sits in the band (0–100%)." },
  buy_rung:      { ko: "한 칸 아래 그리드 라인 — 닿으면 한 단위 매수.", en: "Next grid line below — buy one rung." },
  sell_rung:     { ko: "한 칸 위 그리드 라인 — 닿으면 한 단위 매도.", en: "Next grid line above — sell one rung." },
  grid_step:     { ko: "한 칸(매수~매도) 사이 가격 간격. (상단 − 하단) ÷ 그리드 수.", en: "Price gap between rungs — (upper − lower) ÷ grids." },
  value_line:    { ko: "매년 일정 비율로 커지는 목표 평가액 경로. 이 선의 상·하단 밴드를 벗어나면 매도/매수.", en: "A target value path that grows yearly; trade when price leaves its bands." },
  sell_band:     { ko: "가치선 상단 밴드에 해당하는 주가 — 넘으면 일부 매도(트림).", en: "Upper-band price — trim above it." },
  buy_band:      { ko: "가치선 하단 밴드에 해당하는 주가 — 이탈하면 현금풀로 매수.", en: "Lower-band price — add below it." },
  rebal_state:   { ko: "가치선 밴드 대비 현재 위치 — 상단 초과면 매도, 하단 이탈이면 매수 신호.", en: "Position vs the value bands — trim above, add below." },
  trailing_stop: { ko: "고점 대비 일정 % 하락하면 청산하는 이탈선. 고점이 오르면 함께 올라감.", en: "Exit line trailing the high by a set %." },
  recent_high:   { ko: "보유 이후 기록한 최고가 — 트레일링 스탑 계산 기준.", en: "Highest price since entry — the stop's anchor." },
  cushion:       { ko: "현재가가 트레일링 스탑보다 얼마나 위에 있는지. 0에 가까울수록 청산 임박.", en: "How far price sits above the trailing stop." },
  lookback:      { ko: "모멘텀(상대강도)을 측정하는 과거 기간.", en: "Window used to measure momentum." },
  equity_target: { ko: "리밸런싱 시 맞추는 주식 비중 목표.", en: "Target equity weight at each rebalance." },
  rebal_cycle:   { ko: "포트폴리오 비중을 다시 맞추는 주기.", en: "How often the allocation is rebalanced." },
  realized_pl:   { ko: "청산으로 확정된 손익 (매도금 − 매수원가).", en: "Locked-in profit/loss from the close." },
  total_bought:  { ko: "보유 기간 동안 매수한 총 수량.", en: "Total shares bought over the holding." },
  hold_period:   { ko: "첫 매수부터 청산까지 보유한 일수.", en: "Days held from first buy to close." },
  shares:        { ko: "현재 보유 중인 주식 수.", en: "Shares currently held." },
};
function metricDef(key) { return key ? (KS_METRIC_DEFS[key] || null) : null; }

// planExecState — normalized "execution state + next signal" per strategy type.
// One place that knows how each strategy's next action is computed, so the strip/tooltip just renders.
// Shape: { ex, type, progress?{round,divisions,pct}, metrics:[{label,value,isMoney?}], signals:[{dir,label,value?,isMoney?,pctText?,sub?}] }
// dir ∈ buy | sell | tp | stop | time | info.  Labels are {en,ko}; values numeric (caller formats with plan.cur).
function planExecState(p) {
  const ex = (typeof EXEC_STRATEGIES !== "undefined") ? EXEC_STRATEGIES.find(s => s.id === p.execId) : null;
  if (!ex) return null;
  const field = (k) => ex.fields ? ex.fields.find(x => x.key === k) : null;
  const fNum = (k, d) => { const f = field(k); if (!f) return d; const n = parseFloat(String(f.default).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? d : n; };
  const fSel = (k) => { const f = field(k); if (!f) return null; if (Array.isArray(f.options)) { const o = f.options.find(o => o.en === f.default); if (o) return o; } return { en: f.default, ko: f.default }; };
  const avg = p.avgPrice || 0, cur = p.currentPrice, shares = p.totalShares || 0;
  const hasPos = shares > 0 && avg > 0;
  // hero = the headline figure for the card; tagline = short type descriptor; cells = stat-grid items.
  const out = { ex, type: "generic", progress: null, hero: null, tagline: null, cells: [] };

  switch (p.execId) {
    case "ex1": { // 무한매수법 — split accumulation, price-triggered buys
      out.type = "split";
      out.tagline = { en: "Split accumulation", ko: "분할 누적 매수" };
      if (p.divisions && p.round != null) {
        const pct = Math.min(100, Math.round(p.round / p.divisions * 100));
        out.progress = { round: p.round, divisions: p.divisions, pct };
        out.hero = { kind: "pct", value: pct, dp: 0, tone: "accent", sub: { en: `round ${p.round}/${p.divisions}`, ko: `${p.round}/${p.divisions}회 진행` }, tip: "progress" };
      }
      if (avg > 0) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      const nextBuy = avg > 0 ? avg * (1 + fNum("loc_pct", -5) / 100) : null;
      if (nextBuy != null && cur > nextBuy) out.cells.push({ dir: "buy", label: { en: "Next buy", ko: "다음 매수가" }, value: nextBuy, isMoney: true, tip: "next_buy" });
      const tp = avg > 0 ? avg * (1 + fNum("tp_pct", 10) / 100) : null;
      if (tp != null) out.cells.push({ dir: "tp", label: { en: "Take profit", ko: "익절" }, value: tp, isMoney: true, tip: "take_profit" });
      break;
    }
    case "ex2": { // 정액분할매수 (DCA) — time-triggered fixed-amount buys
      out.type = "dca";
      out.tagline = { en: "Dollar-cost averaging", ko: "정액 분할" };
      const interval = fSel("interval") || { en: "Weekly", ko: "매주" };
      const amount = fNum("amount", 0);
      out.hero = { kind: "text", value: interval, tone: "accent", sub: { en: "scheduled buy", ko: "정기 매수" }, tip: "dca_interval" };
      out.cells.push({ dir: "time", label: { en: "Per buy", ko: "회당 매수금" }, value: amount, isMoney: true, tip: "per_buy" });
      if (hasPos) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      break;
    }
    case "ex3": { // 밸류애버리징 — buy toward a growing target value path
      out.type = "value_avg";
      out.tagline = { en: "Value averaging", ko: "경로 추종" };
      const path = fNum("target_path", 0);
      out.hero = { kind: "money", value: path, tone: "accent", sub: { en: "target / month", ko: "월 목표 경로" }, tip: "value_path" };
      if (hasPos) out.cells.push({ label: { en: "Avg cost", ko: "평단가" }, value: avg, isMoney: true, tip: "avg_cost" });
      break;
    }
    case "ex4": { // 그리드 — two-sided rungs across a price band
      out.type = "grid";
      out.tagline = { en: "Grid band", ko: "박스권 격자" };
      const up = fNum("upper", 0), lo = fNum("lower", 0), grids = Math.max(1, fNum("grids", 10));
      const step = (up - lo) / grids;
      if (step > 0) {
        const posPct = Math.max(0, Math.min(100, (cur - lo) / ((up - lo) || 1) * 100));
        out.hero = { kind: "pct", value: posPct, dp: 0, tone: "neutral", sub: { en: "position in band", ko: "밴드 내 위치" }, tip: "band_pos" };
        let buyLine = null, sellLine = null;
        for (let i = 0; i <= grids; i++) { const line = lo + i * step; if (line < cur - 1e-6) buyLine = line; if (line > cur + 1e-6 && sellLine == null) sellLine = line; }
        if (buyLine != null) out.cells.push({ dir: "buy", label: { en: "Buy rung", ko: "하단 매수" }, value: buyLine, isMoney: true, tip: "buy_rung" });
        if (sellLine != null) out.cells.push({ dir: "sell", label: { en: "Sell rung", ko: "상단 매도" }, value: sellLine, isMoney: true, tip: "sell_rung" });
        out.cells.push({ label: { en: "Rung gap", ko: "그리드 간격" }, value: step, isMoney: true, tip: "grid_step" });
      }
      break;
    }
    case "ex5": { // 밸류리밸런싱 — trim above upper band / add below lower band of a value line
      out.type = "rebal";
      out.tagline = { en: "Value rebalance", ko: "가치선 밴드" };
      const upBand = fNum("vr_upper", 15) / 100, loBand = fNum("vr_lower", 15) / 100;
      let V = fNum("vr_vline", 0);
      if (!V) V = p.totalInvested || (avg * shares) || (cur * shares);
      if (V > 0 && shares > 0) {
        const sellPx = (V * (1 + upBand)) / shares, buyPx = (V * (1 - loBand)) / shares;
        if (cur > sellPx) out.hero = { kind: "pct", value: (cur / sellPx - 1) * 100, dp: 1, sign: "+", tone: "neg", sub: { en: "above band · trim", ko: "상단 초과 · 매도" }, tip: "rebal_state" };
        else if (cur < buyPx) out.hero = { kind: "pct", value: (1 - cur / buyPx) * 100, dp: 1, sign: "−", tone: "pos", sub: { en: "below band · add", ko: "하단 이탈 · 매수" }, tip: "rebal_state" };
        else out.hero = { kind: "text", value: { en: "In band", ko: "밴드 내" }, tone: "neutral", sub: { en: "holding", ko: "리밸런싱 대기" }, tip: "rebal_state" };
        out.cells.push({ dir: "sell", label: { en: "Sell band", ko: "상단 매도" }, value: sellPx, isMoney: true, tip: "sell_band" });
        out.cells.push({ dir: "buy", label: { en: "Buy band", ko: "하단 매수" }, value: buyPx, isMoney: true, tip: "buy_band" });
        out.cells.push({ label: { en: "Value line", ko: "가치선" }, value: V, isMoney: true, tip: "value_line" });
      }
      break;
    }
    case "ex6": { // 6:4 자산배분 — periodic allocation target (portfolio-level)
      out.type = "alloc";
      out.tagline = { en: "Asset allocation", ko: "자산배분" };
      const eq = fNum("equity_w", 60); const cyc = fSel("rebal") || { en: "Quarterly", ko: "분기마다" };
      out.hero = { kind: "pct", value: eq, dp: 0, tone: "neutral", sub: { en: "equity target", ko: "주식 목표비중" }, tip: "equity_target" };
      out.cells.push({ dir: "time", label: { en: "Rebalance", ko: "리밸런싱" }, value: cyc, isText: true, tip: "rebal_cycle" });
      break;
    }
    case "ex7": { // 모멘텀 — ride trend, exit on trailing stop (a SELL/exit line, not a buy)
      out.type = "momentum";
      out.tagline = { en: "Trend follow", ko: "추세 추종" };
      const stopPct = fNum("stop", -15) / 100;
      let high = cur;
      const ph = p.priceHistory;
      if (Array.isArray(ph) && ph.length) high = Math.max(high, ...ph.map(x => typeof x === "number" ? x : (x && (x.v ?? x.price ?? x.close)) || 0));
      high = Math.max(high, avg || 0);
      const stopPx = high * (1 + stopPct);
      const cushion = (cur - stopPx) / cur * 100;
      out.hero = { kind: "pct", value: cushion, dp: 1, sign: cushion >= 0 ? "+" : "−", tone: cushion >= 0 ? "pos" : "neg", sub: { en: "cushion to stop", ko: "스탑까지 여력" }, tip: "cushion" };
      out.cells.push({ label: { en: "Recent high", ko: "고점" }, value: high, isMoney: true, tip: "recent_high" });
      out.cells.push({ dir: "stop", label: { en: "Trailing stop", ko: "트레일링 스탑" }, value: stopPx, isMoney: true, tip: "trailing_stop" });
      const lb = field("lookback");
      if (lb) out.cells.push({ label: { en: "Lookback", ko: "조회 기간" }, value: String(lb.default), isText: true, tip: "lookback" });
      break;
    }
  }
  return out;
}
function gaugeData(p) {
  const bull = p.scenarios.find(s => s.label.en === "Bull");
  const base = p.scenarios.find(s => s.label.en === "Base");
  const bear = p.scenarios.find(s => s.label.en === "Bear");
  if (!bull || !bear) return null;
  // exit price for closed plans = last sell execution
  const sells = (p.executions || []).filter(e => e.side === "sell");
  const exitPrice = sells.length ? sells[0].price : null;
  // primary price: closed → exit, else current
  const primary = (p.status === "closed" && exitPrice != null) ? exitPrice : p.currentPrice;
  const hasAvg = p.avgPrice != null && ["active", "paused", "closing", "closed"].includes(p.status);
  const cand = [bear.target, bull.target, primary, p.currentPrice, ...p.scenarios.map(s => s.target)];
  if (hasAvg) cand.push(p.avgPrice);
  const lo = Math.min(...cand) * 0.99;
  const hi = Math.max(...cand) * 1.01;
  const span = (hi - lo) || 1;
  const at = (v) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  return {
    lo, hi, bull, base, bear,
    bearPos: at(bear.target), basePos: base ? at(base.target) : 50, bullPos: at(bull.target),
    pos: at(primary), primary, exitPrice,
    avgPos: hasAvg ? at(p.avgPrice) : null, avgPrice: hasAvg ? p.avgPrice : null,
    isExit: p.status === "closed" && exitPrice != null,
    dim: p.status === "closed",
  };
}

// adaptive shares-outstanding display. Input is in MILLIONS of shares.
// ko: 억 주 when ≥ 1억 (100M), else 만 주 — covers small-float stocks naturally.
// en: B when ≥ 1000M, else M.
function sharesDisp(m, lang) {
  if (!(m > 0)) return { v: 0, suf: lang === "ko" ? "주" : "" };
  if (lang === "ko") {
    if (m >= 100) return { v: +(m / 100).toFixed(m / 100 >= 100 ? 0 : 1), suf: "억 주" };
    return { v: Math.round(m * 100), suf: "만 주" };
  }
  if (m >= 1000) return { v: +(m / 1000).toFixed(1), suf: "B" };
  return { v: Math.round(m), suf: "M" };
}
function fmtShares(m, lang) { const d = sharesDisp(m, lang); return d.v.toLocaleString("en-US") + (d.suf && /[A-Z]/.test(d.suf) ? "" : " ") + d.suf; }

Object.assign(window, {
  sharesDisp, fmtShares,
  I18N, PLAN_STATUS, STATUS_ORDER, PORTFOLIOS, STRATEGIES, EXEC_STRATEGIES, EXEC_CATS, catLabel, saveCats, PLANS, finOf, buildFin,
  fmtMoney, fmtCompact, fmtMktCap, planReturn, planTag, gaugeData, WF_TYPE, scLabel, planActionLines, planExecState, metricDef,
  setDisplayCurrency, setFxRate, getFxRate, toDispCur, fmtDate, fmtRel,
});
