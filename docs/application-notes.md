# Application Notes

This repository is positioned for maintainer workflows rather than general code generation.

## Best Repository URL

https://github.com/chunjiegame-cpu/pr-checklist-generator

## Role

Primary maintainer.

## Why The Project Matters

Maintainers repeat the same PR review checks across projects: tests, documentation, config changes, API impact, UI behavior, and security-sensitive paths. This tool turns git diff metadata into a practical checklist and risk summary, making that routine review work more consistent without auto-approving or replacing the maintainer.

## How Codex Would Help

Codex could turn the current filename-based signals into richer review support: summarize diffs, explain why a change looks risky, suggest missing tests or docs, and draft editable review comments. Codex Security would be especially useful for improving detection around auth, permissions, secrets, and configuration changes.

## Evidence To Keep Building

- More real-world fixtures from open-source pull requests.
- GitHub Action usage examples.
- Reports showing how checklist output changes review behavior.
- Issue triage examples that document false positives and rule improvements.
