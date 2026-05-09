/**
 * migrate-cockpit-v24.mjs
 *
 * Cockpit CMS migration for VisitPlan MVP v2.4.
 *
 * Creates / updates 7 collections with the exact schema from visitplan_mvp.md:
 *   1. users
 *   2. sectors
 *   3. clients
 *   4. contacts
 *   5. visits
 *   6. agenda_items
 *   7. visit_outcomes
 *
 * Then seeds:
 *   - 9 default sectors (idempotent)
 *   - clients from clientdb.csv (idempotent — skips by name)
 *
 * Cockpit Pro/CE schema endpoint:
 *   POST /api/content/collection?token=...   { name, fields, ... }
 *
 * Note: this script uses the **master API token** (Settings → API Access → Tokens
 * → Master Key). A scoped key cannot create/update schemas. After migration,
 * the running app should use a scoped key with Read+Write on these 7 collections.
 *
 * Usage:
 *   COCKPIT_API_TOKEN=master-token-here node scripts/migrate-cockpit-v24.mjs
 *
 * Optional:
 *   SKIP_SCHEMA=1 node scripts/migrate-cockpit-v24.mjs   # only re-seed
 *   SKIP_SEED=1   node scripts/migrate-cockpit-v24.mjs   # only schema
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COCKPIT_BASE = process.env.COCKPIT_BASE || 'https://cms.bimats.com/api';
const TOKEN = process.env.COCKPIT_API_TOKEN;
if (!TOKEN) {
  console.error('Error: COCKPIT_API_TOKEN env var is required (use master key).');
  process.exit(1);
}

const SKIP_SCHEMA = process.env.SKIP_SCHEMA === '1';
const SKIP_SEED = process.env.SKIP_SEED === '1';

const HEADERS = {
  'Content-Type': 'application/json',
  'api-key': TOKEN,
};

async function api(method, path, body) {
  const url = `${COCKPIT_BASE}${path}`;
  const opts = { method, headers: HEADERS };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const get  = (p, q = {}) => {
  const url = new URL(`${COCKPIT_BASE}${p}`);
  for (const [k, v] of Object.entries(q)) url.searchParams.set(k, String(v));
  return fetch(url, { headers: HEADERS }).then(async (r) => {
    const t = await r.text();
    if (!r.ok) throw new Error(`GET ${p} → ${r.status} ${t}`);
    return t ? JSON.parse(t) : null;
  });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ──────────────────────────────────────────────────────────────────────────────
// Schema definitions (exact match to visitplan_mvp.md v2.4)
// ──────────────────────────────────────────────────────────────────────────────

const f = {
  text:   (name, opts = {}) => ({ name, type: 'text', label: name, options: { ...opts } }),
  area:   (name, opts = {}) => ({ name, type: 'textarea', label: name, options: { ...opts } }),
  num:    (name, opts = {}) => ({ name, type: 'number', label: name, options: { ...opts } }),
  bool:   (name, def = true) => ({ name, type: 'boolean', label: name, default: def, options: {} }),
  date:   (name, opts = {}) => ({ name, type: 'date', label: name, options: { ...opts } }),
  select: (name, options) => ({ name, type: 'select', label: name, options: { options: options.join(', ') } }),
  link:   (name, link) => ({ name, type: 'collectionlink', label: name, options: { link, multiple: false } }),
  links:  (name, link) => ({ name, type: 'collectionlink', label: name, options: { link, multiple: true } }),
};

const COLLECTIONS = [
  {
    name: 'users',
    fields: [
      f.text('name', { required: true }),
      f.text('email', { required: true }),
      f.select('role', ['am', 'sales', 'solution', 'management', 'admin']),
      f.select('seniority', ['junior', 'senior']),
      f.select('approval_status', ['pending', 'approved', 'rejected']),
      f.select('meeting_group', ['infra', 'es', 'app', 'ms']),
      f.num('target_usd'),
      f.text('ms_email'),
      f.text('ms_id'),
      f.bool('active', true),
    ],
  },
  {
    name: 'sectors',
    fields: [
      f.text('name', { required: true }),
      f.link('owner_am', 'users'),
      f.bool('active', true),
    ],
  },
  {
    name: 'clients',
    fields: [
      f.text('name', { required: true }),
      f.link('sector', 'sectors'),
      f.select('account_type', ['Named Account', 'Key Account']),
      f.select('status', ['Active', 'Hold', 'Inactive', 'Churned', 'Prospect']),
      f.link('am', 'users'),
      f.text('address'),
      f.text('phone'),
      f.text('website'),
      f.area('notes'),
      f.area('instruction'),
    ],
  },
  {
    name: 'contacts',
    fields: [
      f.text('name', { required: true }),
      f.link('client', 'clients'),
      f.text('email'),
      f.text('phone'),
      f.text('position'),
    ],
  },
  {
    name: 'visits',
    fields: [
      f.text('title', { required: true }),
      f.link('client', 'clients'),
      f.link('contact', 'contacts'),
      f.link('assigned_am', 'users'),
      f.links('participants', 'users'),
      f.select('meeting_group', ['infra', 'es', 'app', 'ms']),
      f.date('date'),
      f.text('start_time'),
      f.text('end_time'),
      f.text('location'),
      f.select('status', ['scheduled', 'in_progress', 'completed', 'missed']),
      f.text('checkin_at'),
      f.text('checkout_at'),
      f.num('checkin_lat'),
      f.num('checkin_lng'),
    ],
  },
  {
    name: 'agenda_items',
    fields: [
      f.link('visit', 'visits'),
      f.text('title', { required: true }),
      f.num('order'),
      f.bool('completed', false),
      f.link('created_by', 'users'),
    ],
  },
  {
    name: 'visit_outcomes',
    fields: [
      f.link('visit', 'visits'),
      f.select('result', ['positive', 'neutral', 'negative', 'no_show']),
      f.area('summary'),
      f.text('next_action'),
      f.date('next_visit_date'),
      f.num('pipeline_usd'),
      f.link('submitted_by', 'users'),
      f.text('submitted_at'),
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Schema migration
// ──────────────────────────────────────────────────────────────────────────────

async function listCollections() {
  // Cockpit returns array of collection meta objects.
  try {
    return await get('/content/collections');
  } catch {
    return [];
  }
}

async function saveCollection(meta) {
  // Cockpit endpoint to create/update a collection schema.
  return api('POST', '/content/collection', { data: meta });
}

async function migrateSchema() {
  console.log('\n══ Schema migration ══════════════════════════════════════════');
  const existing = await listCollections().catch(() => []);
  const existingNames = new Set(
    (Array.isArray(existing) ? existing : Object.values(existing || {}))
      .map((c) => c?.name)
      .filter(Boolean)
  );
  console.log(`Existing collections: ${[...existingNames].join(', ') || '(none)'}\n`);

  for (const col of COLLECTIONS) {
    const exists = existingNames.has(col.name);
    const meta = {
      name: col.name,
      label: col.name,
      fields: col.fields,
      sortable: false,
    };
    try {
      await saveCollection(meta);
      console.log(`  [${exists ? 'UPDATE' : 'CREATE'}] ${col.name} (${col.fields.length} fields)`);
    } catch (e) {
      console.error(`  [ERR]    ${col.name}: ${e.message}`);
    }
    await sleep(120);
  }
  console.log('\nSchema done.');
}

// ──────────────────────────────────────────────────────────────────────────────
// Seeds
// ──────────────────────────────────────────────────────────────────────────────

const SECTORS = [
  'Microfinance', 'MDR', 'Healthcare', 'Insurance',
  'Banking', 'Telecom', 'Media', 'Software', 'Government',
];

async function seedSectors() {
  console.log('\n── Seeding sectors ──');
  let existing = [];
  try {
    const res = await get('/content/items/sectors', { limit: 200 });
    existing = res?.items ?? res ?? [];
  } catch {}
  const have = new Set(existing.map((s) => s.name?.toLowerCase()));
  const map = Object.fromEntries(existing.map((s) => [s.name, s._id]));

  for (const name of SECTORS) {
    if (have.has(name.toLowerCase())) {
      console.log(`  [skip] ${name}`);
      continue;
    }
    try {
      const r = await api('POST', '/content/item/sectors', { data: { name, active: true } });
      map[name] = r._id;
      console.log(`  [ok ] ${name}`);
      await sleep(100);
    } catch (e) {
      console.error(`  [err] ${name}: ${e.message}`);
    }
  }
  return map;
}

function parseCsv(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = [];
    let inQ = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    rows.push(row);
  }
  return rows;
}

async function seedClients(sectorMap) {
  console.log('\n── Seeding clients (from clientdb.csv) ──');
  const csv = readFileSync(resolve(__dirname, '../clientdb.csv'), 'utf8');
  const rows = parseCsv(csv);

  const sectorByName = {};
  for (const [n, id] of Object.entries(sectorMap)) sectorByName[n.toLowerCase()] = { _id: id, name: n };

  let existing = [];
  try {
    const res = await get('/content/items/clients', { limit: 1000 });
    existing = res?.items ?? res ?? [];
  } catch {}
  const have = new Set(existing.map((c) => c.name?.trim().toLowerCase()));

  let ok = 0, skip = 0, err = 0;
  for (const r of rows) {
    const name = (r['Client Name'] || r['name'] || '').trim();
    if (!name) { skip++; continue; }
    if (have.has(name.toLowerCase())) { skip++; continue; }

    const sectorRaw = (r['Sector'] || '').trim();
    const sector = sectorByName[sectorRaw.toLowerCase()] || null;
    const status = (r['Status'] || 'Prospect').trim();
    const account_type = (r['Account Type'] || 'Named Account').trim();

    try {
      await api('POST', '/content/item/clients', {
        data: { name, sector, status, account_type, instruction: '' },
      });
      ok++;
      console.log(`  [ok ] ${name}`);
      await sleep(120);
    } catch (e) {
      err++;
      console.error(`  [err] ${name}: ${e.message}`);
    }
  }
  console.log(`\nClients: created ${ok}, skipped ${skip}, errors ${err}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

(async () => {
  try {
    if (!SKIP_SCHEMA) await migrateSchema();
    else console.log('SKIP_SCHEMA=1 → skipping schema migration');

    if (!SKIP_SEED) {
      const sectors = await seedSectors();
      await seedClients(sectors);
    } else {
      console.log('SKIP_SEED=1 → skipping seeds');
    }

    console.log('\n✅  Migration complete.');
  } catch (e) {
    console.error('\n❌  Migration failed:', e.message);
    process.exit(1);
  }
})();
