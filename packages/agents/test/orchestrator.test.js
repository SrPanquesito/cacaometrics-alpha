import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAllMetrics } from '@cacaometrics/metrics';
import { analyze, MockLlm, validate, AGENT_OUTPUT_SCHEMA, ORCHESTRATOR_OUTPUT_SCHEMA, AGENTS } from '../src/index.js';

const row = (k) => ({ revenue: 100 * k, grossProfit: 50 * k, sga: 10 * k, interestExpense: 1, operatingIncome: 30 * k, netIncome: 20 * k, eps: 2 * k, sharesOutstanding: 10, cash: 10 * k, longTermDebt: 20, totalLiabilities: 30, shareholdersEquity: 100 * k, capex: 4 * k, price: 30 * k });
const company = { ticker: 'T', name: 'T', exchange: 'BMV', currency: 'MXN', units: 'millions', source: 'test', years: { 2020: row(1), 2021: row(1.1), 2022: row(1.21) } };

test('mock pipeline produces schema-valid reports and a full timeline', async () => {
  const events = [];
  const run = await analyze(computeAllMetrics(company), { llm: new MockLlm(), onEvent: (e) => events.push(e.type) });

  assert.equal(run.agentReports.length, AGENTS.length);
  for (const r of run.agentReports) assert.deepEqual(validate(r.report, AGENT_OUTPUT_SCHEMA), [], r.agentId);
  assert.deepEqual(validate(run.final, ORCHESTRATOR_OUTPUT_SCHEMA), []);

  assert.equal(events[0], 'metrics_ready');
  assert.equal(events.filter((e) => e === 'agent_finished').length, AGENTS.length);
  assert.equal(events.at(-1), 'orchestrator_finished');
});

test('invalid model output is retried once, then rejected', async () => {
  let calls = 0;
  const bad = { structured: async () => { calls += 1; return { score: 99 }; } };
  await assert.rejects(analyze(computeAllMetrics(company), { llm: bad, agents: [AGENTS[0]] }), /invalid output/);
  assert.equal(calls, 2);
});

test('validator catches wrong enum and missing fields', () => {
  const problems = validate({ score: 5, verdict: 'great' }, AGENT_OUTPUT_SCHEMA);
  assert.ok(problems.some((p) => p.includes('verdict')));
  assert.ok(problems.some((p) => p.includes('summary is required')));
});
