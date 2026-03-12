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