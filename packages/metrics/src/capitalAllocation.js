import { ratio, mean, round, check } from './util.js';
import { THRESHOLDS as T } from './thresholds.js';

/**
 * How much the business must reinvest to stay competitive, and whether it
 * returns capital to shareholders through buybacks.
 * @param {Array<Object>} rows  output of yearRows()
 */
export function capitalAllocation(rows, t = T) {
  const perYear = rows.map((r) => ({
    year: r.year,
    capexToNetIncome: r.netIncome > 0 ? round(ratio(r.capex, r.netIncome)) : null,
    freeCashFlow: r.operatingCashFlow === undefined ? null : round(r.operatingCashFlow - r.capex, 2),
    sharesOutstanding: r.sharesOutstanding,
  }));

  const first = rows[0];
  const last = rows[rows.length - 1];

  const summary = {
    capexToNetIncomeAvg: round(mean(perYear.map((p) => p.capexToNetIncome))),
    shareCountChange: round(ratio(last.sharesOutstanding - first.sharesOutstanding, first.sharesOutstanding)),
    freeCashFlowPositiveYears: perYear.filter((p) => p.freeCashFlow !== null && p.freeCashFlow > 0).length,
    freeCashFlowYearsReported: perYear.filter((p) => p.freeCashFlow !== null).length,
  };

  const checks = [
    check('capexModest', 'Capex below 50% of net income', summary.capexToNetIncomeAvg,
      summary.capexToNetIncomeAvg <= t.capexToNetIncomeMax, `≤ ${t.capexToNetIncomeMax}`),
    check('capexExcellent', 'Capex below 25% of net income', summary.capexToNetIncomeAvg,
      summary.capexToNetIncomeAvg <= t.capexToNetIncomeExcellent, `≤ ${t.capexToNetIncomeExcellent}`),
    check('sharesNotDiluted', 'Share count did not increase', summary.shareCountChange,
      summary.shareCountChange <= 0, '≤ 0'),
  ];

  return { perYear, summary, checks };
}
