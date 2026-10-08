import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

type GoldenFixture = {
  inputs: {
    totalGoodsProduced: number;
    totalDirectEmissions: number;
    totalIndirectEmissions: number;
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
  const directSpecific =
    fixture.inputs.totalDirectEmissions / fixture.inputs.totalGoodsProduced;
  const indirectSpecific =
    fixture.inputs.totalIndirectEmissions / fixture.inputs.totalGoodsProduced;
  const totalSpecific = directSpecific + indirectSpecific;

  assert.equal(
    Number(directSpecific.toFixed(3)),
    fixture.expected.specificDirectEmbeddedEmissions,
  );
  assert.equal(
    Number(indirectSpecific.toFixed(3)),
    fixture.expected.specificIndirectEmbeddedEmissions,
  );
  assert.equal(
    Number(totalSpecific.toFixed(3)),
    fixture.expected.specificTotalEmbeddedEmissions,
  );

  const importDirect =
    fixture.scenario.importQuantity *
    fixture.expected.specificDirectEmbeddedEmissions;
  const importIndirect =
    fixture.scenario.importQuantity *
    fixture.expected.specificIndirectEmbeddedEmissions;
  const importTotal =
    fixture.scenario.importQuantity *
    fixture.expected.specificTotalEmbeddedEmissions;

  assert.equal(importDirect, fixture.expected.importDirectEmbeddedEmissions);
  assert.equal(importIndirect, fixture.expected.importIndirectEmbeddedEmissions);
  assert.equal(importTotal, fixture.expected.importTotalEmbeddedEmissions);
});
