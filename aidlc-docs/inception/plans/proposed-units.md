# Proposed Units of Work — DRAFT

**Status**: ⚠️ PROVISIONAL — depends on unanswered questions Q1, Q2, Q3, Q5, Q6.
**Created**: 2026-08-05T15:57:22Z

Written so you have something concrete to react to rather than an empty plan. Assumes my recommended
answers (Q1=B domain-by-domain, Q2=B core-first, Q3=A Entra+Sanctum, Q5=A add all three entities,
Q7=B read cache, Q8=C API tests). **Different answers reshape this.**

---

## Unit dependency graph

```
    ┌──────────────────────────────────────────────────────┐
    │  UNIT A — API Foundation            [bim-crm]        │
    │  Sanctum · CORS · throttle · /api/v1 · Resources     │
    │  /api/auth/entra · /api/auth/me · @bimgoc fix        │
    └───────────────────────┬──────────────────────────────┘
                            │  BLOCKS EVERYTHING
            ┌───────────────┼───────────────┐
            v               v               v
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ UNIT B       │ │ UNIT C       │ │ UNIT D       │
    │ Visit domain │ │ Client &     │ │ Mobile auth  │
    │ [bim-crm]    │ │ dashboard    │ │ + client core│
    │ 3 migrations │ │ [bim-crm]    │ │ [mobile]     │
    │ check-in/out │ │              │ │ react-query  │
    │ outcomes     │ │              │ │ secure-store │
    │ agenda items │ │              │ │              │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           └────────┬───────┴────────────────┘
                    v
        ┌────────────────────────────────┐
        │  UNIT E — Mobile re-point      │
        │  [mobile]  cockpit.ts → crm    │
        │  ✱ RELEASE 1 SHIPPABLE HERE ✱  │
        └───────────────┬────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┐
        v               v               v               v
  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ UNIT F   │   │ UNIT G   │   │ UNIT H   │   │ UNIT I   │
  │ Deals    │   │ Documents│   │ Reference│   │ Reports  │
  │ +sourcing│   │ quote/SO │   │ products │   │ 5 CRM    │
  │ API+UI   │   │ /PO+PDF  │   │ suppliers│   │ reports  │
  │ REL 2    │   │ REL 3    │   │ REL 3    │   │ REL 4    │
  └──────────┘   └──────────┘   └──────────┘   └──────────┘
        │               │               │               │
        └───────────────┴───────┬───────┴───────────────┘
                                v
              ┌──────────────────────────────────┐
              │  UNIT J — Data migration (Q6)    │
              │  Cockpit → bim-crm ETL           │
              │  Can start after A; ship anytime │
              └──────────────────────────────────┘
```

Text description: Unit A gates everything. B, C, and D then run in parallel (B and C are backend,
D is mobile — different repos, no contention). E converges them into a shippable Release 1. F, G, H,
and I are independent of each other and parallelise freely. J is independent after A.

---

## Units

### Unit A — API Foundation `bim-crm` 🔴 CRITICAL PATH

Nothing else can start. Deliberately thin — plumbing only, no domain endpoints.

