import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import {
  valFactor, seedFinancials, calcValuation, fairToScenarioTargets,
  histMultipleBand, seedBands, bandTargets, seedSlots,
  reverseFromPer, reverseFromCap,
} from "../src/valuation/index.ts";

const g = goldens.valuation;
const plans: any[] = goldens.plans;

describe("valuation engine — golden equivalence per plan", () => {
  it("valFactor", () => {
    expect(valFactor("KRW")).toBe(g.valFactor.KRW);
    expect(valFactor("USD")).toBe(g.valFactor.USD);
  });

  for (const gp of g.perPlan) {
    it(`plan ${gp.id}`, () => {
      const p = plans.find((x) => x.id === gp.id)!;
      const seed = seedFinancials(p);
      expect(J(seed)).toEqual(gp.seed);
      const r = calcValuation(p, seed);
      expect(J(r)).toEqual(gp.r);
      expect(J(fairToScenarioTargets(r))).toEqual(gp.fair);
      const bands = seedBands(p);
      expect(J(bands)).toEqual(gp.bands);
      for (const k of ["per", "pbr", "psr", "ev", "fcf", "por"] as const)
        expect(J(histMultipleBand(p, k)), `hist ${k}`).toEqual(gp.hist[k]);
      for (const k of ["per", "pbr", "psr", "ev", "fcf", "por", "zzz"])
        expect(J(seedSlots(p, k)), `slots ${k}`).toEqual(gp.slots[k]);
      expect(J(bandTargets(r, "per", bands.per))).toEqual(gp.bandTargets.per);
      expect(J(bandTargets(r, "pbr", bands.pbr))).toEqual(gp.bandTargets.pbr);
      expect(J(bandTargets(r, "psr", bands.psr))).toEqual(gp.bandTargets.psr);
      expect(J(reverseFromPer(r.fEps, 15, p.currentPrice))).toEqual(gp.revPer);
      expect(J(reverseFromPer(0, 15, p.currentPrice))).toEqual(gp.revPerBad);
      expect(J(reverseFromCap(p.cur, p.cur === "USD" ? 500 : 100, p.sharesOut, p.currentPrice))).toEqual(gp.revCap);
    });
  }
});
