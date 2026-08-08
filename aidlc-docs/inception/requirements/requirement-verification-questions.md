# Requirement Verification Questions

**Stage**: Requirements Analysis (Comprehensive depth)
**Created**: 2026-08-05T15:57:22Z
**Status**: ⏸️ AWAITING YOUR ANSWERS

---

## How to answer

Fill in each `[Answer]:` tag below. Per AI-DLC conventions:

- Add a label next to the letter — `B — Sanctum after Entra exchange` is clearer than `B`.
- Include a brief justification; it gets carried forward into design.
- Combine when you mean both — `A and C`.
- Add a caveat when an option is almost right.
- Use `X` freely if nothing fits.

I will not proceed to Workflow Planning until these are answered. **Q1, Q2, Q3, Q5, and Q6 are
blocking** — the rest have safe defaults I can assume if you'd rather move fast.

---

## Extension Opt-Ins

### Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]:

> Context for this one: the app is on the App Store at 2.6.1, will carry a Keychain-stored bearer
> token for a real CRM, and the CRM's own security hardening just merged. Cockpit's current
> shared-API-token model has no per-user attribution at all, so this migration is a security
> improvement — worth locking in as blocking. **My recommendation: A.**

---

### Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]:

> Context: field staff use this on mobile networks at client sites. Retry, timeout, and offline
> behaviour are real product concerns, not theoretical ones — but the baseline is AWS
> Well-Architected-oriented and this is a single Docker deployment behind Traefik, so parts will be
> N/A. **My recommendation: A**, accepting that cloud-specific practices get marked N/A.

---

### Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints

B) Partial — enforce PBT rules only for pure functions and serialization round-trips

C) No — skip all PBT rules

X) Other (please describe after [Answer]: tag below)

[Answer]:

> Context: most of this work is thin API wrappers and UI — weak PBT candidates. But there is real
> algorithmic logic worth it: `utils/schedule.ts`, `utils/meetingGroups.ts`, quotation total
> recalculation, and the `QT-YYYYMMDD-NN` numbering sequence (which has already had two ordering
> bugs). **My recommendation: B.**

---

## Project Questions

### Question 1: Backend switchover strategy 🔴 BLOCKING
The app currently runs entirely on Cockpit CMS. How should it move to bim-crm?

A) Hard cutover — remove `lib/cockpit.ts` entirely, ship one release that is CRM-only. Simplest code, but nothing works until the whole API exists.

B) Domain-by-domain behind a flag — keep both clients, migrate one domain at a time (auth → visits → clients → deals → …), each shippable. More scaffolding; every step testable in production.

C) Parallel-write — write to both backends during a transition window, read from CRM. Safest for data, most complex, and needs Cockpit kept alive.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: B.** Roughly 48 endpoints and ~40 mobile surfaces is too much to land in one
> release, and a hard cutover means field staff lose the app until every endpoint is done. B lets
> auth+visits ship first — that alone replaces Cockpit for the app's core job.

---

### Question 2: Scope of the first release 🔴 BLOCKING
You asked for **all** features in the mobile app. The parity matrix counts ~40 surfaces and ~21
net-new screens. Do you want that as one delivery or staged?

A) Everything in one release — all ~48 endpoints and ~21 new screens before shipping.

B) Core first, then expand — Release 1: auth, visits (with check-in/out and outcomes), clients, dashboard. Release 2: deals, source registrations. Release 3: quotations, orders, products, suppliers. Release 4: full reports.

C) Read-everything, write-core — every CRM domain visible on mobile immediately, but editing only for visits and clients. Fastest route to "all features" if viewing is the real need.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: B**, and C is worth considering if what you actually want is *visibility* of
> everything rather than *editing* of everything. Full line-item quotation editing on a phone is
> poor UX regardless of effort.

---

### Question 3: Mobile authentication 🔴 BLOCKING
`bim-crm/ai/CONSTRAINTS.md` says *"No local passwords; SSO only; `laravel/sanctum` is excluded from
MVP."* The existing `lib/api.ts` posts `email` + `password`. `lib/auth.ts` already implements Entra
PKCE. Which wins?

A) Entra-only + Sanctum device token — mobile does PKCE (already built), posts the code to `POST /api/auth/entra`, gets a Sanctum token. No local password. Honours the SSO-only rule; amends only the Sanctum exclusion.

B) Sanctum with email + password — implement `/api/auth/login` as `api.ts` expects. Simplest, but introduces exactly what CONSTRAINTS.md forbids.

C) Both — Entra primary, password fallback for accounts without Entra.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: A.** The user still authenticates only through Entra; Sanctum is just a
> session mechanism for a client that cannot hold a cookie. The PKCE half already exists on this
> branch. I would amend `CONSTRAINTS.md` to permit Sanctum-after-Entra and record why.
>
> ⚠️ **Independent of your answer, this must be fixed or no mobile user can log in:**
> `MicrosoftController` hardcodes `@bimgoc.com`, and mobile users are `@bimats.com`
> (`bim-crm/FEATURE_LOG.md` gap #2). It needs to become configurable.

---

### Question 4: Quotation and order editing depth
Quotations have line items with per-item qty/price/discount/tax and server-recalculated totals.

A) Read + status transitions + PDF/share only — no line-item editing on mobile.

