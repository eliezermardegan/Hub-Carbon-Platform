export type * from "./model.js";

import * as modelModule from "./model.js";
import * as serviceModule from "./service.js";
import * as postgresModule from "./postgres.js";

// The test runner executes TypeScript source directly under Node ESM. Normalize
// direct and default-wrapped exports at this boundary so consumers receive one
// stable named-export contract without weakening the module/type checks.
function runtimeExport<T>(moduleNamespace: unknown, name: string): T {
  const namespace = moduleNamespace as Record<string, unknown>;
  const defaultExport = namespace.default;
  const defaultRecord = defaultExport !== null &&
    (typeof defaultExport === "object" || typeof defaultExport === "function")
    ? defaultExport as Record<string, unknown>
    : undefined;
  const candidate = namespace[name] ?? defaultRecord?.[name] ??
    (name === "DataIntakeService" && typeof defaultExport === "function" ? defaultExport : undefined);
  if (candidate === undefined) throw new Error(`Data Intake runtime export '${name}' is unavailable`);
  return candidate as T;
}

export const SCOPE3_CATEGORIES = runtimeExport<typeof import("./model.js").SCOPE3_CATEGORIES>(modelModule, "SCOPE3_CATEGORIES");
export const isScope3Category = runtimeExport<typeof import("./model.js").isScope3Category>(modelModule, "isScope3Category");
export const defaultIdempotencyKey = runtimeExport<typeof import("./model.js").defaultIdempotencyKey>(modelModule, "defaultIdempotencyKey");
export const validateActivity = runtimeExport<typeof import("./model.js").validateActivity>(modelModule, "validateActivity");
export const toLedgerHandoff = runtimeExport<typeof import("./model.js").toLedgerHandoff>(modelModule, "toLedgerHandoff");
export const createActivity = runtimeExport<typeof import("./model.js").createActivity>(modelModule, "createActivity");

type DataIntakeServiceConstructor = typeof import("./service.js").DataIntakeService;
const serviceConstructor = runtimeExport<DataIntakeServiceConstructor>(serviceModule, "DataIntakeService");
export const DataIntakeService = serviceConstructor;
export type DataIntakeService = InstanceType<DataIntakeServiceConstructor>;
export type { FactorResolver, IntakeServiceContext, IntakeResult } from "./service.js";

type PostgresDataIntakePersistenceConstructor = typeof import("./postgres.js").PostgresDataIntakePersistence;
const postgresPersistenceConstructor = runtimeExport<PostgresDataIntakePersistenceConstructor>(postgresModule, "PostgresDataIntakePersistence");
export const PostgresDataIntakePersistence = postgresPersistenceConstructor;
export type PostgresDataIntakePersistence = InstanceType<PostgresDataIntakePersistenceConstructor>;
export const DATA_INTAKE_POSTGRES_SCHEMA = runtimeExport<string>(postgresModule, "DATA_INTAKE_POSTGRES_SCHEMA");
export type { PostgresDataIntakeOptions } from "./postgres.js";
