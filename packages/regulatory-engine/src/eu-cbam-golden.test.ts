import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type GoldenFixture = {
  inputs: {
    specificDirectEmbeddedEmissions: number;
    specificIndirectEmbeddedEmissions: number;
  };
  scenario: {
    importQuantity: number;
  };
  expected: {
    specificDirectEmbeddedEmissions: number;
    specificIndirectEmbeddedEmissions: number;
    specificTotalEmbeddedEmissions: number;
    importDirectEmbeddedEmissions: number;
    importIndirectEmbeddedEmissions: number;
    importTotalEmbeddedEmissions: number;
  };
};

const fixturePath = path.resolve(
  process.cwd(),
  "tests/regulatory/eu/cbam/golden/steel-eaf/official-example.json",
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as GoldenFixture;

test("EU CBAM official worked example: EAF steel golden calculation", () => {
  const directSpecific = fixture.inputs.specificDirectEmbeddedEmissions;
  const indirectSpecific = fixture.inputs.specificIndirectEmbeddedEmissions;

  assert.equal(directSpecific, fixture.expected.specificDirectEmbeddedEmissions);
  assert.equal(indirectSpecific, fixture.expected.specificIndirectEmbeddedEmissions);
  // The Commission reports the total using underlying unrounded values; do not
  // recompute 3.171 by adding the displayed 1.440 + 1.732 values (3.172).
  assert.equal(fixture.expected.specificTotalEmbeddedEmissions, 3.171);

  const importDirect =
    fixture.scenario.importQuantity *
    fixture.expected.specificDirectEmbeddedEmissions;
  const importIndirect =
    fixture.scenario.importQuantity *
    fixture.expected.specificIndirectEmbeddedEmissions;
  const importTotal = importDirect + importIndirect;

  assert.ok(
    Math.abs(importDirect - fixture.expected.importDirectEmbeddedEmissions) < 1e-9,
  );
  assert.ok(
    Math.abs(importIndirect - fixture.expected.importIndirectEmbeddedEmissions) < 1e-9,
  );
  assert.ok(
    Math.abs(importTotal - fixture.expected.importTotalEmbeddedEmissions) < 1e-9,
  );
});