B) Full editing — create and edit quotations with line items on mobile.

C) Read + create-from-template — no arbitrary line-item editing, but "quote this deal" from a preset.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: A.** Line-item editing on a phone is a poor experience and totals are
> server-authoritative anyway. A gets field staff the useful 90% — see it, send it, share it.

---

### Question 5: Mobile-only entities the CRM lacks 🔴 BLOCKING
Check-in/check-out timestamps, visit outcomes, and agenda items exist in Cockpit and drive the app's
core workflow. **bim-crm has no equivalent.**

A) Add all three to bim-crm — migrations for check-in/out columns, `visit_outcomes`, `visit_agenda_items`. Full parity, no feature loss.

B) Add check-in/out and outcomes; drop agenda items — if agenda items are lightly used.

C) Map onto existing CRM concepts — outcomes become deal comments, agenda items become description text. No migrations, but lossy and awkward.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: A.** These are the app's actual job. C would make the mobile experience worse
> than it is today, which defeats the point. Three migrations is modest work.

---

### Question 6: Existing Cockpit data 🔴 BLOCKING
There is live visit history in Cockpit. What happens to it?

A) Migrate everything — one-off ETL into bim-crm. `scripts/audit-cockpit.mjs` and `migrate-cockpit-v24.mjs` show the shape is already understood.

B) Migrate reference data only (clients, sectors, users); start visit history fresh in the CRM.

C) No migration — Cockpit stays read-only as an archive; CRM starts clean.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> No recommendation — I don't know how much history matters to you or whether reports need
> continuity. Note two mechanical hazards: Cockpit uses string `_id`, bim-crm uses integer PKs, so
> any migration needs an ID map; and bim-crm's boot sequence *"seeds reference data (never dummy
> data)"*, so clients imported from `clientdb.csv` (154 rows, on this branch) must not collide with
> seeded rows.

---

### Question 7: Offline behaviour
Field staff visit sites with poor connectivity.

A) Online-only — clear error states, no offline support. (Current behaviour.)

B) Read cache — react-query persistence so recent visits/clients are viewable offline; writes require connectivity.

C) Full offline queue — writes queue locally and sync on reconnect. Needs conflict resolution.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: B.** react-query is already installed and gives most of this cheaply. C is a
> genuinely hard problem — a check-in queued offline and synced hours later has an ambiguous
> timestamp, and two AMs editing one visit need a merge policy. Not worth it in this workflow.

---

### Question 8: Test strategy
This repo has **zero tests** — no test files on any branch, no test script in `package.json`.
(Flagging because "better test" was part of the premise for choosing `cms-integration`: its UI and
tooling are better, but tests are absent in both branches.)

A) Add tests for new work only — Pest feature tests for API endpoints (bim-crm already has Pest), plus Jest/RNTL for new mobile screens.

B) Full harness first — set up mobile testing infrastructure, backfill critical existing screens, then build.

C) API tests only — Pest coverage on all ~48 endpoints; mobile stays manually tested.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: C, expanded toward A over time.** The API is where correctness matters most —
> authorization bugs there are security bugs, and bim-crm already has Pest. Every endpoint should
> have a test asserting that an unauthorized role gets 403, because ~48 new endpoints is ~48 new
> chances to leak another sector's data.

---

### Question 9: Duplicate visit UI
This branch carries two generations of visit UI: `VisitPlanModal`/`VisitPlanSummary`/`ReviewScreen`/
`CalendarBoard` (from `main`) and `CreateVisitModal`/`EditVisitModal`/`VisitDetailModal` (newer). Both
are present because `cms-integration` is a superset of `main`.

A) Keep the newer set, delete the older — cleaner, less to migrate.

B) Keep both — the older set may serve the web workspace layout.

C) Audit `App.tsx` first, then decide.

X) Other (please describe after [Answer]: tag below)

[Answer]:

> **My recommendation: C then A.** Cheap to settle now, expensive after 21 new screens land. I'd
> check what `App.tsx` actually routes to before deleting anything.

---

## What happens after you answer

1. I write `aidlc-docs/inception/requirements/requirements.md` from your answers.
2. User Stories — personas for account manager, sector head, management, admin.
3. Workflow Planning — the approved stage plan.
4. Application Design — API contract and client architecture.
5. Units Generation — the parallelisable work breakdown (draft already in
   `aidlc-docs/inception/plans/proposed-units.md` so you can see the shape now).

A draft plan is already written so you have something concrete to react to — but it is
**provisional** until these answers land. Q1, Q2, Q3, Q5, and Q6 each change the unit breakdown
materially.
