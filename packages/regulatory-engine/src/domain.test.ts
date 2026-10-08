import { test } from "node:test";
import assert from "node:assert/strict";
import { createRegulatoryEngine, type RegulatoryRule } from "./domain.ts";

const ukRule: RegulatoryRule = {
  id: "UK-EXAMPLE-001",
  version: "2027.1",
  effectiveFrom: "2027-01-01",
  description: "Synthetic architecture test rule only.",
  evaluate: (context) => ({
    applicability: context.activityType === "import" && context.productCode ? "applicable" : "insufficient_data",
    regulation: "uk.example",
    regulationVersion: "2027.1",
    ruleId: "UK-EXAMPLE-001",
    ruleVersion: "2027.1",
    effectiveFrom: "2027-01-01",
    reason: context.activityType === "import" && context.productCode ? "Synthetic test inputs satisfy the example rule." : "Product code is required for the synthetic test rule.",
    requiredInputs: ["activityType", "productCode"],
    requiredEvidence: ["source document"],
  }),
};

test("regulatory engine is jurisdiction-specific", () => {
  const engine = createRegulatoryEngine({ regulation: "uk.example", jurisdiction: "GB", regulationVersion: "2027.1", rules: [ukRule] });
  assert.equal(engine.evaluate({ jurisdiction: "GB", asOf: "2027-04-01", activityType: "import", productCode: "TEST" }).applicability, "applicable");
  assert.throws(() => engine.evaluate({ jurisdiction: "DE", asOf: "2027-04-01", activityType: "import", productCode: "TEST" }));
});

test("no active rule fails closed with insufficient_data", () => {
  const engine = createRegulatoryEngine({ regulation: "uk.example", jurisdiction: "GB", regulationVersion: "2027.1", rules: [ukRule] });
  const decision = engine.evaluate({ jurisdiction: "GB", asOf: "2026-12-31", activityType: "import", productCode: "TEST" });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /No active rule/);
});

test("ambiguous active rules fail closed", () => {
  const secondRule: RegulatoryRule = { ...ukRule, id: "UK-EXAMPLE-002" };
  const engine = createRegulatoryEngine({ regulation: "uk.example", jurisdiction: "GB", regulationVersion: "2027.1", rules: [ukRule, secondRule] });
  const decision = engine.evaluate({ jurisdiction: "GB", asOf: "2027-04-01", activityType: "import", productCode: "TEST" });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /ambiguous/);
});