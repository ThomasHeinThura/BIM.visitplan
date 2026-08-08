# Slice 1 — Visits, Clients, Dashboard, Pipeline and Leads

**Status**: ✅ Complete — 2026-08-08
**Branches**: `bim-crm@feature/mobile-api` · `BIM.visitplan@feature/crm-backed-mobile-app`

Slice 0 proved the vertical worked but shipped one screen, so the app showed only a
login. This slice is the domain surface: six working screens on live CRM data.

Scope grew mid-slice — pipeline and lead management were requested after the slice
started and were folded in rather than deferred, because a lead is a deal and the deal
endpoints were already being written.

---

## Delivered

### bim-crm — 17 endpoints

| Domain | Endpoints |
| --- | --- |
| Dashboard | `GET /dashboard` |
| Visits | index · store · show · update · `PATCH /{id}/status` · destroy |
| Clients | index · show (workspace) · `/{id}/visit-plans` |
| Deals | index · store · show · update · `PATCH /{id}/stage` · `GET /pipeline` |
| Reference | `GET /sectors` |

### BIM.visitplan — six screens

Dashboard · Visits · Clients (+ workspace) · Pipeline board · Leads · Add/edit lead.
Bottom navigation is filtered by the permission list from `/api/auth/me`.

---

## Design decisions

**A lead is a deal, not a new entity.** It is a deal sitting on a stage whose `type` is
`lead`. Filtering by `stage_type` rather than a stage id is what makes a lead list work
for a user who spans sectors — each sector's lead stage is a different row. Creating a
deal without a stage lands it on the sector's lead stage, so "add a lead" needs no
conversion step and no separate table.

**The board returns every stage, including empty ones.** A column omitted because it
had no deals is worse than an empty column: a deal moved into it appears to vanish.

**Moving a card is a tap, not a drag.** Drag-and-drop across a horizontally scrolling
container on a phone triggers by accident and moves the wrong card. Tapping opens a
stage picker — slower per move, never wrong.

**Colour keys off stage `type`, text off stage `name`.** `type` is a fixed enum;
`name` is per-sector configuration an administrator can rename. Keying colour to the
name would silently fall back to a default the first time someone renames a stage.

**`can` blocks on resources.** Each resource reports what the viewer may do so the UI
hides actions that would 403. Presentation only — every request is still authorized
server-side.

---

## Defects found and fixed

| # | Defect | Why it mattered |
| --- | --- | --- |
| 1 | Search filters had an ungrouped `orWhere` | `(visible AND title LIKE) OR (client LIKE)` escapes the row-level scope and returns every sector's matches. Now grouped in a closure, with a leakage test per endpoint. |
| 2 | Stage moves were not validated against the deal's sector | A deal parked on a foreign sector's stage vanishes from every board including its own. |
| 3 | `visit_plans.contact_id` / `sector_id` accepted as nullable | They are NOT NULL columns, so the failure surfaced as a database constraint violation — a 500 where the client deserves a 422 naming the field. |
| 4 | `currency` accepted on deal writes | It is a real column but absent from `Deal::$fillable`, so anything sent was silently discarded. Removed from the writable set; the omission is now documented on the model. |
| 5 | Counts computed off unscoped queries | Stage totals and dashboard tiles would disclose the size of other reps' pipelines even while the rows stayed hidden. All now derive from the scoped query. |
| 6 | Add button labelled "Lead" | Ambiguous next to deal rows whose stage badge also reads "Lead". Found by clicking the wrong element during browser verification. Now "Add lead". |

Model annotations (`User`, `Client`, `Contact`, `Sector`, `VisitPlan`, `Deal`,
`PipelineStage`) were missing, so static analysis inferred model properties as plain
strings. Adding them took the project-wide PHPStan count from **204 → 179**; 25 of
those were pre-existing errors elsewhere, not introduced by this work.

---

## Verification

- **Backend**: 498/498 Pest, up from 465. 28 new tests — each domain covers its 403
  path and a scope-leakage case.
- **Static analysis**: PHPStan clean on all new code; project total 204 → 179. Pint clean.
- **Mobile**: `tsc --noEmit` clean.
- **End to end**, driven in a real browser at 390×844 against a local bim-crm with
  seeded data: signed in, dashboard rendered 1 today / 9 planned / 0 overdue / 2 done
  with real visits; pipeline board showed the Banking sector's stage columns with deal
  counts and totals; a lead created through the form appeared in the list immediately.

Two remaining PHPStan errors sit in `SourceRegistration::getIsExpiredAttribute()`.
They are pre-existing, in a file this slice does not touch, and the code is correct at
runtime — the cast is to the enum and larastan is inferring from the column type.

---

## Traceability

| Story | Status |
| --- | --- |
| US-5 open on today's visits | ✅ Dashboard is the landing tab |
| US-10 sector-scoped visit review | ✅ Filters + leakage tests |
| US-11 client workspace in one request | ✅ Contacts and counts inline |
| US-12 call/email a contact | ✅ Tap-to-call, tap-to-email |
| US-13 directions to a client | ✅ Opens native maps |
| US-14 see deals and move a stage | ✅ Board + stage picker |
| US-20 empty screens explain themselves | ✅ Dedicated empty and no-access states |

Not in this slice: check-in/check-out, visit outcomes and agenda items (the three
entities bim-crm lacks, needing migrations); deal comments, attachments and activity;
documents; reports.

---

## Carried forward

| # | Item | Note |
| --- | --- | --- |
| 1 | **Navigation is still state-based** | Holds at six screens, not at the full count. Expo Router is decided (D-1) and remains its own change, so a navigation rewrite is never mixed into a data-layer commit. |
| 2 | **react-query is installed but unused** | `useResource` covers loading/error/forbidden and request cancellation for now. Adopting react-query needs a provider and a cache-persistence decision, which belong with the navigation change. |
| 3 | **Entra sign-in still unexercised** | Implemented and unit-tested, but no mobile app registration exists. The local-only dev-token endpoint stands in and must be deleted once the real flow works. |
| 4 | **Visit detail screen** | Tapping a visit currently moves to the list. The real detail screen arrives with check-in/out and outcomes. |
| 5 | **No mobile tests yet** | Q8=B put the harness in Slice 0, where it was scoped to the auth flow. These screens are covered by browser verification, not unit tests. |
