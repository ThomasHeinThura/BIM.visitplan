import type { AuthUser, LookupItem, VisitPlan, VisitPlanDraft, VisitPlanPermissions } from '../types';
import { ApiError } from '../lib/api';

export const STATUS_OPTIONS = [
  { id: 0, label: 'Not Started' },
  { id: 1, label: 'In Progress' },
  { id: 2, label: 'Completed' },
  { id: 3, label: 'Cancelled' },
];

export const LOCATION_OPTIONS = [
  { id: 1, label: 'Online' },
  { id: 2, label: 'In-person' },
  { id: 3, label: 'Others' },
];

export const TIME_OPTIONS = buildTimeOptions();

export function createInitialDraft(selectedDate = toIsoDate(new Date())): VisitPlanDraft {
  return {
    title: '',
    client_id: null,
    financial_year_id: null,
    financial_quarter_id: null,
    date: selectedDate,
    start_time: '09:00',
    end_time: '10:00',
    location: 1,
    location_others: '',
    status: 0,
    agenda: '',
    description: '',
    url: '',
    members: [],
  };
}

export function buildDraftFromVisitPlan(visitPlan: VisitPlan): VisitPlanDraft {
  return {
    title: visitPlan.title,
    client_id: visitPlan.client_id,
    financial_year_id: visitPlan.financial_year_id,
    financial_quarter_id: visitPlan.financial_quarter_id,
    date: visitPlan.date,
    start_time: String(visitPlan.start_time).slice(0, 5),
    end_time: String(visitPlan.end_time).slice(0, 5),
    location: visitPlan.location_id,
    location_others: visitPlan.location_others || '',
    status: visitPlan.status_id,
    agenda: visitPlan.agenda,
    description: visitPlan.description || '',
    url: visitPlan.url || '',
    members: visitPlan.members.map((member) => member.id),
  };
}

export function derivePermissions(
  user: AuthUser,
  permissions?: VisitPlanPermissions | null,
): VisitPlanPermissions {
  if (permissions) {
    return permissions;
  }

  const isTeam = user.type === 'team';

  return {
    level: isTeam ? 2 : 0,
    scope: 'own',
    can_view: isTeam,
    can_create: isTeam,
    can_edit: isTeam,
    can_delete: false,
    can_view_all: false,
  };
}

export function validateDraft(draft: VisitPlanDraft): string | null {
  if (!draft.title.trim()) {
    return 'Title is required.';
  }
  if (!draft.client_id) {
    return 'Client selection is required.';
  }
  if (!draft.financial_year_id) {
    return 'Financial year selection is required.';
  }
  if (!draft.financial_quarter_id) {
    return 'Financial quarter selection is required.';
  }
  if (!draft.date.trim()) {
    return 'Date selection is required.';
  }
  if (!draft.start_time.trim() || !draft.end_time.trim()) {
    return 'Start and end times are required.';
  }
  if (!draft.agenda.trim()) {
    return 'Agenda is required.';
  }
  if (draft.location === 3 && !draft.location_others?.trim()) {
    return 'Other location is required when location is Others.';
  }

  return null;
}

export function filterLookupItems(items: LookupItem[], query: string, limit?: number) {
  const keyword = query.trim().toLowerCase();
  const filtered = keyword
    ? items.filter((item) => `${item.label} ${item.subtitle || ''}`.toLowerCase().includes(keyword))
    : items;

  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export function findLookupLabel(items: LookupItem[], selectedId: number | null) {
  if (!selectedId) {
    return null;
  }

  return items.find((item) => item.id === selectedId)?.label || null;
}

export function mapLookupItem(
  item: Record<string, unknown>,
  kind: 'client' | 'financialYear' | 'financialQuarter' | 'team',
): LookupItem {
  if (kind === 'client') {
    return {
      id: Number(item.client_id ?? 0),
      label: String(item.client_company_name ?? item.name ?? 'Unknown client'),
      subtitle: String(item.client_status ?? ''),
    };
  }

  if (kind === 'team') {
    const name = `${String(item.first_name ?? '')} ${String(item.last_name ?? '')}`.trim();
    return {
      id: Number(item.id ?? 0),
      label: name || String(item.email ?? 'Unknown team member'),
      subtitle: String((item.role as { role_name?: string } | undefined)?.role_name ?? item.email ?? ''),
    };
  }

  return {
    id: Number(item.id ?? 0),
    label: String(item.name ?? 'Unknown'),
  };
}

export function formatDateForApi(isoDate: string) {
  if (/^\d{2}-\d{2}-\d{4}$/.test(isoDate)) {
    return isoDate;
  }

  const [year, month, day] = isoDate.split('-');
  return `${month}-${day}-${year}`;
}

export function formatReadableDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function sameIsoDate(left: string, right: string) {
  return left === right;
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function buildCalendarDays(currentMonth: Date, visitPlans: VisitPlan[]) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isoDate = toIsoDate(date);

    return {
      isoDate,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      items: visitPlans.filter((item) => item.date === isoDate),
    };
  });
}

export function formatCalendarHeader(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function toFriendlyMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'The request could not be completed.';
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildTimeOptions() {
  const options: string[] = [];

  for (let hour = 7; hour <= 20; hour += 1) {
    for (const minute of [0, 30]) {
      options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }

  return options;
}