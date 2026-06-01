import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChecklist, formatChecklist, loadConfig, parseNameStatus } from "../src/index.js";

test("parses git name-status output", () => {
  const files = parseNameStatus("M\tsrc/api/users.js\nA\ttest/users.test.js\nR100\told.md\tREADME.md");

  assert.equal(files.length, 3);
  assert.equal(files[0].status, "M");
  assert.equal(files[2].path, "README.md");
});

test("creates risk-aware checklist", () => {
  const result = createChecklist({
    base: "main",
    stat: "3 files changed",
    files: parseNameStatus("M\tsrc/api/auth.js\nM\tpackage.json\nM\tREADME.md")
  });

  assert.equal(result.risk.level, "high");
  assert.ok(result.risk.reasons.some((item) => item.includes("Security-sensitive")));
  assert.ok(result.checklist.some((item) => item.includes("secret-handling")));
  assert.ok(result.reviewNotes.some((item) => item.includes("Source changed without detected test changes")));
});

test("formats Markdown checklist", () => {
  const markdown = formatChecklist(createChecklist({
    base: "main",
    stat: "1 file changed",
    files: parseNameStatus("M\tsrc/index.js")
  }));

  assert.match(markdown, /PR Review Checklist/);
  assert.match(markdown, /Risk Reasons/);
  assert.match(markdown, /Changed Files/);
  assert.match(markdown, /Ignored Files/);
});

test("CLI help renders", () => {
  const bin = fileURLToPath(new URL("../bin/pr-checklist.js", import.meta.url));
  const output = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" });

  assert.match(output, /Usage: pr-checklist/);
});

test("CLI validates fail-on-risk values", () => {
  const bin = fileURLToPath(new URL("../bin/pr-checklist.js", import.meta.url));
  const result = spawnSync(process.execPath, [bin, "--fail-on-risk", "critical"], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /low, medium, or high/);
});

test("loads repository-local config", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-checklist-config-"));
  fs.writeFileSync(path.join(dir, ".pr-checklist.json"), JSON.stringify({
    ignore: ["dist/**"],
    patterns: {
      security: ["infra/policies/**"],
      tests: ["e2e/**"]
    },
    checklist: ["Checked custom rollout notes."]
  }));

  const config = loadConfig(dir);
  const result = createChecklist({
    base: "main",
    stat: "3 files changed",
    files: parseNameStatus("M\tinfra/policies/access.rego\nM\tdist/bundle.js\nA\te2e/login.spec.js")
  }, { config });

  assert.equal(result.ignoredFiles.length, 1);
  assert.equal(result.areas.security, 1);
  assert.equal(result.areas.tests, 1);
  assert.ok(result.checklist.includes("Checked custom rollout notes."));
});

test("rejects unknown config pattern groups", () => {
  assert.throws(() => createChecklist({
    base: "main",
    stat: "",
    files: []
  }, {
    config: {
      patterns: {
        migrations: ["db/**"]
      }
    }
  }), /Unknown config pattern group/);
});
