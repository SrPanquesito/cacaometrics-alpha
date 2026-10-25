// Builds a fully static copy of the demo in apps/demo/dist — upload that folder
// to S3 + CloudFront (or any static host). Works offline once loaded.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runsIndex } from './server.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNS = path.resolve(HERE, '../..', process.env.RUNS_DIR || 'runs');
const DIST = path.join(HERE, 'dist');

await rm(DIST, { recursive: true, force: true });
await mkdir(path.join(DIST, 'runs'), { recursive: true });
await cp(path.join(HERE, 'public'), DIST, { recursive: true });

const index = await runsIndex(RUNS);
for (const r of index) await cp(path.join(RUNS, r.file), path.join(DIST, 'runs', r.file));
await writeFile(path.join(DIST, 'runs', 'index.json'), JSON.stringify(index));

console.log(`Built ${path.relative(process.cwd(), DIST)} with ${index.length} run(s): ${index.map((r) => r.ticker).join(', ')}`);
