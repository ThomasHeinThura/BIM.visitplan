# Personas and User Stories

**Stage**: User Stories — **compressed depth**
**Status**: ✅ Complete, 2026-08-05

Run compressed deliberately. Its one job here was to bound scope by asking which roles use mobile.
**Answer: all four groups do**, so the ~35-screen scope stands unchanged and no trimming follows. The
stories below therefore exist to define *acceptance*, not to discover scope.

## Personas

### P1 — Field Account Manager (`account_manager`, `sales_exec`) — primary

On the road most of the day, on a phone, often on poor mobile data at a client site. Cares about
today's visits, checking in fast, capturing what happened before forgetting it, and looking up a
client's history in front of the client.

- **Sees**: what they own (`forUser` scope)
- **Highest-value screens**: today dashboard, visit detail, check-in, client workspace
- **Failure that hurts most**: fumbling check-in while the client watches

### P2 — Sector Head (`sector_head`)

Runs one sector. Reviews their team's visits and pipeline, often between meetings.

- **Sees**: their sector (`visibleTo` scope)
- **Highest-value**: team visit list, sector pipeline, sector-scoped reports
- Note: bim-crm attaches sector heads to sectors via `sector->users()`, so a head may hold more than one

### P3 — Management / Superadmin (`management`, `superadmin`)

Wants pipeline health and report numbers without opening a laptop. Reads far more than writes.

- **Sees**: everything
- **Highest-value**: dashboard KPIs, the five reports, cross-sector comparison
- Confirmed in scope, which is why the reports slice survives

### P4 — Consultant / Employee (`consultant`, `employee`)

Limited read access. Also the state **every new SSO user lands in** — bim-crm assigns `employee` by
default, so this persona is the first-run experience for everyone.

- **Sees**: little or nothing until a role is assigned
- **Highest-value**: an honest explanation of why the app looks empty

## Stories

Acceptance criteria are written to be testable, since Q8=B means they become the harness's targets.

### Authentication

- **US-1** *As any user*, I sign in with my `@bimgoc.com` Microsoft account and reach my dashboard
  without typing a password.
  **AC**: PKCE completes; `id_token` validated server-side; Sanctum token in `expo-secure-store`;
  works on iOS, Android, web. An invalid or expired `id_token` is rejected with a clear message.
- **US-2** *As a returning user*, I stay signed in between launches and am not asked to re-authenticate
  until my token genuinely expires.
  **AC**: token restored from secure storage; 401 triggers refresh-then-retry once; refresh failure
  logs out cleanly without a crash or a stuck spinner.
- **US-3** *As P4*, when I have no role I see an explanation of what to do, not an empty dashboard.
  **AC**: `PendingApprovalScreen` shows for a user with no meaningful permissions, naming who to
  contact. (Also ported to the CRM web app — W1.)
- **US-4** *As any user*, I only see navigation for things I can actually open.
  **AC**: tabs derived from `/api/auth/me` permissions; a 403 renders "you don't have access to this",
  never a generic error.

### Visits — P1 core

- **US-5** *As P1*, I open the app and see today's visits first. **AC**: dashboard is the landing route;
  today's visits above the fold; empty state explains how to plan one.
- **US-6** *As P1*, I check in with one tap from the visit list. **AC**: reachable without opening
  detail; timestamp recorded server-side; UI updates optimistically and rolls back on failure with the
  reason shown.
- **US-7** *As P1*, I record the outcome immediately after a visit. **AC**: outcome form reachable from
  visit detail; persists to `visit_outcomes`; validation errors appear inline on the field.
- **US-8** *As P1*, I plan a visit with agenda items. **AC**: create form validates client, date,
  window; agenda items add/remove; keyboard never covers the active field.
- **US-9** *As P1*, I convert a promising visit into a deal without re-entering anything.
  **AC**: convert action on visit detail; resulting deal pre-filled and linked; permission-gated.
- **US-10** *As P2*, I review my sector's visits by AM and quarter. **AC**: filters for AM, sector,
  date range, quarter; **a visit outside my sector is never returned** (403/absent).

### Clients — P1

- **US-11** *As P1*, I look up a client and see contacts, history, open opportunities, files, and notes
  in one place. **AC**: workspace aggregate in one request; each tab paginated; scrolls independently
  (P1 regression guard).
- **US-12** *As P1*, I call or email a contact directly from their record. **AC**: tap-to-call and
  tap-to-email via `Linking`; absent gracefully when the field is empty.
- **US-13** *As P1*, I get directions to a client's address. **AC**: address opens the native maps app.

### Pipeline, documents, reporting

- **US-14** *As P1*, I see my deals and move one to the next stage. **AC**: stages come from the deal's
  **sector**, not a fixed list; move is permission-gated and appears in the activity log.
- **US-15** *As P1*, I photograph a document on site and attach it to a deal. **AC**: camera capture;
  upload with progress; **download scoped to the parent deal** — the `953d250` IDOR fix holds on the API path.
- **US-16** *As P1*, I show a client their quotation and share the PDF. **AC**: read-only view; PDF opens
  and shares via the native sheet; **no line-item editing** (Q4=A).
- **US-17** *As P2/P3*, I read the five reports on my phone and share an export. **AC**: all five behind
  `reports.view`; xlsx via native share; a user without the permission never sees the tab.
- **US-18** *As P3*, I see pipeline health across all sectors. **AC**: dashboard KPIs and
  pipeline-by-stage unscoped for management; tiles non-navigable where permission is absent (matching
  existing web behaviour).

### Cross-cutting

- **US-19** *As P1 at a client site with bad signal*, I still see recently-loaded data and am told
  clearly when I can't save. **AC**: read cache serves lists/details; a persistent non-modal offline
  indicator; write controls disabled **with a reason**, never silently failing (Q7=B).
- **US-20** *As any user on a fresh system*, empty screens explain themselves. **AC**: every list has an
  empty state naming what's missing and the next action. Critical because a clean CRM means **every list
  is empty on day one** (FR-13).

## Traceability

| Persona | Slices |
| --- | --- |
| P1 Field AM | 0, 1, 2, 3, 4 |
| P2 Sector Head | 0, 1, 2, 3, 6 |
| P3 Management | 0, 2, 3, 6 |
| P4 Consultant/Employee | 0 (US-3, US-4) |

Every slice in `units.md` traces to at least one story. US-1 through US-4 are Slice 0's acceptance
criteria — the walking skeleton is exactly "US-1 works on three platforms".
