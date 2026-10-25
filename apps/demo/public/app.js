// CacaoMetrics demo: replays saved analyses (runs/*.json) with the multi-agent
// progress animation, then renders the report. No network calls besides the
// two JSON files, so it works on bad conference wifi once the page is loaded.

const app = document.getElementById('app');
let lang = 'es';
try { lang = localStorage.getItem('cacao-lang') || 'es'; } catch {}

const T = {
  es: {
    pickTitle: 'Analiza una empresa como lo haría Buffett',
    pickLede: 'Cuatro agentes especializados revisan diez años de estados financieros y llegan a una conclusión, en minutos en lugar de días.',
    analyze: 'Analizar',
    fictional: 'Ficticia',
    analyzing: 'Analizando',
    stepMetrics: (n) => `Calculando ${n} criterios financieros`,
    stepFinal: 'Evaluación final',
    skip: 'Saltar animación',
    score: 'Puntaje',
    agentsTitle: 'Lo que encontró cada agente',
    chartsTitle: 'Diez años en tres gráficas',
    grossMargin: 'Margen bruto',
    roe: 'Rendimiento sobre capital (ROE)',
    debtVsIncome: 'Deuda a largo plazo vs. utilidad neta',
    debt: 'Deuda LP', income: 'Utilidad neta', target: 'Referencia Buffett',
    valuationTitle: 'Precio vs. valor intrínseco',
    price: 'Precio actual', conservative: 'Conservador', base: 'Base', optimistic: 'Optimista',
    assumptions: (a) => `Supuestos: crecimiento de UPA ${pctTxt(a.growth)} anual, P/U de salida ${a.exitPe}, ${a.years} años, descuento ${pctTxt(a.discountRate)}.`,
    mos: (m) => (m >= 0 ? `Margen de seguridad: ${pctTxt(m)}` : `Sin margen de seguridad: el precio está ${pctTxt(-m)} arriba del valor base`),
    strengths: 'Fortalezas', risks: 'Riesgos', questions: 'Qué investigar después',
    allChecks: (p, n) => `Ver los ${n} criterios (${p} cumplidos)`,
    source: 'Fuente de datos',
    fictionalNote: 'Empresa ficticia usada para la demostración. No son datos reales.',
    again: 'Ver de nuevo', other: 'Otra empresa',
    redFlags: 'Alertas', findings: 'Hallazgos',
    verdicts: {
      durable_and_undervalued: 'Duradera y con margen de seguridad',
      durable_wait_for_price: 'Buen negocio, precio exigente',
      not_durable: 'Sin ventaja duradera',
      insufficient_data: 'Datos insuficientes',
    },
    noRuns: 'Aún no hay análisis guardados. Ejecuta: npm run analyze -- TICKER',
  },
  en: {
    pickTitle: 'Analyze a company the way Buffett would',
    pickLede: 'Four specialist agents review ten years of financial statements and reach a conclusion in minutes instead of days.',
    analyze: 'Analyze',
    fictional: 'Fictional',
    analyzing: 'Analyzing',
    stepMetrics: (n) => `Computing ${n} financial criteria`,
    stepFinal: 'Final assessment',
    skip: 'Skip animation',
    score: 'Score',
    agentsTitle: 'What each agent found',
    chartsTitle: 'Ten years in three charts',
    grossMargin: 'Gross margin',
    roe: 'Return on equity (ROE)',
    debtVsIncome: 'Long-term debt vs. net income',
    debt: 'LT debt', income: 'Net income', target: 'Buffett reference',
    valuationTitle: 'Price vs. intrinsic value',
    price: 'Current price', conservative: 'Conservative', base: 'Base', optimistic: 'Optimistic',
    assumptions: (a) => `Assumptions: EPS growth ${pctTxt(a.growth)}/yr, exit P/E ${a.exitPe}, ${a.years} years, ${pctTxt(a.discountRate)} discount rate.`,
    mos: (m) => (m >= 0 ? `Margin of safety: ${pctTxt(m)}` : `No margin of safety: price is ${pctTxt(-m)} above base value`),
    strengths: 'Strengths', risks: 'Risks', questions: 'What to investigate next',
    allChecks: (p, n) => `See all ${n} criteria (${p} met)`,
    source: 'Data source',
    fictionalNote: 'Fictional company used for the demo. Not real data.',
    again: 'Replay', other: 'Another company',
    redFlags: 'Red flags', findings: 'Findings',
    verdicts: {
      durable_and_undervalued: 'Durable, with a margin of safety',
      durable_wait_for_price: 'Good business, demanding price',
      not_durable: 'No durable advantage',
      insufficient_data: 'Insufficient data',
    },
    noRuns: 'No saved analyses yet. Run: npm run analyze -- TICKER',
  },
};

