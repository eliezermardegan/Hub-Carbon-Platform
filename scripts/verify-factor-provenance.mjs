#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("factors");
const SHA256 = /^[a-f0-9]{64}$/i;
const REQUIRED = [
  ["id", "id"],
  ["version", "version"],
  ["provenance.sourceName", "provenance.sourceName"],
  ["provenance.sourceUrl", "provenance.sourceUrl"],
  ["provenance.sourceVersion", "provenance.sourceVersion"],
  ["provenance.license", "provenance.license"],
  ["provenance.legalBasis", "provenance.legalBasis"],
  ["provenance.sourceContentSha256", "provenance.sourceContentSha256"],
  ["provenance.retrievedAt", "provenance.retrievedAt"],
  ["provenance.geography", "provenance.geography"],
  ["provenance.originalUnit", "provenance.originalUnit"],
  ["provenance.normalizedUnit", "provenance.normalizedUnit"],
  ["provenance.transformation", "provenance.transformation"],
  ["provenance.evidenceRef", "provenance.evidenceRef"]
];

async function jsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await jsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

function recordsFromDocument(document, file) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document.factors)) return document.factors;
  if (document && typeof document === "object" && ("id" in document || "provenance" in document)) return [document];
  throw new Error(`${file}: expected a factor object, an array of factors, or { factors: [...] }`);
}

function get(record, dotted) {
  return dotted.split(".").reduce((value, key) => value?.[key], record);
}

let files = [];
try {
  files = await jsonFiles(ROOT);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("No factors/ directory found; no production factor records to validate.");
    process.exit(0);
  }
  throw error;
}

let factorCount = 0;
const errors = [];

for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  let document;
  try {
    document = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${relative}: invalid JSON (${error.message})`);
    continue;
  }

  let records;
  try {
    records = recordsFromDocument(document, relative);
  } catch (error) {
    errors.push(error.message);
    continue;
  }

  for (const [field] of REQUIRED) {
    for (const record of records) {
      factorCount++;
      const value = get(record, field);
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`${relative}: ${field} is required`);
      }
      if (field === "provenance.sourceContentSha256" && typeof value === "string" && !SHA256.test(value)) {
        errors.push(`${relative}: provenance.sourceContentSha256 must be a 64-character SHA-256 hex digest`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Factor provenance validation failed with ${errors.length} error(s).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Factor provenance validation passed: ${factorCount / REQUIRED.length} factor record(s) checked across ${files.length} JSON file(s).`);
