import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const env = readFileSync(join(ROOT, '.env'), 'utf8');
const TOKEN = (env.match(/^REPLICATE_API_TOKEN=(.+)$/m) || [])[1]?.trim();
if (!TOKEN) { console.error('no REPLICATE_API_TOKEN'); process.exit(1); }

const SRC = process.argv[2];
const OUT = process.argv[3] || '/tmp/logo_cutout.png';
const MODEL = process.argv[4] || 'men1scus/birefnet';
const H = { Authorization: `Bearer ${TOKEN}` };

const buf = readFileSync(SRC);
const dataUri = `data:image/jpeg;base64,${buf.toString('base64')}`;

async function run() {
  // full latest version hash
  const m = await (await fetch(`https://api.replicate.com/v1/models/${MODEL}`, { headers: H })).json();
  const version = m.latest_version?.id;
  if (!version) throw new Error('no version for ' + MODEL);

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({ version, input: { image: dataUri } }),
  });
  let pred = await res.json();
  if (pred.error && !pred.id) throw new Error('replicate: ' + JSON.stringify(pred.error));
  const started = Date.now();
  while (['starting', 'processing'].includes(pred.status)) {
    if (Date.now() - started > 120000) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 2000));
    pred = await (await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers: H })).json();
  }
  if (pred.status !== 'succeeded') throw new Error(`${pred.status}: ${pred.error || '?'}`);
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const img = await fetch(url);
  writeFileSync(OUT, Buffer.from(await img.arrayBuffer()));
  console.log('cutout saved ->', OUT, 'via', MODEL);
}
run().catch((e) => { console.error(e.message); process.exit(1); });
