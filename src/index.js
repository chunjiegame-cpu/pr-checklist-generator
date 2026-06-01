import { execFileSync } from "node:child_process";
import path from "node:path";

const TEST_PATTERNS = [/(\b|\/)(test|tests|spec|__tests__)(\/|\b)/i, /\.(test|spec)\.[jt]sx?$/i];
const DOC_PATTERNS = [/\.md$/i, /^docs\//i];
const CONFIG_PATTERNS = [/package\.json$/, /package-lock\.json$/, /\.ya?ml$/i, /\.json$/i, /^\.github\//i];
const SECURITY_PATTERNS = [/auth/i, /security/i, /permission/i, /token/i, /secret/i, /password/i];
const API_PATTERNS = [/api/i, /routes?/i, /controllers?/i, /server/i];
const UI_PATTERNS = [/\.[jt]sx$/i, /components?\//i, /pages?\//i, /styles?\//i, /\.css$/i];

export function collectDiff(cwd, base = "main") {
  const nameStatus = execFileSync("git", ["diff", "--name-status", `${base}...HEAD`], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const stat = execFileSync("git", ["diff", "--shortstat", `${base}...HEAD`], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();

  return { files: parseNameStatus(nameStatus), stat, base };
}

export function parseNameStatus(output) {
  return (output ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...parts] = line.split(/\t+/);
      const filePath = parts.at(-1);
      return { status, path: filePath, ext: path.extname(filePath).toLowerCase() };
    });
}

export function createChecklist(diff) {
  const areas = classifyFiles(diff.files);
  const checklist = [
    "Confirmed the change is scoped to the PR description.",
    "Ran the relevant tests locally or in CI.",
    "Checked error handling and edge cases.",
    "Updated docs or examples when behavior changed."
  ];

  if (areas.tests === 0) checklist.push("Explained why tests were not added or updated.");
  if (areas.docs > 0) checklist.push("Reviewed documentation for accuracy and stale examples.");
  if (areas.config > 0) checklist.push("Checked configuration, CI, and package metadata changes carefully.");
  if (areas.api > 0) checklist.push("Checked API compatibility, status codes, and migration impact.");
  if (areas.ui > 0) checklist.push("Verified UI states, responsive behavior, and screenshots when relevant.");
  if (areas.security > 0) checklist.push("Reviewed authentication, authorization, and secret-handling implications.");

  return {
    base: diff.base,
    stat: diff.stat,
    files: diff.files,
    areas,
    risk: estimateRisk(diff.files, areas),
    checklist,
    reviewNotes: buildReviewNotes(diff.files, areas)
  };
}

export function formatChecklist(result) {
  const lines = [
    "# PR Review Checklist",
    "",
    `Base: \`${result.base}\``,
    result.stat ? `Diff: ${result.stat}` : "Diff: no file changes detected",
    `Risk: ${result.risk.level}`,
    "",
    "## Checklist",
    "",
    ...result.checklist.map((item) => `- [ ] ${item}`),
    "",
    "## Review Notes",
    "",
    ...result.reviewNotes.map((note) => `- ${note}`),
    "",
    "## Changed Files",
    "",
    ...formatFiles(result.files)
  ];

  return `${lines.join("\n")}\n`;
}

function classifyFiles(files) {
  const areas = { docs: 0, tests: 0, config: 0, api: 0, ui: 0, security: 0, source: 0 };

  for (const file of files) {
    if (matches(file.path, DOC_PATTERNS)) areas.docs += 1;
    else if (matches(file.path, TEST_PATTERNS)) areas.tests += 1;
    else if (matches(file.path, CONFIG_PATTERNS)) areas.config += 1;
    else areas.source += 1;

    if (matches(file.path, API_PATTERNS)) areas.api += 1;
    if (matches(file.path, UI_PATTERNS)) areas.ui += 1;
    if (matches(file.path, SECURITY_PATTERNS)) areas.security += 1;
  }

  return areas;
}

function estimateRisk(files, areas) {
  let score = 0;
  score += files.length >= 20 ? 3 : files.length >= 8 ? 2 : files.length >= 3 ? 1 : 0;
  if (areas.security) score += 3;
  if (areas.api) score += 2;
  if (areas.config) score += 1;
  if (areas.tests === 0 && areas.source > 0) score += 2;

  if (score >= 6) return { level: "high", score };
  if (score >= 3) return { level: "medium", score };
  return { level: "low", score };
}

function buildReviewNotes(files, areas) {
  const notes = [];
  if (files.length === 0) notes.push("No changed files detected.");
  if (areas.tests === 0 && areas.source > 0) notes.push("Source changed without detected test changes.");
  if (areas.security > 0) notes.push("Security-sensitive paths or names changed.");
  if (areas.api > 0) notes.push("API-facing files changed; check compatibility and consumers.");
  if (areas.config > 0) notes.push("Configuration or automation changed; check CI behavior.");
  if (notes.length === 0) notes.push("No special review notes detected.");
  return notes;
}

function formatFiles(files) {
  return files.length ? files.map((file) => `- ${file.status} \`${file.path}\``) : ["- None"];
}

function matches(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}
