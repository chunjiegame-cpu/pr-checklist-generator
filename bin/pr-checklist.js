#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { collectDiff, createChecklist, formatChecklist } from "../src/index.js";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const diff = collectDiff(process.cwd(), args.base);
  const checklist = createChecklist(diff);

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
} catch (error) {
  console.error(`pr-checklist: ${error.message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { base: "main", json: false, output: undefined, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--base") parsed.base = argv[++index];
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--out" || arg === "-o") parsed.output = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: pr-checklist [options]

Options:
  --base <ref>       Base ref for git diff (default: main)
  --json             Print machine-readable JSON
  -o, --out <file>   Write Markdown output to a file
  -h, --help         Show help
`);
}
