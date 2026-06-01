import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TEST_PATTERNS = [/(\b|\/)(test|tests|spec|__tests__)(\/|\b)/i, /\.(test|spec)\.[jt]sx?$/i];
const DOC_PATTERNS = [/\.md$/i, /^docs\//i];
const CONFIG_PATTERNS = [/package\.json$/, /package-lock\.json$/, /\.ya?ml$/i, /\.json$/i, /^\.github\//i];
const SECURITY_PATTERNS = [/auth/i, /security/i, /permission/i, /token/i, /secret/i, /password/i];
const API_PATTERNS = [/api/i, /routes?/i, /controllers?/i, /server/i];
const UI_PATTERNS = [/\.[jt]sx$/i, /components?\//i, /pages?\//i, /styles?\//i, /\.css$/i];
const KNOWN_PATTERN_GROUPS = ["docs", "tests", "config", "api", "ui", "security"];

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

export function loadConfig(cwd, configPath) {
  const requestedPath = Boolean(configPath);
  const resolvedPath = path.resolve(cwd, configPath ?? ".pr-checklist.json");

  if (!fs.existsSync(resolvedPath)) {
    if (requestedPath) {
      throw new Error(`Config file not found: ${resolvedPath}`);
    }
    return normalizeConfig();
  }

  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(resolvedPath, "utf8")), resolvedPath);
  } catch (error) {
    throw new Error(`Could not read config file ${resolvedPath}: ${error.message}`);
  }
}

export function createChecklist(diff, options = {}) {
  const config = normalizeConfig(options.config);
  const { files, ignoredFiles } = applyIgnore(diff.files, config.ignore);
  const areas = classifyFiles(files, config.patterns);
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
  checklist.push(...config.checklist);

  const risk = estimateRisk(files, areas);

  return {
    base: diff.base,
    stat: diff.stat,
    files,
    ignoredFiles,
    areas,
    risk,
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
    "## Risk Reasons",
    "",
    ...formatList(result.risk.reasons, (reason) => `- ${reason}`),
    "",
    "## Changed Files",
    "",
    ...formatFiles(result.files),
    "",
    "## Ignored Files",
    "",
    ...formatFiles(result.ignoredFiles ?? [])
  ];

  return `${lines.join("\n")}\n`;
}

function classifyFiles(files, customPatterns = {}) {
  const areas = { docs: 0, tests: 0, config: 0, api: 0, ui: 0, security: 0, source: 0 };

  for (const file of files) {
    if (matches(file.path, DOC_PATTERNS, customPatterns.docs)) areas.docs += 1;
    else if (matches(file.path, TEST_PATTERNS, customPatterns.tests)) areas.tests += 1;
    else if (matches(file.path, CONFIG_PATTERNS, customPatterns.config)) areas.config += 1;
    else areas.source += 1;

    if (matches(file.path, API_PATTERNS, customPatterns.api)) areas.api += 1;
    if (matches(file.path, UI_PATTERNS, customPatterns.ui)) areas.ui += 1;
    if (matches(file.path, SECURITY_PATTERNS, customPatterns.security)) areas.security += 1;
  }

  return areas;
}

function estimateRisk(files, areas) {
  let score = 0;
  const reasons = [];

  if (files.length >= 20) {
    score += 3;
    reasons.push("Large change set with 20 or more files.");
  } else if (files.length >= 8) {
    score += 2;
    reasons.push("Moderate change set with 8 or more files.");
  } else if (files.length >= 3) {
    score += 1;
    reasons.push("Multiple files changed.");
  }

  if (areas.security) {
    score += 3;
    reasons.push("Security-sensitive path or filename detected.");
  }
  if (areas.api) {
    score += 2;
    reasons.push("API-facing files changed.");
  }
  if (areas.config) {
    score += 1;
    reasons.push("Configuration or automation files changed.");
  }
  if (areas.tests === 0 && areas.source > 0) {
    score += 2;
    reasons.push("Source changed without detected test changes.");
  }

  const level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
  return { level, score, reasons: reasons.length ? reasons : ["No elevated risk signals detected."] };
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

function formatList(items, formatter) {
  return items.length ? items.map(formatter) : ["- None"];
}

function applyIgnore(files, ignorePatterns) {
  const ignoredFiles = [];
  const keptFiles = [];

  for (const file of files) {
    if (matchesCustom(file.path, ignorePatterns)) ignoredFiles.push(file);
    else keptFiles.push(file);
  }

  return { files: keptFiles, ignoredFiles };
}

function normalizeConfig(config = {}, configPath = null) {
  const patterns = {};
  const rawPatterns = config.patterns ?? {};

  for (const key of Object.keys(rawPatterns)) {
    if (!KNOWN_PATTERN_GROUPS.includes(key)) {
      throw new Error(`Unknown config pattern group: ${key}`);
    }
    patterns[key] = asStringArray(rawPatterns[key], `patterns.${key}`);
  }

  return {
    path: configPath,
    ignore: asStringArray(config.ignore, "ignore"),
    checklist: asStringArray(config.checklist, "checklist"),
    patterns
  };
}

function asStringArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Config field ${label} must be an array of strings`);
  }
  return value;
}

function matches(value, defaultPatterns, customPatterns = []) {
  return defaultPatterns.some((pattern) => pattern.test(value)) || matchesCustom(value, customPatterns);
}

function matchesCustom(value, patterns = []) {
  return patterns.some((pattern) => globToRegex(pattern).test(value.replace(/\\/g, "/")));
}

function globToRegex(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  const escaped = normalized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp(`^${regex}$`, "i");
}
