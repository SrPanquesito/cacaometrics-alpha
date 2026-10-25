/**
 * Contract for anything that supplies company financials.
 *
 * The metrics, agents and orchestrator only ever talk to this interface, so the
 * demo's JSON files can later be swapped for BMV/BIVA data or a Sequelize-backed
 * store without touching the analysis code.
 */
export class FinancialsSource {
  /**
   * @param {string} ticker
   * @returns {Promise<import('./schema.js').CompanyFinancials>}
   */
  // eslint-disable-next-line no-unused-vars
  async getFinancials(ticker) {
    throw new Error(`${this.constructor.name}.getFinancials() is not implemented`);
  }

  /**
   * @returns {Promise<Array<{ticker: string, name: string, exchange: string}>>}
   */
  async listCompanies() {
    throw new Error(`${this.constructor.name}.listCompanies() is not implemented`);
  }
}

export class CompanyNotFoundError extends Error {
  constructor(ticker) {
    super(`No financials found for ticker "${ticker}"`);
    this.name = 'CompanyNotFoundError';
    this.ticker = ticker;
  }
}

export class InvalidFinancialsError extends Error {
  constructor(ticker, problems) {
    super(`Financials for "${ticker}" are invalid:\n  - ${problems.join('\n  - ')}`);
    this.name = 'InvalidFinancialsError';
    this.ticker = ticker;
    this.problems = problems;
  }
}
