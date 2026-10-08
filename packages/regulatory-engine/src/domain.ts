export type JurisdictionCode = string;
export type RegulationId = string;
export type RegulationVersion = string;
export type RuleId = string;
export type RuleVersion = string;

export interface RegulatoryContext {
  jurisdiction: JurisdictionCode;
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
  readonly effectiveTo?: string;
  readonly description: string;
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

function isWithinEffectiveWindow(rule: RegulatoryRule, asOf: string): boolean {
  const date = new Date(asOf);
  const from = new Date(rule.effectiveFrom);
  const to = rule.effectiveTo ? new Date(rule.effectiveTo) : undefined;
  if (Number.isNaN(date.getTime()) || Number.isNaN(from.getTime())) return false;
  return date >= from && (!to || date <= to);
}

export function createRegulatoryEngine(input: {
  regulation: RegulationId;
  jurisdiction: JurisdictionCode;
  regulationVersion: RegulationVersion;
  rules: readonly RegulatoryRule[];
}): RegulatoryEngine {
  const rules = [...input.rules];
  return {
    regulation: input.regulation,
    jurisdiction: input.jurisdiction,
    versions: [input.regulationVersion],
    evaluate(context) {
      if (context.jurisdiction !== input.jurisdiction) {
        throw new Error(`Jurisdiction mismatch: expected ${input.jurisdiction}, received ${context.jurisdiction}`);
      }
      const activeRules = rules.filter((rule) => isWithinEffectiveWindow(rule, context.asOf));
      if (activeRules.length !== 1) {
        return {
          applicability: "insufficient_data",
          regulation: input.regulation,
          regulationVersion: input.regulationVersion,
          ruleId: "RULE_SELECTION",
          ruleVersion: input.regulationVersion,
          effectiveFrom: context.asOf,
          reason: activeRules.length === 0
            ? "No active rule exists for the supplied date."
            : "More than one active rule matches the supplied date; rule selection is ambiguous.",
          requiredInputs: ["regulation rule set"],
          requiredEvidence: [],
        };
      }
      return activeRules[0].evaluate(context);
    },
  };
}