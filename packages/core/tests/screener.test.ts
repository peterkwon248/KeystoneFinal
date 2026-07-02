import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import { IND_THRESH, gradeOf, lensThreshOf, gradeWithFw } from "../src/screener/index.ts";

const g = goldens.screener;

describe("screener scoring", () => {
  it("IND_THRESH table", () => expect(J(IND_THRESH)).toEqual(g.IND_THRESH));
  it("gradeOf replay", () => {
    for (const c of g.grade)
      expect(gradeOf(c.key, c.v), `gradeOf(${c.key}, ${c.v})`).toBe(c.out);
  });
  it("lensThreshOf replay (framework overrides + global fallback)", () => {
    for (const c of g.lens)
      expect(J(lensThreshOf(c.fwId, c.key)), `lensThreshOf(${c.fwId}, ${c.key})`).toEqual(c.out);
  });
  it("gradeWithFw replay", () => {
    for (const c of g.gradeFw)
      expect(gradeWithFw(c.fwId, c.key, c.v), `gradeWithFw(${c.fwId}, ${c.key}, ${c.v})`).toBe(c.out);
  });
});
