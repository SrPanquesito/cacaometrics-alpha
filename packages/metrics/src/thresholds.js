/**
 * Rule-of-thumb thresholds from "Warren Buffett and the Interpretation of
 * Financial Statements" (Mary Buffett & David Clark). Kept in one place so they
 * are easy to explain, tune, and cite in the report.
 */
export const THRESHOLDS = {
  // Income statement — durable competitive advantage
  grossMarginDurable: 0.40, // ≥ 40% consistently suggests a moat
  grossMarginWeak: 0.20, // < 20% suggests a fiercely competitive industry
  sgaToGrossProfitExcellent: 0.30, // < 30% is "fantastic"
  sgaToGrossProfitMax: 0.80, // > 80% is a warning sign
  rndToGrossProfitMax: 0.30, // heavy R&D dependence weakens a moat
  depreciationToGrossProfitMax: 0.10, // durable companies tend to stay below ~10%
  interestToOperatingIncomeMax: 0.15, // durable companies tend to stay below ~15%
  netMarginDurable: 0.20, // > 20% consistently is a strong sign
  netMarginWeak: 0.10, // < 10% suggests a competitive business

  // Earnings consistency
  minPositiveYearsShare: 1.0, // net income positive every year
  maxEpsDeclines: 1, // at most one down year in EPS over the period

  // Returns
  roeDurable: 0.15, // average ROE ≥ 15%

  // Balance sheet
  maxYearsToRepayLtDebt: 4, // long-term debt payable with ≤ 4 years of net income
  maxLiabilitiesToEquity: 0.80, // adjusted debt-to-equity below ~0.8

  // Capital allocation
  capexToNetIncomeExcellent: 0.25,
  capexToNetIncomeMax: 0.50,

  // Valuation
  discountRate: 0.10, // required annual return used to discount future value
  projectionYears: 10,
  maxGrowthAssumed: 0.15, // never project EPS growth faster than this
  maxPeAssumed: 25, // never assume an exit P/E above this
  marginOfSafety: 0.30, // want price ≥ 30% below intrinsic value
};
