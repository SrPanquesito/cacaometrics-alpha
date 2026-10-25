import { ratio, mean, round, cagr, check } from './util.js';
import { THRESHOLDS as T } from './thresholds.js';

/**
 * Intrinsic value of one share using the earnings-projection method:
 *   1. grow today's EPS for N years at the historical EPS growth rate (capped),
 *   2. multiply by an exit P/E (historical average, capped),
 *   3. discount that future price back to today at the required return.
 */
export function intrinsicValue({ eps, growth, pe, years, discountRate }) {
  if (!(eps > 0) || growth === null || !(pe > 0)) return null;
  const futureEps = eps * (1 + growth) ** years;
  const futurePrice = futureEps * pe;
  return futurePrice / (1 + discountRate) ** years;
}

/**
 * Valuation range and margin of safety. Needs year-end `price` for P/E history;
 * without prices it still projects EPS but cannot judge the current price.
 * @param {Array<Object>} rows  output of yearRows()
 * @param {{ currentPrice?: number }} [options]
 */
export function valuation(rows, { currentPrice } = {}, t = T) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const periods = last.year - first.year;

  const peHistory = rows
    .filter((r) => typeof r.price === 'number' && r.eps > 0)
    .map((r) => ({ year: r.year, pe: round(r.price / r.eps, 2) }));

  const historicalPeAvg = mean(peHistory.map((p) => p.pe));
  const historicalEpsCagr = cagr(first.eps, last.eps, periods);
  const price = currentPrice ?? last.price ?? null;

  const growthBase = historicalEpsCagr === null ? null : Math.min(Math.max(historicalEpsCagr, 0), t.maxGrowthAssumed);
  const peBase = historicalPeAvg === null ? null : Math.min(historicalPeAvg, t.maxPeAssumed);

  const scenario = (growthFactor, peFactor) =>
    round(
      intrinsicValue({
        eps: last.eps,
        growth: growthBase === null ? null : growthBase * growthFactor,
        pe: peBase === null ? null : peBase * peFactor,
        years: t.projectionYears,
        discountRate: t.discountRate,
      }),
      2,
    );

  const range = {
    conservative: scenario(0.5, 0.8),
    base: scenario(1, 1),
    optimistic: scenario(1.2, 1.1),
  };

  const marginOfSafety = price && range.base ? round(1 - price / range.base) : null;
  const earningsYield = price ? round(ratio(last.eps, price)) : null;

  const summary = {
    latestEps: last.eps,
    price,
    currentPe: price ? round(price / last.eps, 2) : null,
    earningsYield,
    historicalPeAvg: round(historicalPeAvg, 2),
    historicalEpsCagr: round(historicalEpsCagr),
    assumptions: {
      growth: round(growthBase),
      exitPe: round(peBase, 2),
      years: t.projectionYears,
      discountRate: t.discountRate,
    },
    intrinsicValuePerShare: range,
    marginOfSafety,
  };

  const checks = [
    check('marginOfSafety', 'Price at least 30% below base intrinsic value', marginOfSafety,
      marginOfSafety >= t.marginOfSafety, `≥ ${t.marginOfSafety}`),
    check('belowConservative', 'Price below the conservative valuation', price && range.conservative ? price : null,
      price <= range.conservative, `≤ ${range.conservative}`),
  ];

  return { perYear: peHistory, summary, checks };
}
