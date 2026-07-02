import { describe, expect, it } from "vitest";
import { goldens } from "./helpers.ts";
import {
  setFxRate, setDisplayCurrency, fmtMoney, fmtCompact, fmtMktCap,
  sharesDisp, fmtShares, fmtDate, fmtRel,
} from "../src/format/index.ts";

const g = goldens.format;

describe("format — money/compact across display-currency modes", () => {
  it("fmtMoney + fmtCompact replay", () => {
    setFxRate(g.fx);
    let disp: any = Symbol("unset");
    for (const c of g.cases) {
      if (c.disp !== disp) { setDisplayCurrency(c.disp); disp = c.disp; }
      expect(fmtMoney(c.v, c.cur), `fmtMoney disp=${c.disp} cur=${c.cur} v=${c.v}`).toBe(c.money);
      expect(fmtCompact(c.v, c.cur), `fmtCompact disp=${c.disp} cur=${c.cur} v=${c.v}`).toBe(c.compact);
    }
    setDisplayCurrency(null);
  });
  it("fmtMktCap replay", () => {
    setFxRate(g.fx);
    for (const c of g.caps) {
      setDisplayCurrency(c.disp);
      expect(fmtMktCap(c.v, c.cur), `fmtMktCap disp=${c.disp} cur=${c.cur} v=${c.v}`).toBe(c.out);
    }
    setDisplayCurrency(null);
  });
});

describe("format — shares & dates", () => {
  it("sharesDisp / fmtShares", () => {
    for (const c of g.shares) {
      expect(sharesDisp(c.m, c.lang), `sharesDisp ${c.m} ${c.lang}`).toEqual(c.disp);
      expect(fmtShares(c.m, c.lang), `fmtShares ${c.m} ${c.lang}`).toBe(c.s);
    }
  });
  it("fmtDate / fmtRel", () => {
    for (const c of g.dates) {
      const fn = c.fn === "fmtDate" ? fmtDate : fmtRel;
      expect(fn(c.s, c.lang), `${c.fn}(${c.s}, ${c.lang})`).toBe(c.out);
    }
  });
});
