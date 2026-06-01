# PR Checklist Generator

[![CI](https://github.com/chunjiegame-cpu/pr-checklist-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/chunjiegame-cpu/pr-checklist-generator/actions/workflows/ci.yml)
[![Action](https://img.shields.io/badge/github-action-2088FF.svg)](./action.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Generate risk-aware pull request review checklists from git diffs. The CLI looks at changed files, classifies the affected areas, estimates review risk, and produces a Markdown checklist that maintainers can paste into a PR or publish through GitHub Actions.

This is meant to reduce repetitive pull request review work: tests, docs, config changes, API impact, UI verification, and security-sensitive changes all get surfaced before review. It does not approve code, replace maintainers, or pretend that filename heuristics are security analysis. It gives reviewers a better starting point.

## Why Maintainers Use It

Most maintainers have a mental checklist they repeat on every PR. Did tests change? Did docs need updates? Did config or CI move? Is this API-facing? Did it touch auth, tokens, permissions, or secrets? PR Checklist Generator makes that checklist explicit and repeatable so review time can go into the actual change.

## Installation

```bash
npm install -g pr-checklist-generator
```

From source:

```bash
git clone https://github.com/chunjiegame-cpu/pr-checklist-generator.git
cd pr-checklist-generator
npm install
node bin/pr-checklist.js --base main
```

## Usage

```bash
pr-checklist
pr-checklist --base origin/main
pr-checklist --fail-on-risk high
pr-checklist --out PR-CHECKLIST.md
pr-checklist --json
```

## GitHub Action

Use this repository directly as a GitHub Action:

```yaml
name: PR checklist

on:
  pull_request:

permissions:
  contents: read

jobs:
  checklist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: chunjiegame-cpu/pr-checklist-generator@v0.2.0
        with:
          base: origin/${{ github.base_ref }}
          output: PR-CHECKLIST.md
          fail_on_risk: high
          add_to_summary: "true"
```

## Sample Output

```text
# PR Review Checklist

Base: `main`
Diff: 4 files changed
Risk: medium

## Checklist

- [ ] Confirmed the change is scoped to the PR description.
- [ ] Ran the relevant tests locally or in CI.
- [ ] Checked API compatibility, status codes, and migration impact.

## Risk Reasons

- API-facing files changed.
- Source changed without detected test changes.
```

## What It Detects

| Area | Signals |
| --- | --- |
| Tests | `test`, `tests`, `spec`, `*.test.js` |
| Docs | Markdown and `docs/` paths |
| Config | package metadata, JSON, YAML, GitHub workflows |
| API | routes, controllers, server, API paths |
| UI | JSX/TSX, components, pages, styles |
| Security | auth, permission, token, secret, password paths |

The current rules are documented in [docs/review-signals.md](./docs/review-signals.md). The roadmap is in [ROADMAP.md](./ROADMAP.md).

## Risk Levels

Risk scoring is intentionally simple and explainable:

| Signal | Effect |
| --- | --- |
| Many files changed | Raises review risk. |
| API-facing files changed | Raises compatibility review risk. |
| Config or automation changed | Raises CI/release review risk. |
| Security-sensitive names changed | Raises security review risk. |
| Source changed without tests | Raises regression review risk. |

## CLI Reference

| Option | Description |
| --- | --- |
| `--base <ref>` | Base ref for `git diff`. Defaults to `main`. |
| `--json` | Print machine-readable JSON. |
| `--fail-on-risk <level>` | Exit `2` when risk is at least `low`, `medium`, or `high`. |
| `-o, --out <file>` | Write Markdown output to a file. |
| `-h, --help` | Show help. |

## Maintainer Workflow

1. Run the CLI locally before asking for review.
2. Add the GitHub Action to publish a checklist in the job summary.
3. Use `fail_on_risk: high` when a project wants manual attention on risky PRs.
4. File false positives as issues so review signals can improve without becoming noisy.
5. Treat the output as review support, not an approval decision.

## Codex for OSS Notes

See [docs/application-notes.md](./docs/application-notes.md) for the maintainer-oriented project summary and API-credit usage plan.

## Development

```bash
npm install
npm test
node bin/pr-checklist.js --help
```

## Known Limits

- It uses filenames and git metadata, not semantic code analysis.
- Risk scoring is intentionally simple and explainable.
- The tool does not call the GitHub API or post comments by itself.
- Security signals are conservative hints, not vulnerability findings.

## License

MIT
