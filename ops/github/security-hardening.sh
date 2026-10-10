#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
RULESET_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/main-ruleset.json"

command -v gh >/dev/null || { echo "gh CLI is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }
test -f "$RULESET_FILE" || { echo "Ruleset file not found: $RULESET_FILE" >&2; exit 1; }

echo "Applying repository ruleset to $REPO..."
gh api --method POST "repos/$REPO/rulesets" \
  --header "Accept: application/vnd.github+json" \
  --input "$RULESET_FILE" >/tmp/hub-carbon-ruleset.json

echo "Enabling secret scanning and push protection on $REPO..."
gh api --method PATCH "repos/$REPO" \
  --header "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON

echo "Security hardening applied. Run ops/github/verify-security.sh to verify."