function pctTxt(x) { return x === null || x === undefined ? 'n/d' : `${(x * 100).toFixed(1)}%`; }
const t = (k, ...a) => (typeof T[lang][k] === 'function' ? T[lang][k](...a) : T[lang][k]);
const tx = (o) => (o && typeof o === 'object' ? o[lang] ?? o.es : o ?? '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let state = { view: 'pick', runs: [], run: null };
let replayToken = 0;

// ---------- language ----------
function setLang(l) {
  lang = l;
  try { localStorage.setItem('cacao-lang', l); } catch {}
  document.documentElement.lang = l;
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
  if (state.view === 'pick') renderPick();
  if (state.view === 'report') renderReport(state.run, false);
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
document.getElementById('home').addEventListener('click', () => { replayToken++; renderPick(); });

// ---------- picker ----------
async function loadRuns() {
  const res = await fetch('runs/index.json', { cache: 'no-store' });
  state.runs = res.ok ? await res.json() : [];
}

function renderPick() {
  state.view = 'pick';
  app.innerHTML = `
    <section class="fade-in">
      <h1>${esc(t('pickTitle'))}</h1>
      <p class="lede">${esc(t('pickLede'))}</p>
      <div class="stack">
        ${state.runs.length ? state.runs.map((r) => `
          <button class="card pick" type="button" data-file="${esc(r.file)}">
            <span class="ticker">${esc(r.ticker)}</span>
            <span>
              <strong>${esc(r.name)}</strong><br/>
              ${r.fictional ? `<span class="badge">${esc(t('fictional'))}</span>` : ''}
            </span>
            <span class="go">${esc(t('analyze'))} →</span>
          </button>`).join('') : `<p class="card muted">${esc(t('noRuns'))}</p>`}
      </div>
    </section>`;
  app.querySelectorAll('.pick').forEach((b) => b.addEventListener('click', () => openRun(b.dataset.file)));
}

async function openRun(file) {
  const res = await fetch(`runs/${encodeURIComponent(file)}`, { cache: 'no-store' });
  state.run = await res.json();
  replay(state.run);
}

// ---------- replay ----------
// Saved timelines can be near-instant (mock) or ~40s (real API), so the replay
// uses a fixed, readable schedule while keeping the real order agents finished in.
async function replay(run) {
  const token = ++replayToken;
  state.view = 'replay';
  const agents = run.agentReports;
  const finishOrder = run.timeline.filter((e) => e.type === 'agent_finished').map((e) => e.agentId);
  const order = finishOrder.length === agents.length ? finishOrder : agents.map((a) => a.agentId);

  app.innerHTML = `
    <section class="fade-in">
      <p class="muted small">${esc(t('analyzing'))}</p>
      <h1>${esc(run.company.name)}</h1>
      <p class="lede">${esc(run.company.ticker)} · ${esc(run.company.exchange)} · ${run.company.firstYear}–${run.company.lastYear}</p>
      <ol class="card steps">
        <li class="step" id="s-metrics"><span class="dot"></span><span>${esc(t('stepMetrics', run.metrics.checksScored))}</span><span class="score"></span></li>
        ${agents.map((a) => `<li class="step" id="s-${a.agentId}"><span class="dot"></span><span>${esc(tx(a.name))}</span><span class="score"></span></li>`).join('')}
        <li class="step" id="s-final"><span class="dot"></span><span>${esc(t('stepFinal'))}</span><span class="score"></span></li>
      </ol>
      <button class="skip" type="button" id="skip">${esc(t('skip'))}</button>
    </section>`;
  document.getElementById('skip').addEventListener('click', () => { replayToken++; renderReport(run); });

  const step = (id, cls, score) => {
    const el = document.getElementById(`s-${id}`);
    if (!el) return;
    el.className = `step ${cls}`;
    if (cls === 'done') el.querySelector('.dot').textContent = '✓';
    if (score !== undefined) el.querySelector('.score').textContent = score;
  };
  const alive = () => token === replayToken;

  step('metrics', 'running');
  await sleep(1400); if (!alive()) return;
  step('metrics', 'done', `${run.metrics.checksPassed}/${run.metrics.checksScored}`);

  for (const a of agents) { step(a.agentId, 'running'); await sleep(250); if (!alive()) return; }
  for (const id of order) {
    await sleep(1300); if (!alive()) return;
    const a = agents.find((x) => x.agentId === id);
    step(id, 'done', `${a.report.score}/10`);
  }
  await sleep(400); if (!alive()) return;
  step('final', 'running');
  await sleep(1800); if (!alive()) return;
  step('final', 'done', `${run.final.overallScore}/100`);
  await sleep(700); if (!alive()) return;
  renderReport(run);
}

// ---------- charts ----------
function lineChart({ series, years, format, ref, min: forcedMin }) {
  const W = 320, H = 150, L = 38, R = 8, Tp = 10, B = 22;
  const all = series.flatMap((s) => s.values).concat(ref ?? []).filter((v) => v !== null);
  let lo = forcedMin ?? Math.min(0, ...all), hi = Math.max(...all);
  if (hi === lo) hi = lo + 1;
  hi += (hi - lo) * 0.08;
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, years.length - 1);
  const y = (v) => Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B);
  const path = (vals) => vals.map((v, i) => (v === null ? '' : `${i && vals[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join('');
  const ticks = [lo, (lo + hi) / 2, hi];
  return `<svg viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map((v) => `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${format(v)}</text>`).join('')}
    ${ref !== undefined ? `<line class="ref" x1="${L}" x2="${W - R}" y1="${y(ref)}" y2="${y(ref)}"/>` : ''}
    ${series.map((s, i) => `<path class="s${i + 1}" d="${path(s.values)}"/>`).join('')}
    <text class="tick" x="${L}" y="${H - 4}">${years[0]}</text>
    <text class="tick" x="${W - R}" y="${H - 4}" text-anchor="end">${years.at(-1)}</text>
  </svg>`;
}

const pctFmt = (v) => `${Math.round(v * 100)}%`;
const numFmt = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString());

function charts(run) {
  const g = run.metrics.groups;
  const ca = g.competitiveAdvantage.perYear;
  const eq = g.earningsQuality.perYear;
  const bs = g.balanceSheet.perYear;
  const years = ca.map((p) => p.year);
  const th = run.metrics.thresholds;
  return `
    <div class="card chart"><h3>${esc(t('grossMargin'))}</h3>
      ${lineChart({ years, series: [{ values: ca.map((p) => p.grossMargin) }], format: pctFmt, ref: th.grossMarginDurable })}
      <div class="legend"><span><i></i>${esc(t('grossMargin'))}</span><span><i class="lr"></i>${esc(t('target'))} ≥ ${pctFmt(th.grossMarginDurable)}</span></div></div>
    <div class="card chart"><h3>${esc(t('roe'))}</h3>
      ${lineChart({ years, series: [{ values: eq.map((p) => p.roe) }], format: pctFmt, ref: th.roeDurable })}
      <div class="legend"><span><i></i>ROE</span><span><i class="lr"></i>${esc(t('target'))} ≥ ${pctFmt(th.roeDurable)}</span></div></div>
    <div class="card chart" style="grid-column: 1 / -1"><h3>${esc(t('debtVsIncome'))}</h3>
      <p class="muted small" style="margin:2px 0 0">${esc(run.company.currency)} · ${esc(run.company.units)}</p>
      ${lineChart({ years, series: [{ values: eq.map((p) => p.netIncome) }, { values: bs.map((p) => p.longTermDebt) }], format: numFmt })}
      <div class="legend"><span><i></i>${esc(t('income'))}</span><span><i class="l2"></i>${esc(t('debt'))}</span></div></div>`;
}

function valuationBlock(run) {
  const v = run.metrics.groups.valuation.summary;
  const iv = v.intrinsicValuePerShare;
  if (!iv.base) return '';
  const rows = [
    ['price', t('price'), v.price],
    ['', t('conservative'), iv.conservative],
    ['', t('base'), iv.base],
    ['', t('optimistic'), iv.optimistic],
  ].filter((r) => r[2] !== null);
  const top = Math.max(...rows.map((r) => r[2])) * 1.05;
  return `<div class="card">
    ${rows.map(([cls, label, val]) => `<div class="val-row ${cls}"><span>${esc(label)}</span><span class="track"><span style="width:${((val / top) * 100).toFixed(1)}%"></span></span><b>$${val.toFixed(2)}</b></div>`).join('')}
    ${v.marginOfSafety !== null ? `<p style="margin:12px 0 4px"><strong>${esc(t('mos', v.marginOfSafety))}</strong></p>` : ''}
    <p class="muted small" style="margin:0">${esc(t('assumptions', v.assumptions))}</p>
  </div>`;
}

function ring(score) {
  const r = 34, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, score)) / 100;
  return `<svg class="ring" viewBox="0 0 84 84" aria-label="${esc(t('score'))} ${score}/100">
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
    <circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--cacao)" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <text x="42" y="50" text-anchor="middle">${score}</text></svg>`;
}

