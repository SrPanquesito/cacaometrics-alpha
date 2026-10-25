/**
 * Shape of the financial data every FinancialsSource must return.
 *
 * Amounts are in the company's reporting currency, in the unit given by
 * `company.units` (normally "millions"). `eps` and `price` are per share.
 *
 * @typedef {Object} YearFinancials
 * @property {number} revenue
 * @property {number} grossProfit
 * @property {number} sga                 Selling, general & administrative expense
 * @property {number} [rnd]               Research & development expense
 * @property {number} [depreciation]
 * @property {number} interestExpense
 * @property {number} operatingIncome
 * @property {number} netIncome
 * @property {number} eps
 * @property {number} sharesOutstanding   Diluted, in the same unit as `units` (e.g. millions of shares)
 * @property {number} cash
 * @property {number} longTermDebt
 * @property {number} totalLiabilities
 * @property {number} shareholdersEquity
 * @property {number} [retainedEarnings]
 * @property {number} capex               Positive number (cash spent)
 * @property {number} [operatingCashFlow]
 * @property {number} [price]             Year-end share price
 *
 * @typedef {Object} CompanyFinancials
 * @property {string} ticker
 * @property {string} name
 * @property {string} exchange            e.g. "BMV", "BIVA", "NYSE"
 * @property {string} currency            e.g. "MXN", "USD"
 * @property {string} units               e.g. "millions"
 * @property {string} source              Where the numbers came from
 * @property {boolean} [fictional]        True for demo/test fixtures
 * @property {Object<string, YearFinancials>} years   Keyed by fiscal year, e.g. "2024"
 */

export const REQUIRED_YEAR_FIELDS = [
  'revenue',
  'grossProfit',
  'sga',
  'interestExpense',
  'operatingIncome',
  'netIncome',
  'eps',
  'sharesOutstanding',
  'cash',
  'longTermDebt',
  'totalLiabilities',
  'shareholdersEquity',
  'capex',
];

export const OPTIONAL_YEAR_FIELDS = [
  'rnd',
  'depreciation',
  'retainedEarnings',
  'operatingCashFlow',
  'price',
];

const REQUIRED_COMPANY_FIELDS = ['ticker', 'name', 'exchange', 'currency', 'units', 'source', 'years'];

/**
 * Validate a CompanyFinancials object. Returns a list of problems (empty = valid).
 * @param {CompanyFinancials} company
 * @returns {string[]}
 */
export function validateCompanyFinancials(company) {
  const problems = [];
  if (!company || typeof company !== 'object') return ['company must be an object'];

  for (const field of REQUIRED_COMPANY_FIELDS) {
    if (company[field] === undefined || company[field] === null || company[field] === '') {
      problems.push(`missing company field "${field}"`);
    }
  }
  if (!company.years || typeof company.years !== 'object') return problems;

  const years = Object.keys(company.years);
  if (years.length < 3) problems.push('need at least 3 fiscal years of data');

  for (const year of years) {
    if (!/^\d{4}$/.test(year)) problems.push(`year key "${year}" must be a 4-digit year`);
    const y = company.years[year];
    for (const field of REQUIRED_YEAR_FIELDS) {
      if (typeof y[field] !== 'number' || Number.isNaN(y[field])) {
        problems.push(`${year}: "${field}" must be a number`);
      }
    }
    for (const field of OPTIONAL_YEAR_FIELDS) {
      if (y[field] !== undefined && (typeof y[field] !== 'number' || Number.isNaN(y[field]))) {
        problems.push(`${year}: "${field}" must be a number when present`);
      }
    }
  }
  return problems;
}
