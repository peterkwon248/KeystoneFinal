// securities.jsx — Security (종목) = 1st-class shared entity.
// Market data (price/EPS/shares) here is MOCK; real data wires in later.
// perLo/perHi = mock 5yr trailing PER band per security — drives auto-generated
// Bull/Base/Bear defaults (Bull=EPS×perHi, Bear=EPS×perLo). Swap with real
// historical-band data via API later (same pattern as the FX constant).
// (Claude Code). The chart is a placeholder area chart.

// deterministic pseudo price-path for the placeholder chart
function genSpark(seed, base, n = 40) {
  const pts = []; let v = base * 0.82; let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.46) * base * 0.045;
    v = Math.max(base * 0.6, Math.min(base * 1.25, v));
    pts.push(v);
  }
  pts[n - 1] = base; // end at current price
  return pts;
}

const SECURITIES = [
  // ---- KR ----
  { ticker: "005930", name: { en: "Samsung Electronics", ko: "삼성전자" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 71200, change: 1.86, eps: 4830, sharesOut: 5969, perLo: 9, perHi: 18, sector: { en: "Semiconductors", ko: "반도체" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "KOSPI", watched: true },
  { ticker: "000660", name: { en: "SK hynix", ko: "SK하이닉스" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 178000, change: 3.12, eps: 9870, sharesOut: 728, perLo: 6, perHi: 20, sector: { en: "Semiconductors", ko: "반도체" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "KOSPI", watched: true },
  { ticker: "035720", name: { en: "Kakao", ko: "카카오" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 41200, change: -2.04, eps: 1240, sharesOut: 4434, perLo: 25, perHi: 55, sector: { en: "Internet", ko: "인터넷" }, gics: { en: "Communication Services", ko: "커뮤니케이션" }, exchange: "KOSPI", watched: false },
  { ticker: "005380", name: { en: "Hyundai Motor", ko: "현대차" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 248000, change: 0.81, eps: 47200, sharesOut: 209, perLo: 4, perHi: 8, sector: { en: "Autos", ko: "자동차" }, gics: { en: "Consumer Discretionary", ko: "경기소비재" }, exchange: "KOSPI", watched: false },
  { ticker: "035420", name: { en: "NAVER", ko: "NAVER" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 168500, change: -0.59, eps: 11200, sharesOut: 164, perLo: 13, perHi: 30, sector: { en: "Internet", ko: "인터넷" }, gics: { en: "Communication Services", ko: "커뮤니케이션" }, exchange: "KOSPI", watched: true },
  { ticker: "005490", name: { en: "POSCO Holdings", ko: "POSCO홀딩스" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 392000, change: 2.35, eps: 31800, sharesOut: 84, perLo: 7, perHi: 16, sector: { en: "Materials", ko: "소재" }, gics: { en: "Materials", ko: "소재" }, exchange: "KOSPI", watched: true },
  { ticker: "207940", name: { en: "Samsung Biologics", ko: "삼성바이오로직스" }, market: "KR", flag: "🇰🇷", cur: "KRW", price: 982000, change: -1.12, eps: 24600, sharesOut: 71, perLo: 35, perHi: 70, sector: { en: "Bio", ko: "바이오" }, gics: { en: "Health Care", ko: "헬스케어" }, exchange: "KOSPI", watched: false },
  // ---- US ----
  { ticker: "AAPL", name: { en: "Apple", ko: "Apple" }, market: "US", flag: "🇺🇸", cur: "USD", price: 198.50, change: -0.92, eps: 6.43, sharesOut: 15204, perLo: 20, perHi: 34, sector: { en: "Hardware", ko: "하드웨어" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "NASDAQ", watched: true },
  { ticker: "NVDA", name: { en: "NVIDIA", ko: "NVIDIA" }, market: "US", flag: "🇺🇸", cur: "USD", price: 1185.00, change: 4.10, eps: 18.90, sharesOut: 2460, perLo: 35, perHi: 75, sector: { en: "Semiconductors", ko: "반도체" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "NASDAQ", watched: true },
  { ticker: "GOOGL", name: { en: "Alphabet", ko: "Alphabet" }, market: "US", flag: "🇺🇸", cur: "USD", price: 176.20, change: 1.34, eps: 7.54, sharesOut: 12300, perLo: 18, perHi: 30, sector: { en: "Internet", ko: "인터넷" }, gics: { en: "Communication Services", ko: "커뮤니케이션" }, exchange: "NASDAQ", watched: false },
  { ticker: "TSLA", name: { en: "Tesla", ko: "Tesla" }, market: "US", flag: "🇺🇸", cur: "USD", price: 242.00, change: -3.21, eps: 3.65, sharesOut: 3180, perLo: 40, perHi: 110, sector: { en: "Autos", ko: "자동차" }, gics: { en: "Consumer Discretionary", ko: "경기소비재" }, exchange: "NASDAQ", watched: true },
  { ticker: "MSFT", name: { en: "Microsoft", ko: "Microsoft" }, market: "US", flag: "🇺🇸", cur: "USD", price: 448.00, change: 0.45, eps: 11.80, sharesOut: 7430, perLo: 25, perHi: 38, sector: { en: "Software", ko: "소프트웨어" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "NASDAQ", watched: false },
  { ticker: "AMD", name: { en: "AMD", ko: "AMD" }, market: "US", flag: "🇺🇸", cur: "USD", price: 162.40, change: 2.88, eps: 2.57, sharesOut: 1620, perLo: 35, perHi: 90, sector: { en: "Semiconductors", ko: "반도체" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "NASDAQ", watched: true },
  { ticker: "TSM", name: { en: "TSMC", ko: "TSMC" }, market: "US", flag: "🇺🇸", cur: "USD", price: 174.30, change: 1.96, eps: 6.85, sharesOut: 5187, perLo: 15, perHi: 28, sector: { en: "Semiconductors", ko: "반도체" }, gics: { en: "Information Technology", ko: "정보기술" }, exchange: "NYSE", watched: false },
];
SECURITIES.forEach((s, i) => { s.spark = genSpark(i * 37 + 11, s.price); });

const MARKETS = [
  { key: "KR", label: { en: "Korea", ko: "한국" }, flag: "🇰🇷" },
  { key: "US", label: { en: "US", ko: "미국" }, flag: "🇺🇸" },
];

function securityOf(ticker) { return SECURITIES.find(s => s.ticker === ticker); }
function plansForTicker(plans, ticker) { return plans.filter(p => p.ticker === ticker); }

// ad-hoc scenarios authored on a security WITHOUT a plan (안1: scenario ⊂ security).
// {id, ticker, label:{en,ko}, color, target, status, thesis:{en,ko}, createdAt}
const SECURITY_SCENARIOS = [
  { id: "scx1", ticker: "005490", label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 520000, status: "tracking", createdAt: "Jun 7",
    thesis: { en: "Steel cycle turns + green-steel premium.", ko: "철강 사이클 반등 + 그린스틸 프리미엄." } },
  { id: "scx2", ticker: "AMD", label: { en: "Bull", ko: "상단" }, color: "var(--r-bull)", target: 220, status: "approaching", createdAt: "Jun 6",
    thesis: { en: "MI300 share gains in AI accelerators.", ko: "MI300 AI 가속기 점유율 상승." } },
  { id: "scx3", ticker: "AMD", label: { en: "Bear", ko: "하단" }, color: "var(--r-bear)", target: 120, status: "tracking", createdAt: "Jun 6",
    thesis: { en: "NVIDIA moat holds, AMD stays #2.", ko: "NVIDIA 해자 견고, AMD 2위 고착." } },
  { id: "scx4", ticker: "207940", label: { en: "Base", ko: "중간" }, color: "var(--r-base)", target: 1050000, status: "tracking", createdAt: "Jun 5",
    thesis: { en: "CDMO capacity ramp on schedule.", ko: "CDMO 증설 일정대로 가동." } },
];
function adhocScenariosForTicker(ticker) { return SECURITY_SCENARIOS.filter(s => s.ticker === ticker); }

// Shared metric dictionary (name + plain-language concept) + formula — SINGLE SOURCE OF TRUTH
// so the screener row tooltips match the security-detail indicator cards exactly (no drift).
function KS_METRIC_DICT(ko) {
  return {
    PER: ["PER", ko ? "지금 주가가 1년 이익의 몇 배인지 보여줘요. 낮을수록 이익 대비 싸게 거래되는 거예요." : "How many years of earnings the price equals — lower is cheaper."],
    PBR: ["PBR", ko ? "주가가 회사 순자산의 몇 배인지예요. 1배보다 낮으면 장부가보다 싸게 팔리는 셈이에요." : "Price vs. net assets — under 1× trades below book value."],
    PSR: ["PSR", ko ? "주가를 매출과 비교해요. 아직 적자거나 빠르게 크는 회사를 볼 때 유용해요." : "Price vs. sales — useful for loss-making or fast-growing firms."],
    PCR: ["PCR", ko ? "주가를 실제 벌어들인 현금과 비교해요. 회계 이익보다 현금이 탄탄한지 봐요." : "Price vs. operating cash — checks cash strength behind profit."],
    EVEB: ["EV/EBITDA", ko ? "빚까지 포함한 회사 전체 값을 영업현금창출력과 비교해요. 인수자 관점의 가격이에요." : "Whole-company value (incl. debt) vs. core cash earnings."],
    PEG: ["PEG", ko ? "PER을 이익 성장률로 나눠요. 1배보다 낮으면 성장에 비해 주가가 싸다는 뜻이에요." : "PER divided by growth — under 1× is cheap for the growth."],
    ROE: ["ROE", ko ? "자기자본으로 1년에 얼마를 벌었는지예요. 높을수록 돈을 잘 굴리는 회사예요." : "Profit earned on shareholders' money — higher is better."],
    ROA: ["ROA", ko ? "보유 자산 전체로 얼마를 벌었는지예요. 자산을 얼마나 효율적으로 쓰는지 봐요." : "Profit earned on all assets — asset efficiency."],
    OPM: [ko ? "영업이익률" : "Op. margin", ko ? "매출 대비 남는 이익률이에요. 사업 자체의 수익성을 보여줘요." : "Profit kept from each ₩100 of sales, before non-operating items."],
    NPM: [ko ? "순이익률" : "Net margin", ko ? "매출에서 세금·이자까지 다 빼고 최종으로 남는 비율이에요." : "What's left from sales after all costs and taxes."],
    GPM: [ko ? "매출총이익률" : "Gross margin", ko ? "원가를 빼고 남는 마진이에요. 제품 경쟁력과 가격결정력을 보여줘요." : "Margin after cost of goods — pricing power signal."],
    REVG: [ko ? "매출성장률" : "Rev. growth", ko ? "작년보다 매출이 얼마나 늘었는지예요. 회사가 커지고 있는지 보는 1순위 지표예요." : "How much sales grew vs. last year."],
    OPG: [ko ? "영업이익성장률" : "OP growth", ko ? "영업이익이 작년보다 얼마나 늘었는지예요. 매출보다 빠르면 수익성이 좋아지는 중이에요." : "Operating profit growth — faster than sales means improving margins."],
    NPG: [ko ? "순이익성장률" : "NI growth", ko ? "최종 이익이 작년보다 얼마나 늘었는지예요." : "How much bottom-line profit grew vs. last year."],
    DEBT: [ko ? "부채비율" : "Debt ratio", ko ? "자기자본 대비 빚의 크기예요. 낮을수록 안전하고, 100% 이하면 양호해요." : "Debt vs. equity — lower is safer, under 100% is healthy."],
    CURR: [ko ? "유동비율" : "Current ratio", ko ? "1년 안에 갚을 빚을 당장 동원 가능한 자산으로 감당할 수 있는지예요. 150% 넘으면 안정적이에요." : "Short-term assets vs. short-term debts — over 150% is stable."],
    INTCOV: [ko ? "이자보상배율" : "Int. coverage", ko ? "영업이익으로 이자를 몇 번 갚을 수 있는지예요. 높을수록 빚 부담이 적어요." : "How many times profit covers interest — higher is safer."],
    DIVY: [ko ? "배당수익률" : "Div. yield", ko ? "지금 주가로 샀을 때 1년에 받는 배당 비율이에요. 예금 이자처럼 생각하면 돼요." : "Annual dividend as a % of today's price."],
    PAYOUT: [ko ? "배당성향" : "Payout", ko ? "번 이익 중 얼마를 배당으로 나눠주는지예요. 너무 높으면 배당을 유지하기 빠듯할 수 있어요." : "Share of profit paid as dividends — too high can be unsustainable."],
    DIVG: [ko ? "배당성장률" : "Div. growth", ko ? "배당금이 해마다 얼마나 늘었는지예요. 배당이 꾸준히 커지는 회사를 찾을 때 봐요." : "How fast the dividend has been growing each year."],
  };
}
const KS_METRIC_FORMULA = { PER: "PER = 주가 / EPS", PBR: "PBR = 주가 / BPS", PSR: "PSR = 주가 / 주당매출", PCR: "PCR = 주가 / 주당영업현금흐름", EVEB: "EV/EBITDA = (시총+순부채) / EBITDA", PEG: "PEG = PER / 이익성장률", ROE: "ROE = 순이익 / 자기자본", ROA: "ROA = 순이익 / 총자산", OPM: "영업이익률 = 영업이익 / 매출", NPM: "순이익률 = 순이익 / 매출", GPM: "매출총이익률 = 매출총이익 / 매출", REVG: "매출성장률 = (당기−전기) / 전기 매출", OPG: "영업이익성장률 = (당기−전기) / 전기 영업이익", NPG: "순이익성장률 = (당기−전기) / 전기 순이익", DEBT: "부채비율 = 부채 / 자기자본", CURR: "유동비율 = 유동자산 / 유동부채", INTCOV: "이자보상배율 = 영업이익 / 이자비용", DIVY: "배당수익률 = 주당배당 / 주가", PAYOUT: "배당성향 = 배당 / 순이익", DIVG: "배당성장률 = 배당 연평균 증가율" };

Object.assign(window, { SECURITIES, MARKETS, genSpark, securityOf, plansForTicker, SECURITY_SCENARIOS, adhocScenariosForTicker, KS_METRIC_DICT, KS_METRIC_FORMULA });
