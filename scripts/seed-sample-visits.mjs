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

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysFromToday(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return formatDate(date);
}

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
  const clients = await fetchItems('/content/items/clients', { limit: 20, populate: 1 });
  const users = await fetchItems('/content/items/users', { limit: 20, populate: 1 });
  const existingVisits = await fetchItems('/content/items/visits', { limit: 200, populate: 1 });

  const clientList = Array.isArray(clients) ? clients : clients.items ?? [];
  const userList = Array.isArray(users) ? users : users.items ?? [];
  const visitList = Array.isArray(existingVisits) ? existingVisits : existingVisits.items ?? [];

  if (clientList.length === 0) {
    throw new Error('No clients found. Seed clients first.');
  }

  const assignableUsers = userList.filter((user) => user.role === 'am' || user.role === 'sales' || user.role === 'solution' || user.role === 'management' || user.role === 'admin');
  const fallbackUser = assignableUsers[0] ?? userList[0] ?? null;
  if (!fallbackUser) {
    throw new Error('No users found to assign sample visits.');
  }

  const seeds = [
    { offset: 0, start: '09:30', end: '10:30', status: 'scheduled', title: 'Q2 account review', meeting_group: 'app' },
    { offset: 0, start: '14:00', end: '15:00', status: 'in_progress', title: 'Product renewal discussion', meeting_group: 'es' },
    { offset: -1, start: '10:00', end: '11:15', status: 'completed', title: 'Service renewal confirmed', meeting_group: 'infra' },
    { offset: -2, start: '13:00', end: '14:00', status: 'completed', title: 'Stakeholder demo', meeting_group: 'ms' },
    { offset: -3, start: '11:00', end: '11:45', status: 'missed', title: 'Collections follow-up', meeting_group: 'es' },
    { offset: 2, start: '15:00', end: '16:00', status: 'scheduled', title: 'Planning session', meeting_group: 'app' },
  ];

  let created = 0;
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index];
    const client = clientList[index % clientList.length];
    const assignedAm = client.am ?? { _id: fallbackUser._id, name: fallbackUser.name };
    const visitDate = daysFromToday(seed.offset);
    const title = `[Seed] ${client.name} - ${seed.title}`;

    const exists = visitList.some((visit) => visit.title === title && visit.date === visitDate);
    if (exists) continue;

    await postItem('/content/item/visits', {
      title,
      client: { _id: client._id, name: client.name },
      assigned_am: assignedAm,
      meeting_group: seed.meeting_group,
      date: visitDate,
      start_time: seed.start,
      end_time: seed.end,
      location: client.address || 'Client office',
      agenda: `Seeded visit for ${client.name}`,
      status: seed.status,
    });
    created += 1;
  }

  console.log(`Seeded ${created} sample visit(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});