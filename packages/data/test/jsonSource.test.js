import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonFileFinancialsSource, CompanyNotFoundError, validateCompanyFinancials } from '../src/index.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data/financials');
const source = new JsonFileFinancialsSource({ dir });

test('loads the DEMO fixture and it is valid', async () => {
  const c = await source.getFinancials('demo');
  assert.equal(c.ticker, 'DEMO');
  assert.deepEqual(validateCompanyFinancials(c), []);
});

test('unknown ticker throws CompanyNotFoundError', async () => {
  await assert.rejects(source.getFinancials('NOPE'), CompanyNotFoundError);
});

test('listCompanies skips files starting with "_"', async () => {
  const list = await source.listCompanies();
  assert.ok(list.some((c) => c.ticker === 'DEMO'));
  assert.ok(!list.some((c) => c.ticker === 'TICKER'));
});

test('validation reports missing fields', () => {
  const problems = validateCompanyFinancials({ ticker: 'X', years: { 2024: { revenue: 1 } } });
  assert.ok(problems.some((p) => p.includes('grossProfit')));
  assert.ok(problems.some((p) => p.includes('at least 3')));
});
