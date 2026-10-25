// DEMO-SHORTCUT: tiny static server that replays saved runs. The real app will
// serve live analyses from the API; this replay mode is worth keeping for demos.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
if (existsSync(path.join(ROOT, '.env'))) process.loadEnvFile(path.join(ROOT, '.env'));

const PUBLIC = path.join(HERE, 'public');
const RUNS = path.resolve(ROOT, process.env.RUNS_DIR || 'runs');
const PORT = Number(process.env.PORT || 4321);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

/** Summary list of saved runs, shared with build.js. */
export async function runsIndex(dir = RUNS) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'index.json');
  const list = [];
  for (const f of files) {
    const run = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
    list.push({ ticker: run.company.ticker, name: run.company.name, fictional: run.company.fictional, verdict: run.final.verdict, overallScore: run.final.overallScore, file: f });
  }
  return list.sort((a, b) => Number(a.fictional) - Number(b.fictional) || a.ticker.localeCompare(b.ticker));
}

const send = (res, status, body, type = 'text/plain') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  if (p === '/runs/index.json') return send(res, 200, JSON.stringify(await runsIndex()), TYPES['.json']);

  const [base, rel] = p.startsWith('/runs/') ? [RUNS, p.slice(6)] : [PUBLIC, p === '/' ? 'index.html' : p.slice(1)];
  const file = path.resolve(base, rel);
  if (!file.startsWith(base + path.sep)) return send(res, 403, 'Forbidden');
  try {
    return send(res, 200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream');
  } catch {
    return send(res, 404, 'Not found');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer((req, res) => handle(req, res).catch((e) => send(res, 500, e.message))).listen(PORT, () => {
    console.log(`CacaoMetrics demo → http://localhost:${PORT}`);
  });
}
