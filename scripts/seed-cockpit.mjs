/**
 * seed-cockpit.mjs
 *
 * Seeds Cockpit CMS with:
 *   1. Optional sectors collection values when the collection exists
 *   2. Clients from clientdb.csv (with AM, Account Type, Sector, Status)
 *
 * Usage:
 *   COCKPIT_API_TOKEN=your-token node scripts/seed-cockpit.mjs
 *
 * Requires Node >= 18 (uses built-in fetch).
 * COCKPIT_API_TOKEN env var must be set (get it from Cockpit CMS admin).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COCKPIT_BASE = 'https://cms.bimats.com/api';
const TOKEN = process.env.COCKPIT_API_TOKEN;
if (!TOKEN) {
  console.error('Error: COCKPIT_API_TOKEN env var is required. Set it before running.');
  process.exit(1);
}

const HEADERS = {
  'Content-Type': 'application/json',
  'api-key': TOKEN,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function cockpitGet(path, params = {}) {
  const url = new URL(`${COCKPIT_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function cockpitPost(path, data) {
  const res = await fetch(`${COCKPIT_BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Parse CSV ──────────────────────────────────────────────────────────────

function parseCsv(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Simple CSV split — handles quoted fields with commas
    const values = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ─── Sector seed ────────────────────────────────────────────────────────────

const SECTORS = [
  'Microfinance',
  'MDR',
  'Healthcare',
  'Insurance',
  'Banking',
  'Telecom',
  'Media',
  'Software',
  'Government',
];

async function seedSectors() {
  console.log('\n── Seeding sectors ──');

  let existing = [];
  try {
    const res = await cockpitGet('/content/items/sectors', { limit: 100 });
    existing = res.items ?? res ?? [];
  } catch (e) {
    console.warn('Could not fetch existing sectors (collection may not exist yet):', e.message);
    return {};
  }

  const existingNames = new Set(existing.map((s) => s.name?.toLowerCase()));
  const sectorMap = {};

  for (const s of existing) {
    sectorMap[s.name] = s._id;
  }

  for (const name of SECTORS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`  [SKIP] ${name} already exists`);
      continue;
    }
    try {
      const created = await cockpitPost('/content/item/sectors', { name, active: true });
      sectorMap[name] = created._id;
      console.log(`  [OK]   ${name} → ${created._id}`);
      await sleep(120);
    } catch (e) {
      console.error(`  [ERR]  ${name}: ${e.message}`);
    }
  }

  console.log(`Sectors done. Map: ${JSON.stringify(sectorMap)}`);
  return sectorMap;
}

// ─── User lookup (for AM field) ─────────────────────────────────────────────

async function fetchUserMap() {
  console.log('\n── Fetching users (AM lookup) ──');
  try {
    const res = await cockpitGet('/content/items/users', { limit: 200 });
    const users = res.items ?? res ?? [];
    const map = {};
    for (const u of users) {
      if (u.name) map[u.name.trim().toLowerCase()] = { _id: u._id, name: u.name };
    }
    console.log(`  Found ${users.length} users.`);
    return map;
  } catch (e) {
    console.warn('  Could not fetch users:', e.message);
    return {};
  }
}

// ─── Client seed ────────────────────────────────────────────────────────────

const STATUS_MAP = {
  active: 'Active',
  Active: 'Active',
  hold: 'Hold',
  Hold: 'Hold',
  inactive: 'Inactive',
  Inactive: 'Inactive',
  churned: 'Churned',
  Churned: 'Churned',
  prospect: 'Prospect',
  Prospect: 'Prospect',
};

const ACCOUNT_TYPE_MAP = {
  'Named Account': 'Named Account',
  'named account': 'Named Account',
  'Key Account': 'Key Account',
  'key account': 'Key Account',
};

async function seedClients(sectorMap, userMap) {
  console.log('\n── Seeding clients ──');

  const csvPath = resolve(__dirname, '../clientdb.csv');
  const raw = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);

  // Fetch existing clients to avoid duplicates
  let existingClients = [];
  try {
    const res = await cockpitGet('/content/items/clients', { limit: 500 });
    existingClients = res.items ?? res ?? [];
  } catch (e) {
    console.warn('Could not fetch existing clients:', e.message);
  }
  const existingNames = new Set(existingClients.map((c) => c.name?.trim().toLowerCase()));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const name = (row['Client Name'] || row['name'] || row['Name'] || '').trim();
    if (!name) { skipped++; continue; }

    if (existingNames.has(name.toLowerCase())) {
      console.log(`  [SKIP] ${name}`);
      skipped++;
      continue;
    }

    const sectorRaw = (row['Sector'] || row['sector'] || row['Industry'] || '').trim();

    const statusRaw = (row['Status'] || row['status'] || 'Prospect').trim();
    const status = STATUS_MAP[statusRaw] ?? 'Prospect';

    const accountTypeRaw = (row['Account Type'] || row['account_type'] || 'Named Account').trim();
    const account_type = ACCOUNT_TYPE_MAP[accountTypeRaw] ?? 'Named Account';

    // AM lookup — match by name (case-insensitive); null if blank or not found
    const amRaw = (row['AM'] || row['am'] || '').trim();
    const amRef = amRaw ? (userMap[amRaw.toLowerCase()] ?? null) : null;

    const clientData = {
      name,
      status,
      account_type,
      sector: sectorRaw || undefined,
      am: amRef,
      address: (row['Address'] || row['address'] || '').trim() || undefined,
      phone: (row['Phone'] || row['phone'] || '').trim() || undefined,
      website: (row['Website'] || row['website'] || '').trim() || undefined,
      notes: (row['Notes'] || row['notes'] || '').trim() || undefined,
      instruction: '',
    };

    try {
      const res = await cockpitPost('/content/item/clients', clientData);
      const amLabel = amRef ? amRef.name : '(no AM)';
      console.log(`  [OK]   ${name} | ${sectorRaw} | ${status} | AM: ${amLabel} → ${res._id}`);
      existingNames.add(name.toLowerCase());
      created++;
      await sleep(150);
    } catch (e) {
      console.error(`  [ERR]  ${name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nClients done. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const sectorMap = await seedSectors();
    const userMap = await fetchUserMap();
    await seedClients(sectorMap, userMap);
    console.log('\n✅  Seeding complete.');
  } catch (e) {
    console.error('\n❌  Seeding failed:', e.message);
    process.exit(1);
  }
})();
