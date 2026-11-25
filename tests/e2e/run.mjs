#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printTierReport } from './lib/reporter.mjs';
import { runSelfCheck } from './self-check.mjs';
import { runTier1 } from './tier1.mjs';
import { runTier2 } from './tier2.mjs';
import { runTier3 } from './tier3.mjs';
import { runTier4 } from './tier4.mjs';

const VALID_TIERS = new Set([1, 2, 3, 4]);

function printUsage() {
  console.log(`Usage: node apps/public/tests/e2e/run.mjs [options]

Options:
  --tier=<1..4>   Run specific tier(s), comma-separated or repeated (default: 1,2,3,4)
  --skip-build    Skip running "npm run build" in Tier 1 (assert existing dist/)
  --self-check    Run isolated validator + synthetic Tiers 1-4 verification in os.tmpdir()
  -h, --help      Show this help message
`);
}

function parseTierTokens(raw, tiersSet) {
  for (const part of String(raw).split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!/^[1-4]$/.test(trimmed)) {
      throw new Error(`Invalid tier "${trimmed}". Expected 1, 2, 3, or 4.`);
    }
    const num = Number(trimmed);
    if (!VALID_TIERS.has(num)) {
      throw new Error(`Invalid tier "${trimmed}". Expected 1, 2, 3, or 4.`);
    }
    tiersSet.add(num);
  }
}

export function parseCliArgs(argv) {
  const tiersSet = new Set();
  let skipBuild = false;
  let selfCheck = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      help = true;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg === '--self-check') {
      selfCheck = true;
    } else if (arg.startsWith('--tier=')) {
      parseTierTokens(arg.slice('--tier='.length), tiersSet);
    } else if (arg === '--tier') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('Missing value for --tier');
      }
      parseTierTokens(next, tiersSet);
      i += 1;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  const tiers = tiersSet.size > 0 ? [...tiersSet].sort((a, b) => a - b) : [1, 2, 3, 4];
  return { tiers, skipBuild, selfCheck, help };
}

async function main() {
  let opts;
  try {
    opts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    printUsage();
    process.exit(1);
  }

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(__dirname, '../../../..');

  if (opts.selfCheck) {
    const res = await runSelfCheck();
    for (const t of res.tiers) {
      printTierReport(t);
    }
    printTierReport(res.selfCheck);

    const allReports = [...res.tiers, res.selfCheck];
    const totalPassed = allReports.reduce((s, r) => s + r.passed, 0);
    const totalChecks = allReports.reduce((s, r) => s + r.total, 0);
    const totalFailed = allReports.reduce((s, r) => s + r.failed, 0);
    console.log(`\nOverall Self-Check Summary: ${totalPassed}/${totalChecks} passed (${totalFailed} failed)`);
    process.exit(totalFailed === 0 ? 0 : 1);
  }

  const tierRunners = {
    1: () => runTier1({ workspaceRoot, skipBuild: opts.skipBuild }),
    2: () => runTier2({ workspaceRoot }),
    3: () => runTier3({ workspaceRoot }),
    4: () => runTier4({ workspaceRoot }),
  };

  const reports = [];
  let fatalError = false;

  for (const tierNum of opts.tiers) {
    try {
      const report = await tierRunners[tierNum]();
      reports.push(report);
      printTierReport(report);
    } catch (err) {
      fatalError = true;
      console.error(`\n[FATAL] Tier ${tierNum} aborted: ${err?.stack || err?.message || String(err)}`);
    }
  }

  const totalPassed = reports.reduce((s, r) => s + r.passed, 0);
  const totalChecks = reports.reduce((s, r) => s + r.total, 0);
  const totalFailed = reports.reduce((s, r) => s + r.failed, 0);
  console.log(`\nOverall Summary: ${totalPassed}/${totalChecks} passed (${totalFailed} failed)`);
  process.exit(!fatalError && totalFailed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
