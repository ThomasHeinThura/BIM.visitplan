/**
 * Shapes returned by the bim-crm API.
 *
 * Hand-written for now and kept deliberately narrow — only the fields the app
 * actually reads. bim-crm exposes an OpenAPI document at /docs/api.json (Scramble),
 * so these should be generated from it once the endpoint surface settles; until then
 * a small hand-written set is easier to keep honest than a large generated one.
 */

export type Paginated<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type SectorSummary = {
  id: number;
  name: string;
  color: string | null;
};

export type VisitStatusValue = 'planned' | 'completed' | 'cancelled';

export type VisitPlan = {
  id: number;
  title: string;
  scheduled_at: string;
  status: {
    value: VisitStatusValue;
    /** Server-supplied wording — never re-derive it client-side. */
    label: string;
  };
  participants: string;
  notes: string | null;
  client?: { id: number; name: string };
  contact?: { id: number; name: string };
  sector?: SectorSummary;
  owner?: { id: number; name: string };
  can: {
    update: boolean;
    delete: boolean;
  };
  created_at: string | null;
  updated_at: string | null;
};

export type Contact = {
  id: number;
  name: string;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
};

export type Client = {
  id: number;
  name: string;
  industry: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  sector?: SectorSummary;
  contacts?: Contact[];
  counts: {
    contacts?: number;
    deals?: number;
    visit_plans?: number;
  };
  can: { update: boolean };
  created_at: string | null;
};

export type Dashboard = {
  user: { name: string; roles: string[] };
  visit_counts: {
    today: number;
    planned: number;
    completed_this_month: number;
    overdue: number;
  };
  client_count: number;
  todays_visits: VisitPlan[];
  upcoming_visits: VisitPlan[];
  /**
   * Distinguishes "you have no visits" from "you cannot see visits". With a freshly
   * seeded CRM both produce an empty list, and telling a user their day is clear when
   * the app simply cannot see it is worse than showing nothing.
   */
  can: {
    view_visits: boolean;
    view_clients: boolean;
    create_visits: boolean;
  };
};

// ─── Deals / pipeline ────────────────────────────────────────────────────────

/**
 * There is no separate lead entity: a lead is a deal on a stage whose type is
 * `lead`. Behaviour keys off `type` (a fixed enum) while the UI displays `name`,
 * which is per-sector configuration and can be renamed by an administrator.
 */
export type StageTypeValue = 'lead' | 'progress' | 'won' | 'lost' | 'custom';

export type StageSummary = {
  id: number;
  name: string;
  type: StageTypeValue;
  order: number;
  color: string | null;
};

export type Deal = {
  id: number;
  title: string;
  /** String, not number — decimal(15,2) does not survive a JSON double intact. */
  value: string | null;
  currency: string | null;
  is_paused: boolean;
  ended_at: string | null;
  notes: string | null;
  stage?: StageSummary;
  sector?: SectorSummary;
  client?: { id: number; name: string } | null;
  contact?: { id: number; name: string; phone: string | null; email: string | null } | null;
  owner?: { id: number; name: string };
  can: {
    update: boolean;
    delete: boolean;
    change_owner: boolean;
  };
  created_at: string | null;
  updated_at: string | null;
};

export type PipelineColumn = StageSummary & {
  deal_count: number;
  total_value: string;
  deals: Deal[];
};

export type Pipeline = {
  sector: SectorSummary | null;
  stages: PipelineColumn[];
};
