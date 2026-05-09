import axios from 'axios';
import { COCKPIT_API_URL, COCKPIT_API_TOKEN } from '../config';
import type {
  CockpitUser,
  CockpitClient,
  CockpitContact,
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
    params: buildParams({ ...options, populate: 1 }),
  });
  return res.data;
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
  if (opts.amId) filter['am._id'] = opts.amId;
  return getClients({ filter, limit: opts.limit ?? 200, skip: opts.skip, sort: { name: 1 } });
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

// ─── Visits ────────────────────────────────────────────────────────────────

export async function getVisits(options?: {
  filter?: FilterRecord;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  fields?: string;
}) {
  const res = await cockpit.get<CollectionResponse<CockpitVisit>>('/content/items/visits', {
    params: buildParams({ limit: 20, sort: { date: -1 }, ...options, populate: 1 }),
  });
  return res.data;
}

export async function getVisitsByAm(amId: string, options?: { limit?: number; skip?: number }) {
  return getVisits({
    filter: { 'assigned_am._id': amId },
    ...options,
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
    { params: buildParams({ ...options, sort: { year: -1 } }) },
  );
  return res.data;
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
    { params: buildParams({ ...options, sort: { quarter_number: 1 }, populate: 1 }) },
  );
  return res.data;
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
