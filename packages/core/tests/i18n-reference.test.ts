import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import { I18N } from "../src/i18n/index.ts";
import {
  LIBRARY_LOCKED, PLAN_STATUS, STATUS_ORDER, WF_TYPE, PORTFOLIOS,
  STRATEGIES, EXEC_STRATEGIES, EXEC_CATS, MARKETS,
  KS_METRIC_DICT, KS_METRIC_FORMULA,
} from "../src/reference/index.ts";
import { KS_METRIC_DEFS } from "../src/analytics/index.ts";

describe("i18n", () => {
  it("en dictionary matches original exactly (dedup = last-wins)", () => {
    expect(J(I18N.en)).toEqual(goldens.i18n.en);
  });
  it("ko dictionary matches original exactly", () => {
    expect(J(I18N.ko)).toEqual(goldens.i18n.ko);
  });
});

describe("reference data", () => {
  const r = goldens.reference;
  it("LIBRARY_LOCKED", () => expect(LIBRARY_LOCKED).toBe(r.LIBRARY_LOCKED));
  it("PLAN_STATUS", () => expect(J(PLAN_STATUS)).toEqual(r.PLAN_STATUS));
  it("STATUS_ORDER", () => expect(J(STATUS_ORDER)).toEqual(r.STATUS_ORDER));
  it("WF_TYPE", () => expect(J(WF_TYPE)).toEqual(r.WF_TYPE));
  it("PORTFOLIOS", () => expect(J(PORTFOLIOS)).toEqual(r.PORTFOLIOS));
  it("STRATEGIES (all 8 frameworks)", () => expect(J(STRATEGIES)).toEqual(r.STRATEGIES));
  it("EXEC_STRATEGIES (all 7)", () => expect(J(EXEC_STRATEGIES)).toEqual(r.EXEC_STRATEGIES));
  it("EXEC_CATS defaults", () => expect(J(EXEC_CATS)).toEqual(r.EXEC_CATS));
  it("MARKETS", () => expect(J(MARKETS)).toEqual(r.MARKETS));
  it("KS_METRIC_DICT ko/en", () => {
    expect(J(KS_METRIC_DICT(true))).toEqual(r.KS_METRIC_DICT_ko);
    expect(J(KS_METRIC_DICT(false))).toEqual(r.KS_METRIC_DICT_en);
  });
  it("KS_METRIC_FORMULA", () => expect(J(KS_METRIC_FORMULA)).toEqual(r.KS_METRIC_FORMULA));
  it("KS_METRIC_DEFS", () => expect(J(KS_METRIC_DEFS)).toEqual(r.KS_METRIC_DEFS));
});
