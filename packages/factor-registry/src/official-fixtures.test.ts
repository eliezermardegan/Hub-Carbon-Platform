import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const fixtureDir = path.resolve("tests/fixtures/factors");

test("official ADEME and DESNZ factors are preserved as test-only fixtures", () => {
  const ademe = JSON.parse(fs.readFileSync(path.join(fixtureDir, "ademe-base-carbone-v23-6-28276.json"), "utf8"));
  const desnz = JSON.parse(fs.readFileSync(path.join(fixtureDir, "desnz-2026-uk-electricity.json"), "utf8"));

  assert.equal(ademe.sourceName, "ADEME Base Carbone");
  assert.equal(ademe.sourceVersion, "Base Carbone V23.6");
  assert.equal(ademe.recordId, "28276");
  assert.equal(ademe.value, 0.235);

  assert.equal(desnz.sourceName, "Department for Energy Security and Net Zero");
  assert.match(desnz.sourceVersion, /2026/);
  assert.equal(desnz.recordId, "7_400_4000_5_1");
  assert.equal(desnz.value, 0.13096);

  for (const fixture of [ademe, desnz]) {
    assert.match(fixture.sourceSnapshotSha256, /^[a-f0-9]{64}$/);
    assert.ok(fixture.sourceUrl.startsWith("https://"));
    assert.ok(fixture.evidenceRef);
  }
});
