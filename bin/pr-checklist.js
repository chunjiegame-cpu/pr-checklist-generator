#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { collectDiff, createChecklist, formatChecklist, loadConfig } from "../src/index.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const diff = collectDiff(process.cwd(), args.base);
  const config = loadConfig(process.cwd(), args.config);
  const checklist = createChecklist(diff, { config });

  if (args.json) {
    console.log(JSON.stringify(checklist, null, 2));
  } else {
    const output = formatChecklist(checklist);
    if (args.output) {
      const outPath = path.resolve(process.cwd(), args.output);
      fs.writeFileSync(outPath, output);
      console.log(`PR checklist written to ${outPath}`);
    } else {
      process.stdout.write(output);
    }
  }

  if (args.failOnRisk && shouldFailOnRisk(checklist.risk.level, args.failOnRisk)) {
    console.error(`pr-checklist: risk level ${checklist.risk.level} meets --fail-on-risk ${args.failOnRisk}`);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`pr-checklist: ${error.message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { base: "main", config: undefined, json: false, output: undefined, failOnRisk: undefined, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--base") parsed.base = argv[++index];
    else if (arg === "--config") parsed.config = argv[++index];
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--fail-on-risk") parsed.failOnRisk = argv[++index];
    else if (arg === "--out" || arg === "-o") parsed.output = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.failOnRisk && !["low", "medium", "high"].includes(parsed.failOnRisk)) {
    throw new Error("--fail-on-risk expects low, medium, or high");
  }

  return parsed;
}

function shouldFailOnRisk(actual, threshold) {
  const rank = { low: 1, medium: 2, high: 3 };
  return rank[actual] >= rank[threshold];
}

function printHelp() {
  console.log(`Usage: pr-checklist [options]

Options:
  --base <ref>       Base ref for git diff (default: main)
  --config <file>    Config file path (default: .pr-checklist.json when present)
  --json             Print machine-readable JSON
  --fail-on-risk <n> Exit 2 when risk is low, medium, or high
  -o, --out <file>   Write Markdown output to a file
  -h, --help         Show help
`);
}
