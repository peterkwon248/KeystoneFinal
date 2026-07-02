import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import { FIN_SEED, buildFin } from "../src/seed/index.ts";

describe("seed financials (FIN_SEED → buildFin) — golden equivalence", () => {
  it("FIN_SEED tickers", () => {
    expect(Object.keys(FIN_SEED).sort()).toEqual(goldens.fin.map((f: any) => f.ticker).sort());
  });
  for (const gf of goldens.fin) {
    it(`buildFin ${gf.ticker}`, () => {
      expect(J(buildFin(gf.ticker, gf.px, gf.eps, gf.sharesOut))).toEqual(gf.fin);
    });
  }
  it("unknown ticker → null", () => {
    expect(buildFin("UNKNOWN", 100, 5, 100)).toBeNull();
  });
});
