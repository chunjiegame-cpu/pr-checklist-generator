import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createChecklist, formatChecklist, parseNameStatus } from "../src/index.js";

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
  assert.match(markdown, /Changed Files/);
});

test("CLI help renders", () => {
  const bin = fileURLToPath(new URL("../bin/pr-checklist.js", import.meta.url));
  const output = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" });

  assert.match(output, /Usage: pr-checklist/);
});
