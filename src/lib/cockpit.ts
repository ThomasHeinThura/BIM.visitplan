import axios from 'axios';
import { COCKPIT_API_URL, COCKPIT_API_TOKEN } from '../config';
import type {
  CockpitUser,
  CockpitClient,
  CockpitContact,
  CockpitSector,
  CockpitAgendaItem,
  CockpitVisit,
  CockpitVisitOutcome,
  CockpitFinancialYear,
  CockpitFinancialQuarter,
  ClientStatus,
  SectorName,
  UserRole,
} from '../types';

// ─── Axios Instance ────────────────────────────────────────────────────────

const cockpit = axios.create({
  baseURL: COCKPIT_API_URL,
  timeout: 15000,
  headers: {
    'Api-Key': COCKPIT_API_TOKEN,
    'Content-Type': 'application/json',
  },
});

// ─── Response Shapes ───────────────────────────────────────────────────────

type CollectionResponse<T> = T[];

// ─── Query Helpers ─────────────────────────────────────────────────────────

export type FilterRecord = Record<string, string | number | boolean | Record<string, string | number>>;

function getNestedValue(record: Record<string, unknown>, path: string) {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, record);
}

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function sortItems<T extends Record<string, unknown>>(items: T[], sort?: Record<string, 1 | -1>) {
  if (!sort || Object.keys(sort).length === 0) return items;

  return [...items].sort((left, right) => {
    for (const [key, direction] of Object.entries(sort)) {
      const comparison = compareValues(getNestedValue(left, key), getNestedValue(right, key));
      if (comparison !== 0) return comparison * direction;
    }
    return 0;
  });
}

function buildParams(options?: {
  filter?: FilterRecord;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  populate?: number;
  fields?: string;
}) {
  if (!options) return {};
  const params: Record<string, string | number> = {};
  if (options.limit !== undefined) params['limit'] = options.limit;
  if (options.skip !== undefined) params['skip'] = options.skip;
  if (options.populate !== undefined) params['populate'] = options.populate;
  if (options.fields) params['fields'] = options.fields;
  if (options.filter) {
    for (const [key, val] of Object.entries(options.filter)) {
      if (typeof val === 'object' && val !== null) {
        for (const [op, opVal] of Object.entries(val)) {
          params[`filter[${key}][${op}]`] = opVal as string | number;
        }
      } else if (typeof val === 'boolean') {
        params[`filter[${key}]`] = val ? 1 : 0;
      } else {
        params[`filter[${key}]`] = val;
      }
    }
  }
  if (options.sort) {
    for (const [key, dir] of Object.entries(options.sort)) {
      params[`sort[${key}]`] = dir;
    }
  }
  return params;
}

// ─── Users ─────────────────────────────────────────────────────────────────

export async function getUserByMsEmail(msEmail: string): Promise<CockpitUser | null> {
  const res = await cockpit.get<CollectionResponse<CockpitUser>>('/content/items/users', {
    params: buildParams({ filter: { ms_email: msEmail }, limit: 1, populate: 1 }),
  });
  return res.data[0] ?? null;
}

export async function getUsers(options?: { filter?: FilterRecord; limit?: number; skip?: number }) {
  const res = await cockpit.get<CollectionResponse<CockpitUser>>('/content/items/users', {
    params: buildParams({ ...options, populate: 1 }),
  });
  return res.data;
}

export async function upsertUser(data: Partial<CockpitUser> & { _id?: string }) {
  const res = await cockpit.post<CockpitUser>('/content/item/users', { data });
  return res.data;
}

/** Patch a user by id — used by Profile for editing meeting_group + target_usd. */
export async function updateUser(
  id: string,
  patch: Partial<Pick<CockpitUser, 'meeting_group' | 'target_usd' | 'team' | 'seniority' | 'name'>>,
): Promise<CockpitUser> {
  const res = await cockpit.post<CockpitUser>('/content/item/users', {
    data: { _id: id, ...patch },
  });
  return res.data;
}

/** Returns all users with approval_status = 'pending'. Admin only. */
export async function getPendingUsers(): Promise<CockpitUser[]> {
  const res = await cockpit.get<CollectionResponse<CockpitUser>>('/content/items/users', {
    params: buildParams({ filter: { approval_status: 'pending' }, populate: 1 }),
  });
  return res.data;
}

