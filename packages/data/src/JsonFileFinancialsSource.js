// DEMO-SHORTCUT: financials come from hand-entered JSON files instead of the
// database / BMV feed. Replace with a BmvFinancialsSource or SequelizeFinancialsSource
// that implements the same FinancialsSource interface.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { FinancialsSource, CompanyNotFoundError, InvalidFinancialsError } from './FinancialsSource.js';
import { validateCompanyFinancials } from './schema.js';

export class JsonFileFinancialsSource extends FinancialsSource {
  /** @param {{ dir: string }} options  Folder holding one <TICKER>.json per company */
  constructor({ dir }) {
    super();
    if (!dir) throw new Error('JsonFileFinancialsSource needs a "dir" option');
    this.dir = path.resolve(dir);
  }

  fileFor(ticker) {
    const safe = String(ticker).toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    return path.join(this.dir, `${safe}.json`);
  }

  async getFinancials(ticker) {
    let raw;
    try {
      raw = await readFile(this.fileFor(ticker), 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') throw new CompanyNotFoundError(ticker);
      throw err;
    }
    const company = JSON.parse(raw);
    const problems = validateCompanyFinancials(company);
    if (problems.length) throw new InvalidFinancialsError(ticker, problems);
    return company;
  }

  async listCompanies() {
    const files = (await readdir(this.dir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
    const companies = [];
    for (const file of files) {
      const company = JSON.parse(await readFile(path.join(this.dir, file), 'utf8'));
      companies.push({ ticker: company.ticker, name: company.name, exchange: company.exchange });
    }
    return companies.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }
}
