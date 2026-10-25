/**
 * LLM clients. Both implement the same method:
 *   structured({ system, input, schema, toolName }) → Promise<object>
 * `input` is a plain object; the client decides how to present it to the model.
 */

/** Calls the Claude Messages API directly with fetch (no SDK dependency). */
export class AnthropicLlm {
  constructor({ apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.CACAO_MODEL || 'claude-sonnet-5-5', maxTokens = 2000 } = {}) {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Use --mock to run without an API key.');
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async structured({ system, input, schema, toolName }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system,
        // Forcing a single tool call is how we get guaranteed-structured JSON back.
        tools: [{ name: toolName, description: 'Submit your structured report.', input_schema: schema }],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: `Metrics (JSON):\n${JSON.stringify(input, null, 2)}` }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude API error ${res.status}: ${body.slice(0, 500)}`);
    }
    const data = await res.json();
    const block = data.content?.find((b) => b.type === 'tool_use' && b.name === toolName);
    if (!block) throw new Error(`Model did not call tool "${toolName}" (stop_reason: ${data.stop_reason})`);
    return block.input;
  }
}

/**
 * Deterministic stand-in for the LLM, built only from the checks.
 * Used by --mock, by tests, and to rehearse the demo without an API key.
 * Its text is intentionally plain: real runs come from AnthropicLlm.
 */
export class MockLlm {
  async structured({ input, toolName }) {
    if (toolName === 'submit_final_assessment') return mockFinal(input);
    return mockAgent(input);
  }
}

const pct = (x) => (x === null || x === undefined ? 'n/d' : `${(x * 100).toFixed(1)}%`);

function mockAgent(input) {
  // The valuation agent also sees earnings data for context, but its score is about price only.
  const groups = input.metrics.valuation ? [input.metrics.valuation] : Object.values(input.metrics);
  const checks = groups.flatMap((g) => g.checks);
  const scored = checks.filter((c) => c.pass !== null);
  if (!scored.length) {
    return {
      score: 0,
      verdict: 'insufficient_data',
      summary: { es: 'No hay datos suficientes para evaluar esta área.', en: 'There is not enough data to assess this area.' },
      keyFindings: [],
      redFlags: [],
    };
  }
  const passed = scored.filter((c) => c.pass);
  const score = Math.round((passed.length / scored.length) * 10);
  const fmt = (c) => (Math.abs(c.value) <= 5 ? pct(c.value) : String(c.value));
  return {
    score,
    verdict: score >= 7 ? 'strong' : score >= 4 ? 'acceptable' : 'weak',
    summary: {
      es: `Cumple ${passed.length} de ${scored.length} criterios de esta área.`,
      en: `Meets ${passed.length} of ${scored.length} criteria in this area.`,
    },
    keyFindings: passed.slice(0, 4).map((c) => ({ es: `${c.label}: ${fmt(c)}`, en: `${c.label}: ${fmt(c)}` })),
    redFlags: scored.filter((c) => !c.pass).slice(0, 3).map((c) => ({ es: `${c.label}: ${fmt(c)}`, en: `${c.label}: ${fmt(c)}` })),
  };
}

function mockFinal(input) {
  const by = Object.fromEntries(input.agentReports.map((r) => [r.agentId, r.report]));
  const quality = ['competitiveAdvantage', 'earningsQuality', 'balanceSheet'].map((id) => by[id]?.score ?? 0);
  const durable = quality.reduce((a, b) => a + b, 0) / quality.length >= 6;
  const cheap = (by.valuation?.score ?? 0) >= 6;
  const verdict = !durable ? 'not_durable' : cheap ? 'durable_and_undervalued' : 'durable_wait_for_price';
  const headlines = {
    not_durable: { es: 'No muestra una ventaja competitiva duradera.', en: 'Does not show a durable competitive advantage.' },
    durable_wait_for_price: { es: 'Buen negocio, pero el precio actual no deja margen de seguridad.', en: 'A good business, but today’s price leaves no margin of safety.' },
    durable_and_undervalued: { es: 'Negocio duradero a un precio con margen de seguridad.', en: 'A durable business at a price with a margin of safety.' },
  };
  const all = input.agentReports.map((r) => r.report);
  return {
    overallScore: Math.round((input.checksPassed / input.checksScored) * 100),
    verdict,
    headline: headlines[verdict],
    summary: {
      es: `Cumple ${input.checksPassed} de ${input.checksScored} criterios en total. (Resumen de prueba generado sin LLM.)`,
      en: `Meets ${input.checksPassed} of ${input.checksScored} criteria overall. (Test summary generated without an LLM.)`,
    },
    strengths: all.flatMap((r) => r.keyFindings).slice(0, 4),
    risks: all.flatMap((r) => r.redFlags).slice(0, 4),
    questionsToInvestigate: [
      { es: '¿Qué protege los márgenes de la competencia?', en: 'What protects the margins from competitors?' },
      { es: '¿Qué tan realistas son los supuestos de crecimiento?', en: 'How realistic are the growth assumptions?' },
    ],
  };
}
