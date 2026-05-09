/**
 * patch-client-sectors.mjs
 *
 * Patches clients already in Cockpit CMS that are missing their sector_name.
 * Reads clientdb.csv, matches by name, updates sector field as text.
 *
 * Usage: node scripts/patch-client-sectors.mjs
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseCsv(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
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

async function fetchAllClients() {
  const res = await fetch(`${COCKPIT_BASE}/content/items/clients?limit=500`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Fetch clients failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? data ?? [];
}

async function patchClient(id, sector) {
  const res = await fetch(`${COCKPIT_BASE}/content/item/clients`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ data: { _id: id, sector } }),
  });
  if (!res.ok) throw new Error(`PATCH ${id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

(async () => {
  const csvPath = resolve(__dirname, '../clientdb.csv');
  const raw = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);

  // Build map: name → sector from CSV
  const csvSectorMap = new Map();
  for (const row of rows) {
    const name = (row['Client Name'] || row['name'] || row['Name'] || '').trim();
    const sector = (row['Sector'] || row['sector'] || '').trim();
    if (name && sector) csvSectorMap.set(name.toLowerCase(), sector);
  }

  console.log(`CSV has ${csvSectorMap.size} clients with sectors`);

  const clients = await fetchAllClients();
  console.log(`Cockpit has ${clients.length} clients`);

  let patched = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    const sector = csvSectorMap.get(client.name?.trim().toLowerCase());
    if (!sector) { console.log(`[SKIP] No CSV match for: ${client.name}`); skipped++; continue; }

    // Only patch if sector is missing or different
    if (client.sector === sector) { skipped++; continue; }

    try {
      await patchClient(client._id, sector);
      console.log(`[OK]   ${client.name} → sector: ${sector}`);
      patched++;
      await sleep(100);
    } catch (e) {
      console.error(`[ERR]  ${client.name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}, Errors: ${errors}`);
})();
