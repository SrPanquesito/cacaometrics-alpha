import { ratio, mean, min, round, cagr, check } from './util.js';
import { THRESHOLDS as T } from './thresholds.js';

/**
 * Earnings consistency and return on equity.
 * @param {Array<Object>} rows  output of yearRows()
 */
export function earningsQuality(rows, t = T) {
  const perYear = rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      year: r.year,
      netIncome: r.netIncome,
      eps: r.eps,
      epsGrowth: prev ? round(ratio(r.eps - prev.eps, Math.abs(prev.eps))) : null,
      roe: round(ratio(r.netIncome, r.shareholdersEquity)),
    };
  });

  const first = rows[0];
  const last = rows[rows.length - 1];
  const periods = last.year - first.year;

  const positiveYears = rows.filter((r) => r.netIncome > 0).length;
  const epsDeclines = perYear.filter((p) => p.epsGrowth !== null && p.epsGrowth < 0).length;
  const negativeEquityYears = rows.filter((r) => r.shareholdersEquity <= 0).length;

  const summary = {
    years: rows.length,
    positiveYears,
    positiveYearsShare: round(positiveYears / rows.length),
    epsDeclines,
    epsCagr: round(cagr(first.eps, last.eps, periods)),
    netIncomeCagr: round(cagr(first.netIncome, last.netIncome, periods)),
    retainedEarningsCagr:
      first.retainedEarnings !== undefined && last.retainedEarnings !== undefined
        ? round(cagr(first.retainedEarnings, last.retainedEarnings, periods))
        : null,
    roeAvg: round(mean(perYear.map((p) => p.roe))),
    roeMin: round(min(perYear.map((p) => p.roe))),
    // ROE is meaningless (and flatters the company) when equity is negative,
    // which happens after heavy buybacks — the agent must be told explicitly.
    negativeEquityYears,
  };

  const checks = [
    check('alwaysProfitable', 'Net income positive every year', summary.positiveYearsShare,
      summary.positiveYearsShare >= t.minPositiveYearsShare, `= ${t.minPositiveYearsShare}`),
    check('epsConsistent', `EPS fell in at most ${t.maxEpsDeclines} year(s)`, summary.epsDeclines,
      summary.epsDeclines <= t.maxEpsDeclines, `≤ ${t.maxEpsDeclines}`),
    check('epsGrowing', 'EPS grew over the period', summary.epsCagr, summary.epsCagr > 0, '> 0'),
    check('roeDurable', 'Average ROE ≥ 15%', negativeEquityYears ? null : summary.roeAvg,
      summary.roeAvg >= t.roeDurable, `≥ ${t.roeDurable}`),
  ];

  return { perYear, summary, checks };
}
