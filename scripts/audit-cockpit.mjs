/**
 * audit-cockpit.mjs
 *
 * Read-only audit for the Cockpit CMS collections used by the app.
 * It checks:
 *   - whether the legacy schema endpoint is available
 *   - whether each required collection endpoint exists
 *   - whether sample records expose the fields the app expects
 *
 * Usage:
 *   npm run audit:cockpit
 *   COCKPIT_API_TOKEN=... COCKPIT_BASE=https://cms.example.com/api node scripts/audit-cockpit.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { COLLECTIONS } from './migrate-cockpit-v24.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = resolve(projectRoot, '.env');
  if (!existsSync(envPath)) return {};

  const env = {};
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

const fileEnv = loadEnvFile();
const COCKPIT_BASE = process.env.COCKPIT_BASE
  || process.env.EXPO_PUBLIC_COCKPIT_API_URL
  || fileEnv.EXPO_PUBLIC_COCKPIT_API_URL
  || 'https://cms.bimats.com/api';
const TOKEN = process.env.COCKPIT_API_TOKEN
  || process.env.EXPO_PUBLIC_COCKPIT_API_TOKEN
  || fileEnv.EXPO_PUBLIC_COCKPIT_API_TOKEN;

if (!TOKEN) {
  console.error('Error: missing COCKPIT_API_TOKEN or EXPO_PUBLIC_COCKPIT_API_TOKEN.');
  process.exit(1);
}

const HEADERS = {
  'Api-Key': TOKEN,
  'Content-Type': 'application/json',
};

async function fetchJson(path, params = {}) {
  const url = new URL(`${COCKPIT_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { headers: HEADERS });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    text,
  };
}

function collectFieldNames(sample) {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) return [];
  return Object.keys(sample).filter((key) => !key.startsWith('_')).sort();
}

function formatStatus(ok, label) {
  return `${ok ? 'OK  ' : 'FAIL'} ${label}`;
}

async function auditSchemaEndpoint() {
  const result = await fetchJson('/content/collections');
  console.log('Schema endpoint');
  if (result.ok) {
    console.log(`  ${formatStatus(true, `GET /content/collections → ${result.status}`)}`);
  } else {
    console.log(`  ${formatStatus(false, `GET /content/collections → ${result.status}`)}`);
    console.log('  The CMS is not exposing the legacy schema route; create collections in Cockpit admin UI or use the correct schema endpoint for this server.');
  }
  console.log('');
}

async function auditCollections() {
  let failures = 0;

  for (const collection of COLLECTIONS) {
    const expectedFields = collection.fields.map((field) => field.name);
    const result = await fetchJson(`/content/items/${collection.name}`, { limit: 1, populate: 1 });

    console.log(`${collection.name}`);

    if (!result.ok) {
      failures += 1;
      console.log(`  ${formatStatus(false, `endpoint missing or inaccessible (${result.status})`)}`);
      if (typeof result.data === 'object' && result.data?.error) {
        console.log(`  Server: ${result.data.error}`);
      }
      console.log('');
      continue;
    }

    const records = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.items)
        ? result.data.items
        : [];
    const sample = records[0] ?? null;
    const actualFields = collectFieldNames(sample);
    const missingFields = sample
      ? expectedFields.filter((field) => !actualFields.includes(field))
      : [];
    const extraFields = sample
      ? actualFields.filter((field) => !expectedFields.includes(field))
      : [];

    console.log(`  ${formatStatus(true, `endpoint available (${result.status})`)}`);
    console.log(`  Records returned: ${records.length}`);

    if (!sample) {
      console.log('  No sample rows yet; field-level validation is skipped until at least one record exists.');
      console.log(`  Expected fields: ${expectedFields.join(', ')}`);
      console.log('');
      continue;
    }

    if (missingFields.length) {
      failures += 1;
      console.log(`  ${formatStatus(false, `missing fields in sample: ${missingFields.join(', ')}`)}`);
    } else {
      console.log(`  ${formatStatus(true, 'sample exposes all expected fields')}`);
    }

    if (extraFields.length) {
      console.log(`  Extra fields in sample: ${extraFields.join(', ')}`);
    }

    console.log(`  Sample fields: ${actualFields.join(', ') || '(none)'}`);
    console.log('');
  }

  return failures;
}

async function main() {
  console.log(`Cockpit audit for ${COCKPIT_BASE}`);
  console.log('');
  await auditSchemaEndpoint();
  const failures = await auditCollections();
  console.log(`Summary: ${failures === 0 ? 'no structural issues detected from readable samples' : `${failures} issue(s) detected`}`);
  process.exitCode = failures === 0 ? 0 : 2;
}

main().catch((error) => {
  console.error('Audit failed:', error.message);
  process.exit(1);
});