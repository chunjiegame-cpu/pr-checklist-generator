# PR Checklist Generator

[![CI](https://github.com/chunjiegame-cpu/pr-checklist-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/chunjiegame-cpu/pr-checklist-generator/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Generate review checklists from git diffs for maintainers and contributors. The CLI looks at changed files, classifies the affected areas, estimates review risk, and produces a Markdown checklist.

This is meant to reduce repetitive pull request review work: tests, docs, config changes, API impact, UI verification, and security-sensitive changes all get surfaced before review.

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
pr-checklist --out PR-CHECKLIST.md
pr-checklist --json
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

## CLI Reference

| Option | Description |
| --- | --- |
| `--base <ref>` | Base ref for `git diff`. Defaults to `main`. |
| `--json` | Print machine-readable JSON. |
| `-o, --out <file>` | Write Markdown output to a file. |
| `-h, --help` | Show help. |

## Maintainer Workflow

Add the generated checklist to PR descriptions, review comments, or maintainer handoff notes. It is intentionally conservative: the reviewer still decides what matters.

## Development

```bash
npm install
npm test
node bin/pr-checklist.js --help
```

## Known Limits

- It uses filenames and git metadata, not semantic code analysis.
- Risk scoring is intentionally simple and explainable.
- The tool does not call the GitHub API.

## License

MIT
