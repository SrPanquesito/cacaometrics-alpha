/**
 * Output contracts for the specialist agents and the orchestrator.
 * These JSON Schemas are sent to the model as the forced tool's input_schema,
 * and every response is re-validated with validate() before it is used.
 */

const bilingual = {
  type: 'object',
  properties: { es: { type: 'string' }, en: { type: 'string' } },
  required: ['es', 'en'],
};

const bilingualList = (maxItems) => ({ type: 'array', items: bilingual, maxItems, description: `At most ${maxItems} items.` });

export const AGENT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 10, description: '0 = fails every criterion, 10 = exemplary' },
    verdict: { type: 'string', enum: ['strong', 'acceptable', 'weak', 'insufficient_data'] },
    summary: { ...bilingual, description: 'Two sentences at most.' },
    keyFindings: { ...bilingualList(4), description: 'At most 4 items. Each finding must cite a number from the metrics.' },
    redFlags: { ...bilingualList(3), description: 'At most 3 items. Empty array if there are none.' },
  },
  required: ['score', 'verdict', 'summary', 'keyFindings', 'redFlags'],
};

export const ORCHESTRATOR_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer', minimum: 0, maximum: 100 },
    verdict: {
      type: 'string',
      // Educational framing on purpose: CacaoMetrics describes the business and
      // the price; it does not tell anyone to buy or sell.
      enum: ['durable_and_undervalued', 'durable_wait_for_price', 'not_durable', 'insufficient_data'],
    },
    headline: { ...bilingual, description: 'One sentence a non-expert understands.' },
    summary: { ...bilingual, description: 'Three to four sentences.' },
    strengths: bilingualList(4),
    risks: bilingualList(4),
    questionsToInvestigate: { ...bilingualList(3), description: 'At most 3 items. What a careful investor should check next.' },
  },
  required: ['overallScore', 'verdict', 'headline', 'summary', 'strengths', 'risks', 'questionsToInvestigate'],
};

/**
 * Minimal JSON Schema validator covering exactly the keywords used above.
 * Returns a list of problems (empty = valid).
 */
export function validate(value, schema, at = '$') {
  const problems = [];
  const t = schema.type;

  if (t === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${at} must be an object`];
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) problems.push(`${at}.${key} is required`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) problems.push(...validate(value[key], sub, `${at}.${key}`));
    }
  } else if (t === 'array') {
    if (!Array.isArray(value)) return [`${at} must be an array`];
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${at} has more than ${schema.maxItems} items`);
    value.forEach((v, i) => problems.push(...validate(v, schema.items, `${at}[${i}]`)));
  } else if (t === 'string') {
    if (typeof value !== 'string') return [`${at} must be a string`];
    if (schema.enum && !schema.enum.includes(value)) problems.push(`${at} must be one of ${schema.enum.join(', ')}`);
  } else if (t === 'integer') {
    if (!Number.isInteger(value)) return [`${at} must be an integer`];
    if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${at} must be ≥ ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) problems.push(`${at} must be ≤ ${schema.maximum}`);
  }
  return problems;
}
