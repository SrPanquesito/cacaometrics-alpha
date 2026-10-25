// Hand-checked fixture: round numbers so every expected value can be verified
// on paper. If you change a formula, re-derive the expectation by hand first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAllMetrics, intrinsicValue, yearRows } from '../src/index.js';

const company = {
  ticker: 'TEST',
  name: 'Hand-checked Co.',
  exchange: 'BMV',
  currency: 'MXN',
  units: 'millions',
  source: 'unit test',
  fictional: true,
  years: {
    // Deliberately out of order: yearRows() must sort them.
    2022: { revenue: 121, grossProfit: 60.5, sga: 12.1, rnd: 2, depreciation: 4, interestExpense: 2, operatingIncome: 40, netIncome: 24.2, eps: 2.42, sharesOutstanding: 9, cash: 20, longTermDebt: 20, totalLiabilities: 40, shareholdersEquity: 121, retainedEarnings: 72, capex: 6.05, operatingCashFlow: 30, price: 24.2 },
    2020: { revenue: 100, grossProfit: 50, sga: 10, rnd: 2, depreciation: 4, interestExpense: 2, operatingIncome: 30, netIncome: 20, eps: 2, sharesOutstanding: 10, cash: 10, longTermDebt: 40, totalLiabilities: 60, shareholdersEquity: 100, retainedEarnings: 50, capex: 5, operatingCashFlow: 25, price: 30 },
    2021: { revenue: 110, grossProfit: 55, sga: 11, rnd: 2, depreciation: 4, interestExpense: 2, operatingIncome: 35, netIncome: 22, eps: 2.2, sharesOutstanding: 10, cash: 15, longTermDebt: 30, totalLiabilities: 50, shareholdersEquity: 110, retainedEarnings: 60, capex: 5, operatingCashFlow: 27, price: 33 },
  },
};

const close = (actual, expected, eps = 1e-3) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

const m = computeAllMetrics(company);

test('yearRows sorts oldest → newest', () => {
  assert.deepEqual(yearRows(company).map((r) => r.year), [2020, 2021, 2022]);
});

test('competitive advantage: margins and expense ratios', () => {
  const s = m.groups.competitiveAdvantage.summary;
  close(s.grossMarginAvg, 0.5);
  close(s.grossMarginStdev, 0);
  close(s.sgaToGrossProfitAvg, 0.2);
  close(s.netMarginAvg, 0.2);
  close(s.interestToOperatingIncomeAvg, (2 / 30 + 2 / 35 + 2 / 40) / 3);
  const byId = Object.fromEntries(m.groups.competitiveAdvantage.checks.map((c) => [c.id, c.pass]));
  assert.equal(byId.grossMarginDurable, true);
  assert.equal(byId.sgaExcellent, true);
  assert.equal(byId.netMarginDurable, true);
});

test('earnings quality: EPS growth and ROE', () => {
  const s = m.groups.earningsQuality.summary;
  close(s.epsCagr, 0.1); // 2.00 → 2.42 over two years is exactly 10%/yr
  close(s.roeAvg, 0.2);
  assert.equal(s.positiveYears, 3);
  assert.equal(s.epsDeclines, 0);
});

test('balance sheet: debt payback and leverage', () => {
  const s = m.groups.balanceSheet.summary;
  close(s.latestYearsToRepayLtDebt, 20 / 24.2);
  close(s.latestLiabilitiesToEquity, 40 / 121);
  close(s.longTermDebtChange, -0.5);
  assert.equal(s.latestNetCash, 0);
});

test('capital allocation: capex intensity and buybacks', () => {
  const s = m.groups.capitalAllocation.summary;
  close(s.capexToNetIncomeAvg, (0.25 + 5 / 22 + 0.25) / 3);
  close(s.shareCountChange, -0.1);
});

test('valuation: base case reduces to EPS × average P/E when growth = discount rate', () => {
  const s = m.groups.valuation.summary;
  close(s.historicalPeAvg, (15 + 15 + 10) / 3, 0.01);
  // growth 10% and discount 10% cancel out, so value = 2.42 × 13.333
  close(s.intrinsicValuePerShare.base, 2.42 * (40 / 3), 0.01);
  close(s.marginOfSafety, 1 - 24.2 / (2.42 * (40 / 3)), 0.001);
});

test('intrinsicValue returns null for unusable inputs', () => {
  assert.equal(intrinsicValue({ eps: -1, growth: 0.1, pe: 15, years: 10, discountRate: 0.1 }), null);
  assert.equal(intrinsicValue({ eps: 2, growth: null, pe: 15, years: 10, discountRate: 0.1 }), null);
});

test('negative equity disables the ROE check instead of passing it', () => {
  const broken = structuredClone(company);
  broken.years[2022].shareholdersEquity = -5;
  const r = computeAllMetrics(broken);
  const roe = r.groups.earningsQuality.checks.find((c) => c.id === 'roeDurable');
  assert.equal(roe.pass, null);
  assert.equal(r.groups.earningsQuality.summary.negativeEquityYears, 1);
});

test('every check has a pass value of true, false or null', () => {
  for (const g of Object.values(m.groups)) {
    for (const c of g.checks) assert.ok([true, false, null].includes(c.pass), c.id);
  }
  assert.ok(m.checksScored > 0 && m.checksPassed <= m.checksScored);
});
