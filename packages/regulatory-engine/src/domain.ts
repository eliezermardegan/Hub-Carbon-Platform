export type JurisdictionCode = string;
export type RegulationId = string;
export type RegulationVersion = string;
export type RuleId = string;
export type RuleVersion = string;

export interface RegulatoryContext {
  jurisdiction: JurisdictionCode;
  /** Calendar date relevant to the obligation, formatted YYYY-MM-DD. */
  asOf: string;
  activityType: string;
  productCode?: string;
  originCountry?: string;
  destinationCountry?: string;
  quantity?: number;
  quantityUnit?: string;
  attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface RegulatoryRule {
  readonly id: RuleId;
  readonly version: RuleVersion;
  readonly effectiveFrom: string;
  /** Inclusive calendar date; omitted means no configured end date. */
  readonly effectiveTo?: string;
  readonly description: string;
  /** Selects this rule for the supplied context, independently of its effective window. */
  readonly matches: (context: RegulatoryContext) => boolean;
  readonly evaluate: (context: RegulatoryContext) => RegulatoryDecision;
}

export interface RegulatoryDecision {
  readonly applicability: "applicable" | "not_applicable" | "insufficient_data";
  readonly regulation: RegulationId;
  readonly regulationVersion: RegulationVersion;
  readonly ruleId: RuleId;
  readonly ruleVersion: RuleVersion;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly reason: string;
  readonly requiredInputs: readonly string[];
  readonly requiredEvidence: readonly string[];
}

export interface RegulatoryEngine {
  readonly regulation: RegulationId;
  readonly jurisdiction: JurisdictionCode;
  readonly versions: readonly RegulationVersion[];
  evaluate(context: RegulatoryContext): RegulatoryDecision;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isWithinEffectiveWindow(rule: RegulatoryRule, asOf: string): boolean {
  return asOf >= rule.effectiveFrom && (!rule.effectiveTo || asOf <= rule.effectiveTo);
}

function unresolvedDecision(
  input: { regulation: RegulationId; regulationVersion: RegulationVersion },
  asOf: string,
  reason: string,
  requiredInputs: readonly string[],
): RegulatoryDecision {
  return {
    applicability: "insufficient_data",
    regulation: input.regulation,
    regulationVersion: input.regulationVersion,
    ruleId: "RULE_SELECTION",
    ruleVersion: input.regulationVersion,
    effectiveFrom: asOf,
    reason,
    requiredInputs,
    requiredEvidence: [],
  };
}

export function createRegulatoryEngine(input: {
  regulation: RegulationId;
  jurisdiction: JurisdictionCode;
  regulationVersion: RegulationVersion;
  rules: readonly RegulatoryRule[];
}): RegulatoryEngine {
  const rules = [...input.rules];

  for (const rule of rules) {
    if (!isCalendarDate(rule.effectiveFrom)) {
      throw new Error(`Invalid effectiveFrom date for rule ${rule.id}: ${rule.effectiveFrom}`);
    }
    if (rule.effectiveTo !== undefined && !isCalendarDate(rule.effectiveTo)) {
      throw new Error(`Invalid effectiveTo date for rule ${rule.id}: ${rule.effectiveTo}`);
    }
    if (rule.effectiveTo !== undefined && rule.effectiveTo < rule.effectiveFrom) {
      throw new Error(`Invalid effective window for rule ${rule.id}: effectiveTo precedes effectiveFrom`);
    }
  }

  return {
    regulation: input.regulation,
    jurisdiction: input.jurisdiction,
    versions: [input.regulationVersion],
    evaluate(context) {
      if (context.jurisdiction !== input.jurisdiction) {
        throw new Error(`Jurisdiction mismatch: expected ${input.jurisdiction}, received ${context.jurisdiction}`);
      }
      if (!isCalendarDate(context.asOf)) {
        return unresolvedDecision(
          input,
          context.asOf,
          "The obligation date must be a valid calendar date in YYYY-MM-DD format.",
          ["asOf"],
        );
      }

      const activeRules = rules.filter((rule) => isWithinEffectiveWindow(rule, context.asOf));
      if (activeRules.length === 0) {
        return unresolvedDecision(input, context.asOf, "No active rule exists for the supplied date.", ["regulation rule set"]);
      }

      const matchingRules = activeRules.filter((rule) => rule.matches(context));
      if (matchingRules.length === 0) {
        return unresolvedDecision(
          input,
          context.asOf,
          "No active rule matches the supplied activity/product context.",
          ["activityType", "productCode or applicable context attributes"],
        );
      }
      if (matchingRules.length > 1) {
        return unresolvedDecision(
          input,
          context.asOf,
          "More than one active rule matches the supplied context; rule selection is ambiguous.",
          ["unambiguous regulatory rule set"],
        );
      }

      return matchingRules[0].evaluate(context);
    },
  };
}
