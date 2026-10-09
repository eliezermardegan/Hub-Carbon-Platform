import { test } from "node:test";
import assert from "node:assert/strict";
import { createRegulatoryEngine, type RegulatoryRule } from "./domain.ts";

const ukRule: RegulatoryRule = {
  id: "UK-EXAMPLE-001",
  version: "2027.1",
  effectiveFrom: "2027-01-01",
  effectiveTo: "2027-12-31",
  description: "Synthetic architecture test rule only.",
  matches: (context) => context.activityType === "import" && context.productCode === "TEST",
  evaluate: (context) => ({
    applicability: context.activityType === "import" && context.productCode ? "applicable" : "insufficient_data",
    regulation: "uk.example",
    regulationVersion: "2027.1",
    ruleId: "UK-EXAMPLE-001",
    ruleVersion: "2027.1",
    effectiveFrom: "2027-01-01",
    effectiveTo: "2027-12-31",
    reason: "Synthetic test inputs satisfy the example rule.",
    requiredInputs: ["activityType", "productCode"],
    requiredEvidence: ["source document"],
  }),
};

function engine(rules: readonly RegulatoryRule[] = [ukRule]) {
  return createRegulatoryEngine({
    regulation: "uk.example",
    jurisdiction: "GB",
    regulationVersion: "2027.1",
    rules,
  });
}

const validContext = {
  jurisdiction: "GB",
  asOf: "2027-04-01",
  activityType: "import",
  productCode: "TEST",
};

test("selects a rule matching jurisdiction, activity and product context", () => {
  assert.equal(engine().evaluate(validContext).applicability, "applicable");
  assert.throws(() => engine().evaluate({ ...validContext, jurisdiction: "DE" }), /Jurisdiction mismatch/);
});

test("fails closed when no rule is active for the obligation date", () => {
  const decision = engine().evaluate({ ...validContext, asOf: "2026-12-31" });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /No active rule/);
});

test("fails closed when active rules do not match the activity/product context", () => {
  const decision = engine().evaluate({ ...validContext, productCode: "OTHER" });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /No active rule matches/);
});

test("fails closed when multiple active rules match the same context", () => {
  const secondRule: RegulatoryRule = { ...ukRule, id: "UK-EXAMPLE-002" };
  const decision = engine([ukRule, secondRule]).evaluate(validContext);
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /ambiguous/);
});

test("effective date boundaries are inclusive and calendar-date based", () => {
  assert.equal(engine().evaluate({ ...validContext, asOf: "2027-01-01" }).applicability, "applicable");
  assert.equal(engine().evaluate({ ...validContext, asOf: "2027-12-31" }).applicability, "applicable");
  assert.equal(engine().evaluate({ ...validContext, asOf: "2028-01-01" }).applicability, "insufficient_data");
});

test("rejects malformed obligation dates without claiming applicability", () => {
  const decision = engine().evaluate({ ...validContext, asOf: "2027-02-30" });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /valid calendar date/);
});

test("rejects invalid rule effective-date configuration", () => {
  assert.throws(
    () => engine([{ ...ukRule, effectiveFrom: "2027-02-30" }]),
    /Invalid effectiveFrom date/,
  );
  assert.throws(
    () => engine([{ ...ukRule, effectiveFrom: "2027-12-31", effectiveTo: "2027-01-01" }]),
    /effectiveTo precedes effectiveFrom/,
  );
});
