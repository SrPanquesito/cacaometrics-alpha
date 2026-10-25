import { ratio, mean, max, round, check } from './util.js';
import { THRESHOLDS as T } from './thresholds.js';

/**
 * Balance-sheet strength: debt, leverage and cash.
 * @param {Array<Object>} rows  output of yearRows()
 */
export function balanceSheet(rows, t = T) {
  const perYear = rows.map((r) => ({
    year: r.year,
    cash: r.cash,
    longTermDebt: r.longTermDebt,
    // Years of current net income needed to pay off long-term debt.
    yearsToRepayLtDebt: r.netIncome > 0 ? round(ratio(r.longTermDebt, r.netIncome)) : null,
    liabilitiesToEquity: r.shareholdersEquity > 0 ? round(ratio(r.totalLiabilities, r.shareholdersEquity)) : null,
    netCash: round(r.cash - r.longTermDebt, 2),
  }));

  const last = perYear[perYear.length - 1];
  const first = perYear[0];

  const summary = {
    latestYearsToRepayLtDebt: last.yearsToRepayLtDebt,
    worstYearsToRepayLtDebt: round(max(perYear.map((p) => p.yearsToRepayLtDebt))),
    latestLiabilitiesToEquity: last.liabilitiesToEquity,
    liabilitiesToEquityAvg: round(mean(perYear.map((p) => p.liabilitiesToEquity))),
    latestNetCash: last.netCash,
    longTermDebtChange: round(ratio(last.longTermDebt - first.longTermDebt, first.longTermDebt)),
    cashChange: round(ratio(last.cash - first.cash, first.cash)),
  };

  const checks = [
    check('debtRepayable', 'Long-term debt payable with ≤ 4 years of net income', summary.latestYearsToRepayLtDebt,
      summary.latestYearsToRepayLtDebt <= t.maxYearsToRepayLtDebt, `≤ ${t.maxYearsToRepayLtDebt}`),
    check('leverageModest', 'Total liabilities / equity below 0.8', summary.latestLiabilitiesToEquity,
      summary.latestLiabilitiesToEquity <= t.maxLiabilitiesToEquity, `≤ ${t.maxLiabilitiesToEquity}`),
    check('debtNotGrowing', 'Long-term debt has not grown over the period', summary.longTermDebtChange,
      summary.longTermDebtChange <= 0, '≤ 0'),
    check('cashGrowing', 'Cash grew over the period', summary.cashChange, summary.cashChange > 0, '> 0'),
  ];

  return { perYear, summary, checks };
}
