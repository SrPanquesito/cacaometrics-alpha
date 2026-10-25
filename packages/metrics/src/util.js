/** Small numeric helpers. Every function returns null instead of NaN/Infinity. */

export const round = (x, digits = 4) =>
  x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** digits) / 10 ** digits;

export const ratio = (num, den) => {
  if (typeof num !== 'number' || typeof den !== 'number' || den === 0) return null;
  const r = num / den;
  return Number.isFinite(r) ? r : null;
};

const clean = (xs) => xs.filter((x) => typeof x === 'number' && Number.isFinite(x));

export const mean = (xs) => {
  const v = clean(xs);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export const min = (xs) => {
  const v = clean(xs);
  return v.length ? Math.min(...v) : null;
};

export const max = (xs) => {
  const v = clean(xs);
  return v.length ? Math.max(...v) : null;
};

/** Population standard deviation. */
export const stdev = (xs) => {
  const v = clean(xs);
  if (v.length < 2) return null;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
};

/** Compound annual growth rate between two positive values over `periods` years. */
export const cagr = (start, end, periods) => {
  if (!(start > 0) || !(end > 0) || !(periods > 0)) return null;
  return (end / start) ** (1 / periods) - 1;
};

/**
 * Turn `company.years` into an array sorted oldest → newest: [{ year: 2015, ...fields }].
 * @param {import('@cacaometrics/data/src/schema.js').CompanyFinancials} company
 */
export const yearRows = (company) =>
  Object.keys(company.years)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => ({ year, ...company.years[String(year)] }));

/** Build a check result. `pass` is true / false / null (not enough data). */
export const check = (id, label, value, pass, threshold) => ({
  id,
  label,
  value: typeof value === 'number' ? round(value) : value,
  pass: value === null || value === undefined ? null : Boolean(pass),
  threshold,
});