/** Approve a pending user: sets role + marks approval_status = 'approved'. Admin only. */
export async function approveUser(userId: string, role: UserRole): Promise<CockpitUser> {
  const res = await cockpit.post<CockpitUser>('/content/item/users', {
    data: { _id: userId, role, approval_status: 'approved', active: true },
  });
  return res.data;
}

/** Reject a pending user: sets approval_status = 'rejected'. Admin only. */
export async function rejectUser(userId: string): Promise<CockpitUser> {
  const res = await cockpit.post<CockpitUser>('/content/item/users', {
    data: { _id: userId, approval_status: 'rejected', active: false },
  });
  return res.data;
}

// ─── Clients ───────────────────────────────────────────────────────────────

export async function getClients(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitClient>>('/content/items/clients', {
    params: buildParams({
      filter: options?.filter,
      limit: options?.limit,
      skip: options?.skip,
      populate: 1,
    }),
  });

  const clients = [...res.data];
  const sortKey = options?.sort ? Object.keys(options.sort)[0] : null;
  const sortDir = sortKey ? options?.sort?.[sortKey] ?? 1 : 1;

  if (sortKey === 'name') {
    clients.sort((left, right) => left.name.localeCompare(right.name) * sortDir);
  }

  return clients;
}

/**
 * Get clients filtered by sector and/or status.
 * Sector is stored as plain text; status is a string enum.
 */
export async function getClientsByFilter(opts: {
  sector?: SectorName | null;
  status?: ClientStatus | null;
  amId?: string | null;
  limit?: number;
  skip?: number;
}): Promise<CockpitClient[]> {
  const filter: FilterRecord = {};
  if (opts.sector) filter['sector'] = opts.sector;
  if (opts.status) filter['status'] = opts.status;
  const clients = await getClients({ filter, limit: opts.limit ?? 200, skip: opts.skip, sort: { name: 1 } });
  if (!opts.amId) return clients;
  return clients.filter((client) => client.am?._id === opts.amId);
}

/**
 * Return the distinct sector names present on any client.
 * Falls back to the hardcoded SECTORS list if the query is empty.
 */
export async function getSectors(): Promise<string[]> {
  // Note: Cockpit requires `fields` to be a JSON object string, not a plain field name.
  // Simplest fix: fetch all clients (no field projection) and extract sectors client-side.
  const res = await cockpit.get<CollectionResponse<CockpitClient>>('/content/items/clients', {
    params: buildParams({ limit: 500 }),
  });
  const clients = res.data;
  const seen = new Set<string>();
  for (const c of clients) {
    if (c.sector) seen.add(c.sector);
  }
  return Array.from(seen).sort();
}

export async function upsertSector(data: Partial<CockpitSector> & { _id?: string }) {
  const res = await cockpit.post<CockpitSector>('/content/item/sectors', { data });
  return res.data;
}

export async function getClient(id: string): Promise<CockpitClient | null> {
  const res = await cockpit.get<CollectionResponse<CockpitClient>>('/content/items/clients', {
    params: buildParams({ filter: { _id: id }, limit: 1, populate: 1 }),
  });
  return res.data[0] ?? null;
}

export async function upsertClient(data: Partial<CockpitClient> & { _id?: string }) {
  const res = await cockpit.post<CockpitClient>('/content/item/clients', { data });
  return res.data;
}

// ─── Contacts ──────────────────────────────────────────────────────────────

export async function getContacts(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitContact>>('/content/items/contacts', {
    params: buildParams({ ...options, populate: 1 }),
  });
  return res.data;
}

export async function getContactsByClient(clientId: string) {
  return getContacts({ filter: { 'client._id': clientId } });
}

export async function upsertContact(data: Partial<CockpitContact> & { _id?: string }) {
  const res = await cockpit.post<CockpitContact>('/content/item/contacts', { data });
  return res.data;
}

// ─── Agenda Items ─────────────────────────────────────────────────────────

export async function upsertAgendaItem(data: Partial<CockpitAgendaItem> & { _id?: string }) {
  const res = await cockpit.post<CockpitAgendaItem>('/content/item/agendaitems', { data });
  return res.data;
}

