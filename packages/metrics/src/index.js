import { yearRows } from './util.js';
import { THRESHOLDS } from './thresholds.js';
import { competitiveAdvantage } from './competitiveAdvantage.js';
import { earningsQuality } from './earningsQuality.js';
import { balanceSheet } from './balanceSheet.js';
import { capitalAllocation } from './capitalAllocation.js';
import { valuation, intrinsicValue } from './valuation.js';

/**
 * Compute every metric group for a company. Deterministic: same input, same output.
 * The LLM agents only ever interpret these numbers — they never calculate.
 *
 * @param {import('@cacaometrics/data/src/schema.js').CompanyFinancials} company
 * @param {{ currentPrice?: number, thresholds?: typeof THRESHOLDS }} [options]
 */
export function computeAllMetrics(company, { currentPrice, thresholds = THRESHOLDS } = {}) {
  const rows = yearRows(company);
  const groups = {
    competitiveAdvantage: competitiveAdvantage(rows, thresholds),
    earningsQuality: earningsQuality(rows, thresholds),
    balanceSheet: balanceSheet(rows, thresholds),
    capitalAllocation: capitalAllocation(rows, thresholds),
    valuation: valuation(rows, { currentPrice }, thresholds),
  };

  const allChecks = Object.values(groups).flatMap((g) => g.checks);
  const scored = allChecks.filter((c) => c.pass !== null);

  return {
    company: {
      ticker: company.ticker,
      name: company.name,
      exchange: company.exchange,
      currency: company.currency,
      units: company.units,
      source: company.source,
      fictional: Boolean(company.fictional),
      firstYear: rows[0].year,
      lastYear: rows[rows.length - 1].year,
    },
    groups,
    checksPassed: scored.filter((c) => c.pass).length,
    checksScored: scored.length,
    thresholds,
  };
}

export {
  THRESHOLDS,
  yearRows,
  competitiveAdvantage,
  earningsQuality,
  balanceSheet,
  capitalAllocation,
  valuation,
  intrinsicValue,
};
