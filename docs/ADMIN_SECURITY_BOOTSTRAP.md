# GitHub Administrative Security Bootstrap

This repository contains the policy and automation needed to apply the final GitHub administrative controls.

## Why this is separate from CI

Repository rulesets and repository-level security settings are administrative controls. They require a credential with repository administration permission; the normal repository contents workflow token is not sufficient.

The policy is stored in:

- `ops/github/main-ruleset.json` — declarative protection for `main`.
- `ops/github/security-hardening.sh` — applies the ruleset and enables secret scanning plus push protection.
- `ops/github/verify-security.sh` — reads the live configuration and prints the expected controls.

GitHub documents repository ruleset creation as requiring the `Administration` repository permission (write). GitHub also exposes repository security settings for enabling secret scanning and push protection.

## One-time bootstrap

From a trusted administrator workstation:

```bash
gh auth status
./ops/github/security-hardening.sh
./ops/github/verify-security.sh
```

A repository name can be supplied explicitly:

```bash
./ops/github/security-hardening.sh eliezermardegan/Hub-Carbon-Platform
./ops/github/verify-security.sh eliezermardegan/Hub-Carbon-Platform
```

Never place a personal access token in this repository, a workflow file, or shell history. Prefer `gh auth login` with the least privilege required.

## Status-check safety

The ruleset lists the check contexts currently expected from this repository:

- `test / test`
- `Supply Chain Security / security`
- `Dependency Review and SBOM / dependency-review`
- `Dependency Review and SBOM / sbom`
- `Factor Provenance Gate / factor-provenance`

Before enforcing the ruleset on production work, confirm these exact contexts on a real pull request. If GitHub reports a different check context, update `ops/github/main-ruleset.json` before applying it.

## Expected end state

- Pull requests are required before changes reach `main`.
- At least one approval is required.
- CODEOWNERS review is required.
- Stale approvals are dismissed after new commits.
- Review threads must be resolved.
- Force pushes and branch deletion are blocked.
- Required CI/security checks must pass.
- Secret scanning and push protection are enabled.
- The configuration can be re-applied and independently verified.

## Current limitation

The GitHub repository connector used for source changes does not grant repository-administration mutation. Therefore these files prepare the administrative controls but do not claim that the live repository settings have already been changed.

## Recovery

If a ruleset blocks legitimate maintenance, an administrator can temporarily disable or adjust the ruleset in GitHub, correct the declarative file, and re-apply it. Any exception should be documented in the relevant governance issue or pull request.
