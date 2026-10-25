import { AGENTS, ORCHESTRATOR_SYSTEM } from './definitions.js';
import { AGENT_OUTPUT_SCHEMA, ORCHESTRATOR_OUTPUT_SCHEMA, validate } from './schemas.js';

export const DISCLAIMER = {
  es: 'CacaoMetrics es una herramienta de análisis y educación financiera. No constituye asesoría ni recomendación de inversión.',
  en: 'CacaoMetrics is a financial analysis and education tool. It is not investment advice or a recommendation.',
};

/** Call the model, validate against the schema, and retry once with the errors if invalid. */
async function callValidated(llm, { system, input, schema, toolName }) {
  let out = await llm.structured({ system, input, schema, toolName });
  let problems = validate(out, schema);
  if (problems.length) {
    out = await llm.structured({
      system: `${system}\n\nYour previous answer was invalid: ${problems.join('; ')}. Fix these problems.`,
      input,
      schema,
      toolName,
    });
    problems = validate(out, schema);
    if (problems.length) throw new Error(`${toolName} returned invalid output: ${problems.join('; ')}`);
  }
  return out;
}

/** Run one specialist agent on its slice of the metrics. */
export async function runAgent(agent, metrics, llm) {
  const input = {
    company: metrics.company,
    metrics: Object.fromEntries(agent.groups.map((g) => [g, metrics.groups[g]])),
  };
  const report = await callValidated(llm, {
    system: agent.system,
    input,
    schema: AGENT_OUTPUT_SCHEMA,
    toolName: 'submit_agent_report',
  });
  return { agentId: agent.id, name: agent.name, groups: agent.groups, report };
}

/**
 * Full analysis: specialists in parallel, then the orchestrator.
 * `onEvent` receives progress events — the same events the demo replays.
 *
 * @param {object} metrics  output of computeAllMetrics()
 * @param {{ llm: { structured: Function }, onEvent?: (e: object) => void, agents?: typeof AGENTS }} options
 */
export async function analyze(metrics, { llm, onEvent = () => {}, agents = AGENTS }) {
  const startedAt = Date.now();
  const timeline = [];
  const emit = (type, data = {}) => {
    const event = { type, t: Date.now() - startedAt, ...data };
    timeline.push(event);
    onEvent(event);
  };

  emit('metrics_ready', { checksPassed: metrics.checksPassed, checksScored: metrics.checksScored });

  const agentReports = await Promise.all(
    agents.map(async (agent) => {
      emit('agent_started', { agentId: agent.id, name: agent.name });
      const result = await runAgent(agent, metrics, llm);
      emit('agent_finished', { agentId: agent.id, name: agent.name, score: result.report.score, verdict: result.report.verdict });
      return result;
    }),
  );

  emit('orchestrator_started');
  const final = await callValidated(llm, {
    system: ORCHESTRATOR_SYSTEM,
    input: {
      company: metrics.company,
      checksPassed: metrics.checksPassed,
      checksScored: metrics.checksScored,
      agentReports: agentReports.map(({ agentId, name, report }) => ({ agentId, name, report })),
    },
    schema: ORCHESTRATOR_OUTPUT_SCHEMA,
    toolName: 'submit_final_assessment',
  });
  emit('orchestrator_finished', { verdict: final.verdict, overallScore: final.overallScore });

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    model: llm.model ?? 'mock',
    company: metrics.company,
    metrics,
    agentReports,
    final,
    disclaimer: DISCLAIMER,
    timeline,
  };
}
