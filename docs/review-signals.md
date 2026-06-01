# Review Signals

PR Checklist Generator intentionally starts with transparent filename and diff metadata rules. The goal is to produce review prompts that maintainers understand, can challenge, and can improve over time.

## Current Signals

| Signal | Examples | Review intent |
| --- | --- | --- |
| Tests | `test/`, `tests/`, `*.test.js`, `*.spec.ts` | Check whether source changes have matching regression coverage. |
| Docs | Markdown and `docs/` paths | Check examples, install steps, and user-facing behavior notes. |
| Config | `package.json`, lockfiles, JSON, YAML, `.github/` | Check CI, release, dependency, and automation impact. |
| API | `api`, `route`, `controller`, `server` paths | Check compatibility, status codes, and consumers. |
| UI | JSX/TSX, components, pages, CSS | Check responsive states and screenshots. |
| Security | `auth`, `permission`, `token`, `secret`, `password` | Prompt human review for sensitive changes. |

## Design Rules

- Prefer explainable review prompts over opaque scores.
- Avoid claiming vulnerability findings from filenames alone.
- Make false positives easy to report and improve.
- Keep the core dependency-free so maintainers can audit the behavior.

## Planned Improvements

- Diff hunk summaries for changed functions.
- Optional Codex-assisted review explanations.
- Repository-local config for teams that use different folder names.
- GitHub Action modes for summary-only, fail-on-risk, and artifact upload.
