#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

command -v gh >/dev/null || { echo "gh CLI is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }

echo "Repository security settings:"
gh api "repos/$REPO" --jq '.security_and_analysis | {
  secret_scanning: .secret_scanning.status,
  secret_scanning_push_protection: .secret_scanning_push_protection.status
}'

echo
echo "Rulesets:"
gh api "repos/$REPO/rulesets" --jq '.[] | select(.name=="main-hardening") | {
  name, enforcement, target, conditions, rules
}'

echo
echo "Expected controls:"
echo "- main-hardening: active"
echo "- target: branch refs/heads/main"
echo "- pull request: 1 approval + CODEOWNERS + stale-review dismissal"
echo "- required checks: test / test, Supply Chain Security / security, Dependency Review and SBOM / dependency-review, Dependency Review and SBOM / sbom, Factor Provenance Gate / factor-provenance"
echo "- no force pushes / no branch deletion"
echo "- secret scanning: enabled"
echo "- push protection: enabled"