const list = (items, cls) => items.map((i) => `<li class="${cls}">${esc(tx(i))}</li>`).join('');

function allChecks(run) {
  const checks = Object.values(run.metrics.groups).flatMap((g) => g.checks);
  const fmt = (c) => (typeof c.value === 'number' ? (Math.abs(c.value) <= 5 ? pctTxt(c.value) : c.value) : '—');
  return `<details class="card"><summary>${esc(t('allChecks', run.metrics.checksPassed, checks.length))}</summary>
    <ul class="checks">${checks.map((c) => `<li><span class="m ${c.pass === null ? 'n' : c.pass ? 'p' : 'f'}">${c.pass === null ? '·' : c.pass ? '✓' : '✗'}</span><span>${esc(c.label)}</span><span class="v">${esc(fmt(c))}</span></li>`).join('')}</ul>
  </details>`;
}

// ---------- report ----------
function renderReport(run, scrollTop = true) {
  state.view = 'report';
  const f = run.final;
  app.innerHTML = `
    <section class="fade-in">
      <div class="verdict ${esc(f.verdict)}">
        <div class="verdict-top">
          ${ring(f.overallScore)}
          <div>
            <div class="label">${esc(run.company.ticker)} · ${esc(T[lang].verdicts[f.verdict] ?? f.verdict)}</div>
            <h1>${esc(tx(f.headline))}</h1>
          </div>
        </div>
        <p>${esc(tx(f.summary))}</p>
      </div>
      ${run.company.fictional ? `<p class="small" style="margin-top:12px"><span class="badge">${esc(t('fictional'))}</span> <span class="muted">${esc(t('fictionalNote'))}</span></p>` : ''}

      <h2>${esc(t('agentsTitle'))}</h2>
      <div class="agents">
        ${run.agentReports.map(({ name, report }) => `
          <article class="card">
            <div class="agent-head"><h3>${esc(tx(name))}</h3><span class="agent-score">${report.score}<small>/10</small></span></div>
            <div class="bar"><span style="width:${report.score * 10}%"></span></div>
            <p style="margin:0;font-size:14px">${esc(tx(report.summary))}</p>
            <ul class="findings">${list(report.keyFindings, 'good')}${list(report.redFlags, 'bad')}</ul>
          </article>`).join('')}
      </div>

      <h2>${esc(t('valuationTitle'))}</h2>
      ${valuationBlock(run)}

      <h2>${esc(t('chartsTitle'))}</h2>
      <div class="charts">${charts(run)}</div>

      <h2>${esc(t('strengths'))}</h2>
      <div class="card"><ul class="findings" style="margin:0">${list(f.strengths, 'good')}</ul></div>

      <h2>${esc(t('risks'))}</h2>
      <div class="card"><ul class="findings" style="margin:0">${list(f.risks, 'bad')}</ul></div>

      <h2>${esc(t('questions'))}</h2>
      <div class="card"><ul class="findings" style="margin:0">${list(f.questionsToInvestigate, '')}</ul></div>

      <div style="margin-top:24px">${allChecks(run)}</div>

      <div class="actions">
        <button class="btn" type="button" id="again">${esc(t('again'))}</button>
        <button class="btn ghost" type="button" id="other">${esc(t('other'))}</button>
      </div>

      <p class="disclaimer">${esc(tx(run.disclaimer))}<br/>${esc(t('source'))}: ${esc(run.company.source)}</p>
    </section>`;
  document.getElementById('again').addEventListener('click', () => replay(run));
  document.getElementById('other').addEventListener('click', () => { replayToken++; renderPick(); });
  if (scrollTop) window.scrollTo({ top: 0 });
}

// ---------- boot ----------
setLang(lang);
await loadRuns();
// Deep link: #DEMO opens that run directly (handy for QR codes).
const hash = location.hash.slice(1).toUpperCase();
const linked = state.runs.find((r) => r.ticker === hash);
if (linked) openRun(linked.file); else renderPick();
