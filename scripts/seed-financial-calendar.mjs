import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

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
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
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

async function fetchItems(path, params = {}) {
  const url = new URL(`${COCKPIT_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`GET ${path} -> ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function postItem(path, data) {
  const response = await fetch(`${COCKPIT_BASE}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ data }),
  });
  if (!response.ok) {
    throw new Error(`POST ${path} -> ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function main() {
  const currentYear = new Date().getFullYear();
  const targetYears = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);

  const years = await fetchItems('/content/items/financialyears', { limit: 50 });
  const quarters = await fetchItems('/content/items/financialquarters', { limit: 300, populate: 1 });

  const yearList = Array.isArray(years) ? years : years.items ?? [];
  const quarterList = Array.isArray(quarters) ? quarters : quarters.items ?? [];
  const yearByNumber = new Map(yearList.map((year) => [year.year, year]));
  const quarterKeys = new Set(quarterList.map((quarter) => `${quarter.year?._id}:${quarter.quarter_number}`));

  let createdYears = 0;
  let createdQuarters = 0;

  for (const yearValue of targetYears) {
    let year = yearByNumber.get(yearValue);
    if (!year) {
      year = await postItem('/content/item/financialyears', {
        name: `FY ${yearValue}`,
        year: yearValue,
        active: true,
      });
      yearByNumber.set(yearValue, year);
      createdYears += 1;
    }

    for (const quarterNumber of [1, 2, 3, 4]) {
      const key = `${year._id}:${quarterNumber}`;
      if (quarterKeys.has(key)) continue;
      await postItem('/content/item/financialquarters', {
        name: `Q${quarterNumber} FY${yearValue}`,
        year: { _id: year._id, name: year.name },
        quarter_number: quarterNumber,
        active: true,
      });
      quarterKeys.add(key);
      createdQuarters += 1;
    }
  }

  console.log(`Financial calendar ready. Created ${createdYears} year(s) and ${createdQuarters} quarter(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});