// ─── Visits ────────────────────────────────────────────────────────────────

export async function getVisits(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  fields?: string;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitVisit>>('/content/items/visits', {
    // Cockpit currently returns HTTP 500 for visit collection sort params, so we sort locally.
    params: buildParams({
      filter: options?.filter,
      limit: options?.limit ?? 20,
      skip: options?.skip,
      populate: 1,
      fields: options?.fields,
    }),
  });
  return sortItems(res.data, options?.sort);
}

export async function getVisitsByAm(amId: string, options?: {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const visits = await getVisits({
    limit: options?.limit ?? 200,
    skip: options?.skip,
    sort: options?.sort ?? { date: -1, start_time: 1 },
  });

  return visits.filter((visit) => {
    if (visit.assigned_am?._id !== amId) return false;
    if (options?.date && visit.date !== options.date) return false;
    if (options?.dateFrom && (!visit.date || visit.date < options.dateFrom)) return false;
    if (options?.dateTo && (!visit.date || visit.date > options.dateTo)) return false;
    return true;
  });
}

export async function getVisit(id: string): Promise<CockpitVisit | null> {
  const res = await cockpit.get<CollectionResponse<CockpitVisit>>('/content/items/visits', {
    params: buildParams({ filter: { _id: id }, limit: 1, populate: 1 }),
  });
  return res.data[0] ?? null;
}

export async function upsertVisit(data: Partial<CockpitVisit> & { _id?: string }) {
  const res = await cockpit.post<CockpitVisit>('/content/item/visits', { data });
  return res.data;
}

export async function checkInVisit(
  id: string,
  coords: { lat: number; lng: number },
  timestamp: string,
) {
  return upsertVisit({
    _id: id,
    status: 'in_progress',
    checkin_at: timestamp,
    checkin_lat: coords.lat,
    checkin_lng: coords.lng,
  });
}

export async function checkOutVisit(id: string, timestamp: string) {
  return upsertVisit({
    _id: id,
    status: 'completed',
    checkout_at: timestamp,
  });
}

// ─── Visit Outcomes ────────────────────────────────────────────────────────

// Note: Cockpit strips underscores — collection is "visitoutcomes" not "visit_outcomes"

export async function getVisitOutcomes(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitVisitOutcome>>(
    '/content/items/visitoutcomes',
    { params: buildParams({ ...options, populate: 1 }) },
  );
  return res.data;
}

export async function getOutcomeByVisit(visitId: string): Promise<CockpitVisitOutcome | null> {
  const res = await cockpit.get<CollectionResponse<CockpitVisitOutcome>>(
    '/content/items/visitoutcomes',
    { params: buildParams({ filter: { 'visit._id': visitId }, limit: 1, populate: 1 }) },
  );
  return res.data[0] ?? null;
}

export async function upsertVisitOutcome(data: Partial<CockpitVisitOutcome> & { _id?: string }) {
  const res = await cockpit.post<CockpitVisitOutcome>('/content/item/visitoutcomes', { data });
  return res.data;
}

// ─── Financial Years ──────────────────────────────────────────────────────

export async function getFinancialYears(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitFinancialYear>>(
    '/content/items/financialyears',
    { params: buildParams({ ...options }) },
  );
  return sortItems(res.data, { year: -1 });
}

export async function upsertFinancialYear(
  data: Partial<CockpitFinancialYear> & { _id?: string },
) {
  const res = await cockpit.post<CockpitFinancialYear>('/content/item/financialyears', { data });
  return res.data;
}

// ─── Financial Quarters ───────────────────────────────────────────────────

export async function getFinancialQuarters(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitFinancialQuarter>>(
    '/content/items/financialquarters',
    { params: buildParams({ ...options, populate: 1 }) },
  );
  return sortItems(res.data, { quarter_number: 1 });
}

export async function upsertFinancialQuarter(
  data: Partial<CockpitFinancialQuarter> & { _id?: string },
) {
  const res = await cockpit.post<CockpitFinancialQuarter>('/content/item/financialquarters', {
    data,
  });
  return res.data;
}

export default cockpit;
