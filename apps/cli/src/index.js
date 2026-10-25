#!/usr/bin/env node
/**
 * CacaoMetrics CLI
 *
 *   npm run metrics -- DEMO              print the deterministic metrics
 *   npm run analyze -- DEMO              full multi-agent analysis with Claude, saved to runs/
 *   npm run analyze:mock -- DEMO         same pipeline with the offline mock LLM
 *   node apps/cli/src/index.js list      companies available
 *
 * Options: --price <n> override current share price, --out <file> custom output path
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonFileFinancialsSource } from '@cacaometrics/data';
import { computeAllMetrics } from '@cacaometrics/metrics';
import { analyze, AnthropicLlm, MockLlm } from '@cacaometrics/agents';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
if (existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--price', '--out'].includes(args[i - 1])));
const [command, ticker] = positional;

const source = new JsonFileFinancialsSource({ dir: path.resolve(ROOT, process.env.FINANCIALS_DIR || 'data/financials') });
const runsDir = path.resolve(ROOT, process.env.RUNS_DIR || 'runs');

const pct = (x) => (x === null ? '  n/d ' : `${(x * 100).toFixed(1).padStart(5)}%`);
const mark = (p) => (p === null ? '·' : p ? '✓' : '✗');

async function main() {
  if (command === 'list') {
    for (const c of await source.listCompanies()) console.log(`${c.ticker.padEnd(10)} ${c.exchange.padEnd(6)} ${c.name}`);
    return;
  }

  if (!['metrics', 'analyze'].includes(command) || !ticker) {
    console.log('Usage: cacao <list | metrics TICKER | analyze TICKER> [--mock] [--price n] [--out file]');
    process.exitCode = 1;
    return;
  }

  const company = await source.getFinancials(ticker);
  const price = option('price') ? Number(option('price')) : undefined;
  const metrics = computeAllMetrics(company, { currentPrice: price });

  if (command === 'metrics') {
    console.log(`\n${metrics.company.name} (${metrics.company.ticker}) ${metrics.company.firstYear}–${metrics.company.lastYear}`);
    if (metrics.company.fictional) console.log('⚠  Fictional company — not real data');
    for (const [group, g] of Object.entries(metrics.groups)) {
      console.log(`\n${group}`);
      for (const c of g.checks) {
        const v = typeof c.value === 'number' && Math.abs(c.value) <= 5 ? pct(c.value) : String(c.value).padStart(7);
        console.log(`  ${mark(c.pass)} ${v}  ${c.label}`);
      }
    }
    const v = metrics.groups.valuation.summary.intrinsicValuePerShare;
    console.log(`\nIntrinsic value per share: ${v.conservative} / ${v.base} / ${v.optimistic} (conservative / base / optimistic)`);
    console.log(`Checks passed: ${metrics.checksPassed}/${metrics.checksScored}\n`);
    return;
  }

  const llm = flag('mock') ? new MockLlm() : new AnthropicLlm();
  console.log(`Analyzing ${company.ticker} with ${flag('mock') ? 'the mock LLM' : llm.model}…`);
  const run = await analyze(metrics, {
    llm,
    onEvent: (e) => {
      if (e.type === 'agent_started') console.log(`  → ${e.name.en}`);
      if (e.type === 'agent_finished') console.log(`  ✓ ${e.name.en}: ${e.score}/10 (${e.verdict})`);
      if (e.type === 'orchestrator_started') console.log('  → Final assessment');
    },
  });

  await mkdir(runsDir, { recursive: true });
  const out = option('out') ? path.resolve(option('out')) : path.join(runsDir, `${company.ticker}.json`);
  await writeFile(out, JSON.stringify(run, null, 2) + '\n');
  console.log(`\n${run.final.verdict} — ${run.final.overallScore}/100`);
  console.log(run.final.headline.en);
  console.log(`\nSaved ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exitCode = 1;
});