- Install `laravel/sanctum`; add `api:` to `withRouting` in `bootstrap/app.php`; create `routes/api.php`
- `config/cors.php` for `api/*` — allowlist Expo origins, not `*` with credentials
- `api` rate-limit group (`trustProxies` already makes per-IP correct)
- `POST /api/auth/entra` — code + verifier → Entra exchange → verify `id_token` → resolve user by email → Sanctum token
- `GET /api/auth/me` — user, roles, **flat permission list**, sector
- `POST /api/auth/logout`, `DELETE /api/auth/tokens/{id}`
- Token expiry + refresh (Sanctum tokens never expire by default — a lost phone is otherwise a permanent credential)
- **Make the `@bimgoc.com` domain allowlist configurable** — blocks every `@bimats.com` login (gap #2)
- Base `JsonResource` conventions: `{data, meta}` paginated, `{message, errors}` on failure — matching what `api.ts` already expects
- Optional: `Gate::before` for superadmin (gap #4 — matters more once ~48 endpoints of permissions exist)
- Pest: authenticated vs unauthenticated, token revocation, expiry, non-allowlisted domain refused

**Risk**: Q3 could change the auth shape. Do not start before Q3 is answered.

### Unit B — Visit domain API `bim-crm`

The app's core. Includes the three entities bim-crm lacks.

- Migrations: check-in/out columns on `visit_plans`; `visit_outcomes`; `visit_agenda_items`
- Models, relations, policies consistent with the existing sector-based `VisitPlanPolicy`
- `Api\V1\VisitPlanController` over the existing controller's logic — index/store/show/update/destroy, `status`, `convert`
- `check-in`, `check-out`, `outcome`, `agenda-items` endpoints
- Resources; `spatie/laravel-query-builder` for filter/sort on index
- Pest incl. **403 for another sector's visit** (the row-level-scope regression test)

**Depends on**: A, Q5.

### Unit C — Client and dashboard API `bim-crm`

- `Api\V1` for clients, contacts (incl. set-primary), client groups
- `/api/v1/clients/{id}` workspace aggregate: timeline, contacts, opportunities, files, notes, visit-plans — matching the shape `api.ts` already expects
- `/api/v1/dashboard` — KPI tiles, pipeline-by-stage, upcoming visits
- `/api/v1/sectors`, `/{id}/stages`, `/api/v1/financial-years`, `/api/v1/financial-quarters`
- Pest incl. row-level scope assertions

**Depends on**: A. Parallel with B.

### Unit D — Mobile auth and client core `mobile`

- `src/lib/crm/` — axios instance, base URL, interceptors, typed error mapping (port the good parts of `api.ts`)
- Bearer interceptor + 401 → refresh → retry; logout on refresh failure
- Sanctum token in `expo-secure-store`; **never AsyncStorage**
- Rework `hooks/useAuth.ts`: keep the existing PKCE flow, replace Cockpit user resolution with `POST /api/auth/entra`
- Permission-aware gating so `BottomNavigation` and screens hide what the user cannot access — mirroring the web sidebar
- react-query provider + cache persistence (Q7=B)
- `LoginScreen` + `PendingApprovalScreen` against CRM state
- Consolidate `config.ts` — drop Cockpit vars, promote CRM base URL

**Depends on**: A. Parallel with B and C (different repo).

### Unit E — Mobile re-point: visits, clients, dashboard `mobile` ✱ RELEASE 1

Where it becomes real. No new screens — existing ones change data source.

- Replace `lib/cockpit.ts` calls with `lib/crm/` across `CreateVisitModal`, `EditVisitModal`, `VisitDetailModal`, `VisitListScreen`, `AmVisitListScreen`, `CalendarBoard`, `ClientListScreen`, `ClientWorkspaceScreen`, `TodayDashboard`, `ReviewScreen`, `ProfileScreen`, `AdminScreen`
- Rework `hooks/useVisits.ts` onto react-query
- Model changes: Cockpit string `_id` → integer PK; sectors string → row with stages
- **Q9**: settle the duplicate visit UI before this starts
- Delete `lib/cockpit.ts` and the 6 obsolete Cockpit scripts (keep `patch-rn-ios-toolchain.mjs`)

**Depends on**: B, C, D. **Release 1 ships here** — auth, visits, clients, dashboard on the CRM.

### Unit F — Deals and sourcing `both` — RELEASE 2

Largest net-new area: deals, per-sector stages, ownership transfer, activity log, comments,
attachments (camera upload + IDOR-safe scoped download), source registrations, visit→deal conversion.
New mobile screens: deal list, deal detail, stage board, source registration list/detail.

### Unit G — Documents `both` — RELEASE 3

Quotations (read + transitions + send + share-link + PDF + MMK per Q4), sale orders, purchase orders
(read + status). Binary PDF passthrough with `Content-Disposition`; native share sheet. Mobile never
computes totals and never generates a quotation number.

### Unit H — Reference data `both` — RELEASE 3

Products (+ status patch), suppliers. Read-mostly, small.

### Unit I — Reports `both` — RELEASE 4

The CRM's five reports behind `reports.view`; Excel export via native share. Re-map the existing
Cockpit-derived `ReportsScreen` / `TeamReportScreen` / `TeamOverviewScreen` onto them — this is
reconciliation, not new charting. `react-native-svg` is already installed.

### Unit J — Data migration `bim-crm` (Q6)

Cockpit → bim-crm ETL. ID map for string `_id` → integer PK; must not collide with boot-seeded
reference data. `audit-cockpit.mjs` and `migrate-cockpit-v24.mjs` already model the source shape.
Independent after A; sequence to suit.

---

## Parallelisation

| Wave | Units | Notes |
| --- | --- | --- |
| 1 | **A** | Blocks everything. Sequential. |
| 2 | **B, C, D** | 3-way parallel. D is a different repo — zero contention. |
| 3 | **E** | Converges. **Release 1.** |
| 4 | **F, G, H, I** | 4-way parallel. J anytime after A. |

---

## Cross-cutting risks

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | `@bimgoc.com` hardcode blocks all mobile login | Unit A, first task |
| 2 | `CONSTRAINTS.md` forbids Sanctum | Q3; amend the doc with recorded rationale |
| 3 | Row-level scope missed on an endpoint → cross-sector data leak | Every index goes through `visibleTo`/`forUser`; **mandatory 403 test per endpoint** |
| 4 | ID model change (string → int) breaks stored state | Migrate/clear cached local state on upgrade |
| 5 | Zero mobile tests | Q8 |
| 6 | 48 endpoints hand-mirrored into TS types | Generate OpenAPI, derive client types |
| 7 | Duplicate visit UI doubles migration work | Q9, settle before Unit E |
| 8 | Large PDFs previously needed an nginx spool fix | Verify over the API path, not just web |

---

## What I am NOT proposing

- **A separate API service.** The API belongs in bim-crm, sharing its models and policies. A second service would duplicate authorization — the most dangerous thing to duplicate.
- **Rewriting the mobile UI.** `cms-integration`'s design system is why this branch was chosen. Units B–E change data sources, not layouts.
- **Offline write queue.** Q7=B. Ambiguous check-in timestamps and concurrent edit merges are a project of their own.
- **Sector stage configuration on mobile.** Drag-reorder is a desktop interaction.
- **Retiring the web app.** bim-crm's web UI stays authoritative for configuration and document authoring.
