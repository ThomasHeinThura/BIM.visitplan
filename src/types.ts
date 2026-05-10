export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  type: string;
  role_id?: number | null;
  permission_id?: number | null;
  status?: string;
};

export type VisitPlanPermissions = {
  level: number;
  scope: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
};

export type VisitPlanMember = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

export type VisitPlan = {
  id: number;
  title: string;
  client_id: number;
  client_name?: string | null;
  financial_year_id: number;
  financial_year_name?: string | null;
  financial_quarter_id: number;
  financial_quarter_name?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location_id: number;
  location: string;
  location_others?: string | null;
  status_id: number;
  status: string;
  agenda: string;
  description?: string | null;
  url?: string | null;
  creator?: VisitPlanMember;
  members: VisitPlanMember[];
  permissions?: {
    can_edit: boolean;
    can_update_status: boolean;
  };
  created_at?: string | null;
  updated_at?: string | null;
};

export type VisitPlanListResponse = {
  data: VisitPlan[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    scope: string;
  };
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
};

export type VisitPlanDraft = {
  title: string;
  client_id: number | null;
  financial_year_id: number | null;
  financial_quarter_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  location: number;
  location_others?: string;
  status: number;
  agenda: string;
  description?: string;
  url?: string;
  members: number[];
};

export type LookupItem = {
  id: number;
  label: string;
  subtitle?: string;
};

export type LoginResponse = {
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
  visit_plan_permissions?: VisitPlanPermissions;
};

export type PaginationMeta = {
  resource?: string;
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  scope?: string;
};

export type PaginationLinks = {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
  links?: PaginationLinks;
};

export type ClientCounts = {
  contacts?: number;
  opportunities?: number;
  visit_plans?: number;
  tickets_open?: number;
  tickets_closed?: number;
  pending_projects?: number;
  completed_projects?: number;
};

export type ClientListItem = {
  id: number;
  name: string;
  status?: string | null;
  source?: string | null;
  sector?: string | null;
  business_unit?: string | null;
  counts: ClientCounts;
};

export type ClientWorkspacePerson = {
  id: number;
  name: string;
  email?: string | null;
  role?: string | null;
};

export type ClientContact = ClientWorkspacePerson & {
  phone?: string | null;
  position?: string | null;
  account_owner: boolean;
  last_activity_date?: string | null;
};

export type ClientTag = {
  id: number;
  title: string;
};

export type ClientWorkspaceSummary = {
  id: number;
  name: string;
  status?: string | null;
  source?: string | null;
  description?: string | null;
  technology_stack?: string | null;
  sector?: string | null;
  business_unit?: string | null;
  created_at?: string | null;
  primary_contact?: ClientContact | null;
  assigned: ClientWorkspacePerson[];
  managers: ClientWorkspacePerson[];
  tags: ClientTag[];
  counts: ClientCounts;
};

export type ClientTimelineEvent = {
  id: number;
  item?: string | null;
  item_lang?: string | null;
  content?: string | null;
  content_secondary?: string | null;
  parent_type?: string | null;
  parent_title?: string | null;
  created_at?: string | null;
  creator?: ClientWorkspacePerson | null;
};

export type ClientOpportunity = {
  id: number;
  title?: string | null;
  status?: string | null;
  progress?: number | string | null;
  probability?: number | string | null;
  renewal_status?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  financial_year?: string | null;
  financial_quarter?: string | null;
  description?: string | null;
};

export type ClientFileRecord = {
  id: number;
  title?: string | null;
  filename?: string | null;
  size?: number | string | null;
  mime?: string | null;
  created_at?: string | null;
  creator?: ClientWorkspacePerson | null;
};

export type ClientNoteRecord = {
  id: number;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  creator?: ClientWorkspacePerson | null;
};

// ─── Cockpit CMS Types ─────────────────────────────────────────────────────

// ─── Domain enums ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'management' | 'sales' | 'solution' | 'am';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ClientStatus = 'Active' | 'Hold' | 'Inactive' | 'Churned' | 'Prospect';
export type AccountType = 'Named Account' | 'Key Account';

export const CLIENT_STATUSES: ClientStatus[] = ['Active', 'Hold', 'Inactive', 'Churned', 'Prospect'];
export const ACCOUNT_TYPES: AccountType[] = ['Named Account', 'Key Account'];
export const SECTORS = [
  'Microfinance', 'MDR', 'Healthcare', 'Insurance',
  'Banking', 'Telecom', 'Media', 'Software', 'Government',
] as const;
export type SectorName = typeof SECTORS[number] | (string & {});

// ─── Cockpit CMS entities ─────────────────────────────────────────────────────

export type CockpitUser = {
  _id: string;
  name: string;
  email: string;
  ms_email?: string | null;
  ms_id?: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  seniority?: 'junior' | 'senior' | null;
  meeting_group?: 'infra' | 'es' | 'app' | 'ms' | null;
  target_usd?: number | null;
  team?: string | null;
  active: boolean;
};

export type CockpitSector = {
  _id: string;
  name: string;
  owner_am?: Pick<CockpitUser, '_id' | 'name'> | null;
  active: boolean;
};

export type CockpitAgendaItem = {
  _id: string;
  visit?: Pick<CockpitVisit, '_id' | 'title'> | null;
  title: string;
  order?: number | null;
  completed: boolean;
  created_by?: Pick<CockpitUser, '_id' | 'name'> | null;
};

export type CockpitClient = {
  _id: string;
  name: string;
  sector?: SectorName | null;
  account_type?: AccountType | null;
  status: ClientStatus;
  am?: Pick<CockpitUser, '_id' | 'name'> | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
};

export type CockpitContact = {
  _id: string;
  name: string;
  client?: Pick<CockpitClient, '_id' | 'name'> | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
};

export type CockpitVisit = {
  _id: string;
  title: string;
  client?: Pick<CockpitClient, '_id' | 'name'> | null;
  contact?: Pick<CockpitContact, '_id' | 'name'> | null;
  assigned_am?: Pick<CockpitUser, '_id' | 'name'> | null;
  financial_year?: Pick<CockpitFinancialYear, '_id' | 'name'> | null;
  financial_quarter?: Pick<CockpitFinancialQuarter, '_id' | 'name'> | null;
  participants?: Array<Pick<CockpitUser, '_id' | 'name'>> | null;
  meeting_group?: 'infra' | 'es' | 'app' | 'ms' | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  agenda?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed';
  checkin_at?: string | null;
  checkout_at?: string | null;
  checkin_lat?: number | null;
  checkin_lng?: number | null;
};

export type CockpitVisitOutcome = {
  _id: string;
  visit?: Pick<CockpitVisit, '_id' | 'title'> | null;
  result: 'positive' | 'neutral' | 'negative' | 'no_show';
  summary?: string | null;
  next_action?: string | null;
  next_visit_date?: string | null;
  attachments?: string[] | null;
  submitted_by?: Pick<CockpitUser, '_id' | 'name'> | null;
  submitted_at?: string | null;
};

export type CockpitFinancialYear = {
  _id: string;
  name: string; // e.g. "FY 2026"
  year: number; // e.g. 2026
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
};

export type CockpitFinancialQuarter = {
  _id: string;
  name: string; // e.g. "Q1 FY2026"
  year?: Pick<CockpitFinancialYear, '_id' | 'name'> | null;
  quarter_number: 1 | 2 | 3 | 4;
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
};