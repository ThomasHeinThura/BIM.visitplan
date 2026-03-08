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
};

export type LookupItem = {
  id: number;
  label: string;
};

export type LoginResponse = {
  token: string;
  token_type: string;
  expires_at: string;
  user: AuthUser;
  visit_plan_permissions?: VisitPlanPermissions;
};