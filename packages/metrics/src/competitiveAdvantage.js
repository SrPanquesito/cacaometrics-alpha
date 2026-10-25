import { ratio, mean, min, stdev, round, check } from './util.js';
import { THRESHOLDS as T } from './thresholds.js';

/**
 * Income-statement signals of a durable competitive advantage.
 * @param {Array<Object>} rows  output of yearRows()
 */
export function competitiveAdvantage(rows, t = T) {
  const perYear = rows.map((r) => ({
    year: r.year,
    grossMargin: round(ratio(r.grossProfit, r.revenue)),
    sgaToGrossProfit: round(ratio(r.sga, r.grossProfit)),
    rndToGrossProfit: r.rnd === undefined ? null : round(ratio(r.rnd, r.grossProfit)),
    depreciationToGrossProfit: r.depreciation === undefined ? null : round(ratio(r.depreciation, r.grossProfit)),
    interestToOperatingIncome: round(ratio(r.interestExpense, r.operatingIncome)),
    netMargin: round(ratio(r.netIncome, r.revenue)),
  }));

  const col = (k) => perYear.map((p) => p[k]);

  const summary = {
    grossMarginAvg: round(mean(col('grossMargin'))),
    grossMarginMin: round(min(col('grossMargin'))),
    grossMarginStdev: round(stdev(col('grossMargin'))),
    sgaToGrossProfitAvg: round(mean(col('sgaToGrossProfit'))),
    rndToGrossProfitAvg: round(mean(col('rndToGrossProfit'))),
    depreciationToGrossProfitAvg: round(mean(col('depreciationToGrossProfit'))),
    interestToOperatingIncomeAvg: round(mean(col('interestToOperatingIncome'))),
    netMarginAvg: round(mean(col('netMargin'))),
    netMarginMin: round(min(col('netMargin'))),
  };

  const checks = [
    check('grossMarginDurable', 'Average gross margin ≥ 40%', summary.grossMarginAvg,
      summary.grossMarginAvg >= t.grossMarginDurable, `≥ ${t.grossMarginDurable}`),
    check('grossMarginNeverWeak', 'Gross margin never below 20%', summary.grossMarginMin,
      summary.grossMarginMin >= t.grossMarginWeak, `≥ ${t.grossMarginWeak}`),
    check('sgaReasonable', 'SG&A below 80% of gross profit', summary.sgaToGrossProfitAvg,
      summary.sgaToGrossProfitAvg <= t.sgaToGrossProfitMax, `≤ ${t.sgaToGrossProfitMax}`),
    check('sgaExcellent', 'SG&A below 30% of gross profit', summary.sgaToGrossProfitAvg,
      summary.sgaToGrossProfitAvg <= t.sgaToGrossProfitExcellent, `≤ ${t.sgaToGrossProfitExcellent}`),
    check('rndLight', 'R&D below 30% of gross profit', summary.rndToGrossProfitAvg,
      summary.rndToGrossProfitAvg <= t.rndToGrossProfitMax, `≤ ${t.rndToGrossProfitMax}`),
    check('depreciationLight', 'Depreciation below 10% of gross profit', summary.depreciationToGrossProfitAvg,
      summary.depreciationToGrossProfitAvg <= t.depreciationToGrossProfitMax, `≤ ${t.depreciationToGrossProfitMax}`),
    check('interestLight', 'Interest below 15% of operating income', summary.interestToOperatingIncomeAvg,
      summary.interestToOperatingIncomeAvg <= t.interestToOperatingIncomeMax, `≤ ${t.interestToOperatingIncomeMax}`),
    check('netMarginDurable', 'Average net margin ≥ 20%', summary.netMarginAvg,
      summary.netMarginAvg >= t.netMarginDurable, `≥ ${t.netMarginDurable}`),
  ];

  return { perYear, summary, checks };
}
