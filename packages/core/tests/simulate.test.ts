import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import {
  FT_PRESETS, FT_SHAPE_LIST, FT_MAX_ANCHORS, FT_MIN_ANCHORS,
  ftEase, ftNoise, buildPricePath, seedAnchors,
  simulateStrategy, deriveFTCfg, ftCompareSet, defaultFTParams,
} from "../src/simulate/index.ts";
import { STRATEGIES } from "../src/reference/index.ts";

const g = goldens.simulate;
const plans: any[] = goldens.plans;
const plan1 = plans.find((p) => p.id === "PLN-001")!;
const N = 96;
const KIND_STRAT: Record<string, string> = {
  infinite: "st1", dca: "st4", value: "st5", grid: "st6", rebalance: "st3", signal: "st2", hold: "st1",
};

describe("future-test engine — golden equivalence", () => {
  it("presets & constants", () => {
    expect(J(FT_PRESETS)).toEqual(g.presets);
    expect(J(FT_SHAPE_LIST)).toEqual(g.shapes);
    expect(FT_MAX_ANCHORS).toBe(g.maxAnchors);
    expect(FT_MIN_ANCHORS).toBe(g.minAnchors);
  });

  it("ftEase / ftNoise", () => {
    for (const c of g.ease) expect(ftEase(c.f), `ease(${c.f})`).toBe(c.out);
    expect(J(ftNoise(g.noise.seed, g.noise.n))).toEqual(g.noise.out);
  });

  it("buildPricePath — all 6 preset shapes (prices + control points)", () => {
    for (const shape of g.shapes) {
      const path = buildPricePath({ ...(FT_PRESETS as any)[shape], seed: plan1.ticker }, plan1.currentPrice, N);
      expect(J(path.map((pt) => pt.price)), `path ${shape}`).toEqual(g.paths[shape].prices);
      expect(J(path.cps)).toEqual(g.paths[shape].cps);
      expect(J(path.anchors)).toEqual(g.paths[shape].anchors);
    }
  });

  it("seedAnchors + custom-draw path", () => {
    const anchors = seedAnchors(FT_PRESETS.vrebound, 9, N);
    expect(J(anchors)).toEqual(g.anchors);
    const custom = buildPricePath({ anchors, vol: 26, seed: "AAPL" }, 198.5, N);
    expect(J(custom.map((pt) => pt.price))).toEqual(g.customPath.prices);
    expect(J(custom.cps)).toEqual(g.customPath.cps);
  });

  it("defaultFTParams per kind + no-strategy fallback + compare set", () => {
    for (const [kind, sid] of Object.entries(KIND_STRAT)) {
      const strat = STRATEGIES.find((s) => s.id === sid);
      expect(J(defaultFTParams(plan1, strat)), `defaults ${kind}`).toEqual(g.defaults[kind]);
    }
    expect(J(defaultFTParams(plan1, null))).toEqual(g.defaultsNoStrat);
    expect(J(ftCompareSet(plan1, { budget: 1000000, costPct: 0.2 } as any))).toEqual(g.compareSet);
  });

  describe("simulateStrategy — 3 shapes × 7 kinds", () => {
    for (const rec of g.sims) {
      it(`${rec.shape} × ${rec.kind}`, () => {
        const strat = STRATEGIES.find((s) => s.id === KIND_STRAT[rec.kind]);
        const base = defaultFTParams(plan1, strat);
        const cfg = deriveFTCfg({ ...base, kind: rec.kind }, N);
        expect(J(cfg)).toEqual(rec.cfg);
        const path = buildPricePath({ ...(FT_PRESETS as any)[rec.shape], seed: plan1.ticker }, plan1.currentPrice, N);
        const sim = simulateStrategy(path, cfg);
        expect(J(sim.summary)).toEqual(rec.summary);
        expect(J(sim.events)).toEqual(rec.events);
        expect(J(sim.steps.map((s) => s.pnl))).toEqual(rec.stepsPnl);
        if (rec.steps) expect(J(sim.steps)).toEqual(rec.steps);
      });
    }
  });
});
