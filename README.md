# CacaoMetrics

Multi-agent, Buffett-style evaluator for long-term investments. Every number is
computed deterministically in code; the LLM agents only interpret those numbers.

> CacaoMetrics es una herramienta de análisis y educación financiera. No constituye asesoría ni recomendación de inversión.

## Structure

```
packages/
  data/       FinancialsSource interface + JsonFileFinancialsSource (DEMO-SHORTCUT)
  metrics/    Buffett/Clark metrics as pure functions, with hand-checked tests
  agents/     4 specialist agents + orchestrator, JSON schemas, Claude + mock LLM clients
apps/
  cli/        list / metrics / analyze commands; saves runs to runs/
  demo/       mobile-first replay UI for saved runs (+ static build for hosting)
data/financials/   one <TICKER>.json per company (_TEMPLATE.json to copy)
runs/              saved analyses the demo replays
```

No runtime dependencies: Node ≥ 20 only (the Claude API is called with `fetch`).

## Quick start

```bash
npm install                 # links the workspaces
npm test                    # data, metrics and agent tests
npm run metrics -- DEMO     # print the deterministic checks for the fictional demo company
npm run analyze:mock -- DEMO   # full pipeline offline, no API key
npm run demo                # http://localhost:4321
```

Real analysis with Claude:

```bash
cp .env.example .env        # add ANTHROPIC_API_KEY
npm run analyze -- DEMO     # writes runs/DEMO.json
```

## Adding a real company

1. Copy `data/financials/_TEMPLATE.json` to `data/financials/<TICKER>.json`.
2. Fill ~10 years from the annual reports (reporte anual / informe anual). Keep units consistent
   (e.g. MXN millions; `eps` and `price` per share; `capex` as a positive number).
3. Write the exact source (document, pages, link) in `source`.
4. `npm run metrics -- <TICKER>` and sanity-check a few ratios by hand.
5. `npm run analyze -- <TICKER>` (optionally `--price 52.30` for today's price).
6. `npm run analyze:mock -- DEMO` is safe to rerun; real runs cost API calls, so save the good ones.

## The demo

- `npm run demo` serves `apps/demo/public` and replays `runs/*.json` with the agent animation.
- Open `/#TICKER` to jump straight to one company (good for a QR code).
- `npm run build -w @cacaometrics/demo` → `apps/demo/dist/`, a static folder you can upload to
  S3 + CloudFront (or Amplify). It works offline once loaded.
- Before the event: load the page on your phone over mobile data, then airplane mode, and check it still works.

## Demo shortcuts

Search `DEMO-SHORTCUT` to find every temporary piece:

| Now | Later (per the TDD) |
| --- | --- |
| `JsonFileFinancialsSource` reads hand-entered JSON | `BmvFinancialsSource` / Sequelize-backed source, same interface |
| Analyses saved as JSON in `runs/` | SQL tables via Sequelize |
| `apps/demo/server.js` static replay server | API service on AWS; keep replay mode for demos |
| No auth, payments or search | B2C subscriptions (MXN 149/mo), B2B accounts |

## How a run works

1. `computeAllMetrics(company)` → 5 metric groups, 21 checks, intrinsic-value range.
2. Four agents run in parallel, each seeing only its own groups:
   competitive advantage · earnings quality · balance sheet & debt · valuation & margin of safety.
3. Each agent must answer through a forced tool call matching `AGENT_OUTPUT_SCHEMA`;
   invalid output is retried once with the validation errors, then rejected.
4. The orchestrator combines the reports into a verdict:
   `durable_and_undervalued` · `durable_wait_for_price` · `not_durable` · `insufficient_data`.
5. The whole run (metrics, reports, verdict, timeline) is saved for replay.

Thresholds live in `packages/metrics/src/thresholds.js`, based on
*Warren Buffett and the Interpretation of Financial Statements* (Mary Buffett & David Clark).
