import { describe, expect, it } from "vitest";
import { goldens, J } from "./helpers.ts";
import { evalRule, ruleWarn } from "../src/analytics/index.ts";
import type { Plan, Rule } from "../src/types/index.ts";

// The generator dumped the EXACT inputs (planId + rule + ko) it evaluated in the vm sandbox
// alongside the outputs. We replay the identical inputs through the TS ports and assert
// byte-identical {state, meta} / warn-string results. The plans come from goldens.plans
// (post-enrichment PLANS) so both sides see structurally identical objects.

const plans: Plan[] = goldens.plans;
const rules = goldens.rules;
const evalByKey: Record<string, any> = Object.fromEntries(rules.evalOut.map((r: any) => [r.key, r.out]));
const warnByKey: Record<string, any> = Object.fromEntries(rules.warnOut.map((r: any) => [r.key, r.out]));

describe("rules — evalRule / ruleWarn golden equivalence", () => {
  it(`replays all ${rules.inputs.length} battery inputs`, () => {
    for (const inp of rules.inputs as { key: string; planId: string; rule: Rule; ko: boolean }[]) {
      const p = plans.find((x) => x.id === inp.planId)!;
      expect(p, `plan ${inp.planId} missing`).toBeTruthy();
      expect(J(evalRule(p, inp.rule, inp.ko)), `evalRule ${inp.key}`).toEqual(evalByKey[inp.key]);
      expect(J(ruleWarn(p, inp.rule, inp.ko)), `ruleWarn ${inp.key}`).toEqual(warnByKey[inp.key]);
    }
  });

  it("covers every trig id (structured rules)", () => {
    const trigs = new Set(
      (rules.inputs as { rule: Rule }[]).map((i) => i.rule.trig).filter(Boolean),
    );
    for (const t of ["price_le", "price_ge", "ret_ge", "ret_le", "loc_hit", "target_hit", "buy_exec"]) {
      expect(trigs.has(t), `trig ${t} covered`).toBe(true);
    }
  });

  it("covers legacy name-pattern rules and a non-null warn", () => {
    // at least one legacy (no-trig) rule and one non-null warn present in the battery
    const hasLegacy = (rules.inputs as { rule: Rule }[]).some((i) => !i.rule.trig);
    expect(hasLegacy).toBe(true);
    const hasWarn = (rules.warnOut as { out: unknown }[]).some((w) => w.out != null);
    expect(hasWarn).toBe(true);
  });
});
