/*
 * Imported from CarbonInk under the MIT License.
 * Source: https://github.com/lxzxl/carbonink
 * Commit: a8d8c758c0193a0a49c823f35491ae22632811c5
 * Original path: desktop/src/shared/ulid.ts
 */

import { monotonicFactory } from 'ulid';

const monotonicUlid = monotonicFactory();

/**
 * Returns a 26-character ULID. Monotonic within a single process.
 * Used as primary key for all rows in app.sqlite (per spec §3 原则 5).
 */
export function newId(): string {
  return monotonicUlid();
}
