import test from "node:test";
import assert from "node:assert/strict";
import { CarbonLedger } from "./index.js";
import type { ActivityRecord } from "../../carbon-core/src/index.js";
import type { EmissionFactor } from "../../factor-registry/src/index.js";

const factor: EmissionFactor = {
  id: "factor-electricity-br-2026",
  version: "1.0.0",
  status: "verified",
  name: "Example electricity factor",
  scope: 2,
  category: "purchased_electricity",
  geography: "BR",
  activityUnit: "kWh",
  factorUnit: "kgCO2e/kWh",
  value: 0.1,
  dataQuality: "high",
  provenance: {
    sourceName: "Project test fixture",
    sourceUrl: "https://example.invalid/factor",
    license: "internal-fixture",
    attributionRequired: false,
    redistributionAllowed: false,
    retrievedAt: "2026-10-07T00:00:00Z"
  }
};

const activity: ActivityRecord = {
  id: "activity-001",
  scope: 2,
  category: "purchased_electricity",
  quantity: 100,
  unit: "kWh",
  method: "activity_based",
  factorId: factor.id,
  factorValue: factor.value,
  factorUnit: factor.factorUnit,
  factorVersion: factor.version
};

test("records deterministic calculation, factor snapshot and evidence", () => {
  const ledger = new CarbonLedger();
  const entry = ledger.append(activity, factor, [{ id: "invoice-001", type: "invoice" }], "pbhg-2026.1", "2026-10-07T12:00:00Z");
  assert.equal(entry.calculation.emissionsKgCo2e, 10);
  assert.equal(entry.factor.id, factor.id);
  assert.equal(entry.factor.version, factor.version);
  assert.equal(entry.evidence[0].id, "invoice-001");
  assert.equal(ledger.totalKgCo2e(), 10);
});

test("hash chain verifies after multiple entries", () => {
  const ledger = new CarbonLedger();
  ledger.append(activity, factor, [], "pbhg-2026.1", "2026-10-07T12:00:00Z");
  ledger.append({ ...activity, id: "activity-002", quantity: 50 }, factor, [], "pbhg-2026.1", "2026-10-07T12:01:00Z");
  const result = ledger.verify();
  assert.deepEqual(result, { valid: true, checkedEntries: 2 });
  assert.equal(ledger.list()[1].previousEntryHash, ledger.list()[0].entryHash);
});

test("rejects an activity/factor mismatch", () => {
  const ledger = new CarbonLedger();
  assert.throws(
    () => ledger.append({ ...activity, factorVersion: "wrong" }, factor, [], "pbhg-2026.1"),
    /does not match supplied factor/
  );
});
