import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import {
  planReturn, planTag, gaugeData, planActionLines, planExecState,
  scLabel, metricDef, scAutoStatus, scProbOf,
} from "../src/analytics/index.ts";

const g = goldens.analytics;
const plans: any[] = goldens.plans;
const sc = goldens.scenario;

describe("analytics — golden equivalence per plan", () => {
  for (const gp of g.perPlan) {
    it(`plan ${gp.id}`, () => {
      const p = plans.find((x) => x.id === gp.id)!;
      expect(J(planReturn(p))).toEqual(gp.ret);
      expect(planTag(p, "en")).toBe(gp.tag.en);
      expect(planTag(p, "ko")).toBe(gp.tag.ko);
      expect(J(gaugeData(p))).toEqual(gp.gauge);
      expect(J(planActionLines(p))).toEqual(gp.lines);
      expect(J(planExecState(p))).toEqual(gp.exec);
    });
  }
  it("scLabel", () => {
    for (const c of g.scLabel) expect(scLabel(c.k, c.lang), `scLabel(${c.k}, ${c.lang})`).toBe(c.out);
  });
  it("metricDef", () => {
    for (const c of g.metricDef) expect(J(metricDef(c.k)), `metricDef(${c.k})`).toEqual(c.out);
  });
  it("scAutoStatus", () => {
    for (const c of sc.autoStatus) expect(scAutoStatus({ currentPrice: c.px }, c.tg), `scAutoStatus(${c.px}, ${c.tg})`).toBe(c.out);
  });
  it("scProbOf", () => {
    for (const c of sc.prob) expect(scProbOf(c.s), `scProbOf(${JSON.stringify(c.s)})`).toBe(c.out);
  });
});
