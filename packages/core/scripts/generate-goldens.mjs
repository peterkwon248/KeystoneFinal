// generate-goldens.mjs — evaluate the ORIGINAL prototype sources (source/*.jsx) in a
// Node vm sandbox (mimicking Keystone.html load order) and dump golden outputs for a
// battery of inputs. The TS ports in src/ must reproduce these EXACTLY (tests/*.test.ts).
//
// Run: node scripts/generate-goldens.mjs   (from packages/core)

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../../../source");
const OUT = path.resolve(__dirname, "../tests/goldens.json");

const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

// ---- sandbox: window + localStorage stubs, nothing else from the host ----
const sandbox = {
  window: {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  console,
};
const ctx = vm.createContext(sandbox);

const run = (code, name) => vm.runInContext(code, ctx, { filename: name });

// load order mirrors Keystone.html: data → securities → valuation → futuretest(pure part)
run(read("data.jsx"), "data.jsx");
run(read("securities.jsx"), "securities.jsx");
run(read("valuation.jsx"), "valuation.jsx");
{
  const ft = read("futuretest.jsx");
  const cut = ft.indexOf("Object.assign(window, { buildPricePath");
  if (cut < 0) throw new Error("futuretest.jsx: pure/UI boundary marker not found");
  run(ft.slice(0, cut), "futuretest.pure.jsx");
}

// ---- extraction runs INSIDE the vm (same realm), returns a JSON string ----
const json = run(`
(() => {
  const out = {};

  /* fixtures — enriched PLANS (post enrichGap/assignExec/enrichFin) */
  out.plans = PLANS;

  /* i18n + reference dumps */
  out.i18n = I18N;
  out.reference = {
    LIBRARY_LOCKED, PLAN_STATUS, STATUS_ORDER, WF_TYPE, PORTFOLIOS,
    STRATEGIES, EXEC_STRATEGIES, EXEC_CATS, MARKETS,
    KS_METRIC_DICT_ko: KS_METRIC_DICT(true), KS_METRIC_DICT_en: KS_METRIC_DICT(false),
    KS_METRIC_FORMULA, KS_METRIC_DEFS,
  };

  /* screener */
  {
    const grade = [], lens = [], gradeFw = [];
    for (const key of Object.keys(IND_THRESH)) {
      const t = IND_THRESH[key];
      for (const v of [t.good, t.warn, (t.good + t.warn) / 2, t.good - 1, t.warn + 1, null])
        grade.push({ key, v, out: gradeOf(key, v) });
    }
    grade.push({ key: "ZZZ", v: 5, out: gradeOf("ZZZ", 5) });
    for (const fwId of ["st1", "st3", "st5", null, "none", "zz"])
      for (const key of ["PER", "ROE", "DIVY", "REVG", "ZZZ"]) {
        lens.push({ fwId, key, out: lensThreshOf(fwId, key) });
        for (const v of [1, 12, 30, null])
          gradeFw.push({ fwId, key, v, out: gradeWithFw(fwId, key, v) });
      }
    out.screener = { IND_THRESH, grade, lens, gradeFw };
  }

  /* format */
  {
    setFxRate(1380);
    const cases = [], caps = [], shares = [], dates = [];
    const vals = [null, 0, 1, 1234.56, 71200, 12604000, 1e9, 466000000000000];
    for (const disp of [null, "KRW", "USD"]) {
      setDisplayCurrency(disp);
      for (const cur of ["KRW", "USD"])
        for (const v of vals) {
          cases.push({ disp, cur, v, money: fmtMoney(v, cur), compact: fmtCompact(v, cur) });
        }
      for (const cur of ["KRW", "USD"])
        for (const v of [null, 0, 5e11, 3e12, 466000000000000, 2.9e16, 3418e9])
          caps.push({ disp, cur, v, out: fmtMktCap(v, cur) });
    }
    setDisplayCurrency(null);
    for (const lang of ["en", "ko"])
      for (const m of [0, 0.5, 71, 84, 164, 728, 999, 1000, 5969, 15204])
        shares.push({ m, lang, disp: sharesDisp(m, lang), s: fmtShares(m, lang) });
    const dIn = ["Mar 3", "Jun 5", "Jun 26", "Jun 27", "Nov 8", "Dec 31", "Apr 18", "Jan 1, 2025", "Sep 2, 2024", "bogus"];
    const rIn = ["now", "2d", "4h", "3mo", "1y", "Today 09:01", "today", "Yesterday 14:00", "Jun 7 14:20", "May 30", "Mar 3, 2025", "bogus"];
    for (const lang of ["en", "ko"]) {
      for (const s of dIn) dates.push({ fn: "fmtDate", s, lang, out: fmtDate(s, lang) });
      for (const s of rIn) dates.push({ fn: "fmtRel", s, lang, out: fmtRel(s, lang) });
    }
    out.format = { fx: 1380, cases, caps, shares, dates };
  }

  /* valuation — per plan */
  {
    out.valuation = { valFactor: { KRW: valFactor("KRW"), USD: valFactor("USD") }, perPlan: [] };
    for (const p of PLANS) {
      const seed = seedFinancials(p);
      const r = calcValuation(p, seed);
      const bands = seedBands(p);
      out.valuation.perPlan.push({
        id: p.id, seed, r,
        fair: fairToScenarioTargets(r),
        bands,
        hist: Object.fromEntries(["per", "pbr", "psr", "ev", "fcf", "por"].map(k => [k, histMultipleBand(p, k)])),
        slots: Object.fromEntries(["per", "pbr", "psr", "ev", "fcf", "por", "zzz"].map(k => [k, seedSlots(p, k)])),
        bandTargets: {
          per: bandTargets(r, "per", bands.per),
          pbr: bandTargets(r, "pbr", bands.pbr),
          psr: bandTargets(r, "psr", bands.psr),
        },
        revPer: reverseFromPer(r.fEps, 15, p.currentPrice),
        revPerBad: reverseFromPer(0, 15, p.currentPrice),
        revCap: reverseFromCap(p.cur, p.cur === "USD" ? 500 : 100, p.sharesOut, p.currentPrice),
      });
    }
  }

  /* simulate */
  {
    const plan1 = PLANS.find(p => p.id === "PLN-001");
    const N = 96;
    const KIND_STRAT = { infinite: "st1", dca: "st4", value: "st5", grid: "st6", rebalance: "st3", signal: "st2", hold: "st1" };
    const paths = {}, pathDump = {};
    for (const shape of FT_SHAPE_LIST) {
      const path = buildPricePath({ ...FT_PRESETS[shape], seed: plan1.ticker }, plan1.currentPrice, N);
      paths[shape] = path;
      pathDump[shape] = { prices: path.map(pt => pt.price), cps: path.cps, anchors: path.anchors };
    }
    const anchors = seedAnchors(FT_PRESETS.vrebound, 9, N);
    const customPath = buildPricePath({ anchors, vol: 26, seed: "AAPL" }, 198.5, N);
    const sims = [];
    for (const shape of ["vrebound", "range", "stair"])
      for (const kind of ["infinite", "dca", "value", "grid", "rebalance", "signal", "hold"]) {
        const strat = STRATEGIES.find(s => s.id === KIND_STRAT[kind]);
        const base = defaultFTParams(plan1, strat);
        const cfg = deriveFTCfg({ ...base, kind }, N);
        const sim = simulateStrategy(paths[shape], cfg);
        const rec = { shape, kind, cfg, summary: sim.summary, events: sim.events, stepsPnl: sim.steps.map(s => s.pnl) };
        if (shape === "vrebound" && kind === "infinite") rec.steps = sim.steps;
        if (shape === "range" && kind === "grid") rec.steps = sim.steps;
        sims.push(rec);
      }
    out.simulate = {
      presets: FT_PRESETS, shapes: FT_SHAPE_LIST,
      maxAnchors: FT_MAX_ANCHORS, minAnchors: FT_MIN_ANCHORS,
      ease: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, -0.5, 1.5].map(f => ({ f, out: ftEase(f) })),
      noise: { seed: "005930", n: 16, out: ftNoise("005930", 16) },
      anchors, paths: pathDump,
      customPath: { prices: customPath.map(pt => pt.price), cps: customPath.cps },
      defaults: Object.fromEntries(Object.entries(KIND_STRAT).map(([k, sid]) => [k, defaultFTParams(plan1, STRATEGIES.find(s => s.id === sid))])),
      defaultsNoStrat: defaultFTParams(plan1, null),
      compareSet: ftCompareSet(plan1, { budget: 1000000, costPct: 0.2 }),
      sims,
    };
  }

  /* analytics — per plan */
  {
    out.analytics = {
      perPlan: PLANS.map(p => ({
        id: p.id,
        ret: planReturn(p),
        tag: { en: planTag(p, "en"), ko: planTag(p, "ko") },
        gauge: gaugeData(p),
        lines: planActionLines(p),
        exec: planExecState(p),
      })),
      scLabel: ["Bull", "Base", "Bear", "X"].flatMap(k => ["en", "ko"].map(lang => ({ k, lang, out: scLabel(k, lang) }))),
      metricDef: [...Object.keys(KS_METRIC_DEFS), "nope"].map(k => ({ k, out: metricDef(k) })),
    };
  }

  /* seed financials */
  {
    out.fin = Object.keys(FIN_SEED).map(tk => {
      const sec = SECURITIES.find(s => s.ticker === tk);
      const p = PLANS.find(x => x.ticker === tk);
      const px = sec ? sec.price : p ? p.currentPrice : 100;
      const eps = sec ? sec.eps : p ? p.eps : 5;
      const sh = sec ? sec.sharesOut : p ? p.sharesOut : 100;
      return { ticker: tk, px, eps, sharesOut: sh, fin: buildFin(tk, px, eps, sh) };
    });
    out.finUnknown = buildFin("UNKNOWN", 100, 5, 100);
  }

  return JSON.stringify(out);
})()
`, "extract.js");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const data = JSON.parse(json);
fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(
  "goldens written:", OUT,
  "\n plans:", data.plans.length,
  "| i18n en/ko keys:", Object.keys(data.i18n.en).length, "/", Object.keys(data.i18n.ko).length,
  "| valuation:", data.valuation.perPlan.length,
  "| sims:", data.simulate.sims.length,
  "| analytics:", data.analytics.perPlan.length,
  "| fin:", data.fin.length,
  "| format cases:", data.format.cases.length,
);
