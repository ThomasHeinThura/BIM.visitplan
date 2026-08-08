# AI-DLC State

**Project**: BIM VisitPlan — CRM-backed mobile app
**Branch**: `feature/crm-backed-mobile-app` (from `origin/cms-integration`)
**Workspace type**: Brownfield, two repositories
**AI-DLC rules version**: 1.0.1
**Started**: 2026-08-05T15:57:22Z

---

## Goal

Re-point the BIM.visitplan mobile app from Cockpit CMS to **bim-crm as the single backend**, exposing a
mobile REST API from bim-crm, and surface **all** CRM features in the mobile app.

---

## Repositories in scope

| Repo | Role | Branch |
| --- | --- | --- |
| `BIM.visitplan` | Expo / React Native client (iOS, Android, Web) | `feature/crm-backed-mobile-app` |
| `bim-crm` | Laravel 13 + Inertia backend — becomes the API provider | `develop` |

---

## Stage Progress

### Inception Phase

- [x] **Workspace Detection** — complete. Brownfield, two-repo, new workflow.
- [x] **Reverse Engineering** — 7 artifacts generated, incl. `dead-code-audit.md`.
- [x] **Requirements Analysis** — complete. All 12 questions answered. Depth: **Comprehensive**.
      Output: `requirements.md`, `ux-improvements.md`.
- [x] **User Stories** — complete, **compressed depth**. `user-stories/personas-and-stories.md` —
      4 personas, 20 stories with testable acceptance criteria. Compressed because its scope-bounding
      question resolved to "all four role groups use mobile", so nothing was trimmed.
- [x] **Application Design** — complete. `application-design/mobile-architecture.md` — 8 decisions
      (Expo Router, Entra `id_token` validation, react-query, Context-only, react-hook-form+zod,
      FlashList, evolve `ui.tsx`, feature-first folders).
- [x] **Units Generation** — complete, **revised for solo delivery**. `plans/units.md` — 8 vertical
      slices replacing the 10-unit/4-wave parallel plan.
- [x] **Workflow Planning** — **satisfied by merge.** Its output (which stages run, at what depth,
      in what sequence) is already fully specified across `requirements.md`, `units.md`, and
      `mobile-architecture.md`. Running it as a separate stage would restate settled decisions.
      Recorded here rather than producing a ceremonial document.

**INCEPTION PHASE COMPLETE.** Ready for Construction, starting at Slice 0.

### Construction Phase

- [x] **Slice 0 — Walking skeleton — COMPLETE** (2026-08-08).
      Mobile web on :8043 authenticates against bim-crm on :8000 end to end.
      465/465 bim-crm tests pass; PHPStan clean on changed files; mobile `tsc` clean.
      See `construction/slice-0/slice-0-summary.md`.
      Known gap: real Entra sign-in unexercised (no mobile app registration yet); a
      local-only, environment-gated dev-token endpoint stands in.
- [ ] Slice 1 — Visits (migrations for check-in/out, outcomes, agenda items) — next.
- [ ] Slices 2–7 — not started.
- [ ] Build and Test — not started.

### Operations Phase

- [ ] Operations — placeholder.

---

## Extension Configuration

Answered 2026-08-05.

| Extension | Enabled | Scope |
| --- | --- | --- |
| Security Baseline | ✅ **YES — blocking** | All units. Auth, tokens, authorization, transport. |
| Resiliency Baseline | ✅ **YES — blocking** | All units. AWS-cloud-specific practices marked N/A (single Docker deployment behind Traefik). |
| Property-Based Testing | ⚠️ **PARTIAL** | Pure functions + serialization round-trips only: `utils/schedule.ts`, `utils/meetingGroups.ts`, `utils/visitplan.ts`, quotation totals, `QT-YYYYMMDD-NN` numbering. Not required for UI or thin API wrappers. |

---

## Key Decisions Log

| # | Decision | Rationale | Date |
| --- | --- | --- | --- |
| 1 | Branch from `origin/cms-integration`, not `main` | `cms-integration` strictly contains `main` (merge-base = main's tip `953707e`). Zero merge required; branching from main would instead have *lost* 12 commits of UI work. | 2026-08-05 |
| 2 | bim-crm is the single system of record | User directive. Removes Cockpit CMS as a second source of truth. | 2026-08-05 |
| 3 | Reverse engineering covers both repos | The change is a contract between two codebases; documenting only one would leave the contract undefined. | 2026-08-05 |
| 4 | **Hard cutover** — delete `lib/cockpit.ts`, no dual-backend (Q1=A) | User directive. No feature-flag scaffolding. | 2026-08-05 |
| 5 | **Single release, all features** (Q2=A) | User directive. No intermediate release; waves become internal integration points. | 2026-08-05 |
| 6 | **Entra-only + Sanctum device token** (Q3=A) | Keeps SSO-only rule intact; no local password. `ai/CONSTRAINTS.md` to be amended for Sanctum. | 2026-08-05 |
| 7 | **Quotations read + actions only** (Q4=A) | Line-item editing on a phone is poor UX; totals stay server-authoritative. | 2026-08-05 |
| 8 | **Add all 3 missing entities to bim-crm** (Q5=A) | Zero feature loss for the app's core workflow. | 2026-08-05 |
| 9 | **Cockpit fully abandoned** (Q6=C, reaffirmed) | Cockpit was an experiment to prove the backend shape. No ETL, no archive, no fallback. Every trace removed. Unit J deleted from plan. | 2026-08-05 |
| 14 | **Expo Router + typed route tree** replaces `App.tsx` state switching | Delegated to me. 35+ screens, three platforms incl. web, deep links, native back gesture. See `application-design/mobile-architecture.md`. | 2026-08-05 |
| 15 | **Solo delivery → 8 vertical slices**, replacing 10 units / 4 parallel waves | User is building solo. The parallel plan's failure mode for one person is a long period with nothing running. Slices keep the app working after every step. | 2026-08-05 |
| 16 | **Entra: mobile exchanges, server validates `id_token`** | bim-crm is a confidential client, mobile is a public PKCE client — a confidential secret cannot exchange a public-client code. Also leaves the working web SSO untouched. Corrects my earlier design. | 2026-08-05 |
| 17 | **`SectorSeeder` with 9 real sectors** in the boot sequence | A clean CRM has zero sectors, so deals cannot be created and sector-based auth has nothing to scope. Creating a Sector auto-creates its 4 fixed stages, so one seeder unblocks everything. | 2026-08-05 |
| 18 | **All 4 role groups use mobile** — scope not trimmed | User confirmed. ~35 screens stands. | 2026-08-05 |
| 19 | **Workflow Planning satisfied by merge** | Its output already exists across requirements/units/architecture docs. | 2026-08-05 |
| 10 | **Read cache offline, no write queue** (Q7=B) | react-query persistence. Ambiguous offline check-in timestamps avoided. | 2026-08-05 |
| 11 | **Test harness before features** (Q8=B) | User directive. Becomes Unit 0, on the critical path. | 2026-08-05 |
| 12 | **Delete 11 dead files (~1,817 lines)** (Q9=C→A) | Audit confirmed unreachable from `App.tsx`. Becomes Unit E.0. | 2026-08-05 |
| 13 | **UX/QoL is tracked scope, not polish** (Q9 addendum) | Shipped 2.6.1 UX is a baseline to beat. Becomes Unit K + `ux-improvements.md`. | 2026-08-05 |

---

## Open Risks

| # | Risk | Impact | Status |
| --- | --- | --- | --- |
| R1 | bim-crm has **no API at all** — `routes/api.php` never existed on any branch | Blocks every mobile feature | Open — **Unit A** |
| ~~R2~~ | ~~bim-crm hardcodes SSO to `@bimgoc.com`; mobile users are `@bimats.com`~~ | — | **WITHDRAWN 2026-08-05 — claim was false.** All users are `@bimgoc.com`; Entra login works as-is. The `bimats` strings were a server hostname and a code comment, not accounts. Making the allowlist configurable remains a low-priority hardening item (FR-4). |
| R3 | `ai/CONSTRAINTS.md` excludes `laravel/sanctum` | Documented architecture forbids the token auth needed | **Resolved** — Q3=A; amend the doc in Unit A |
| R4 | Cockpit ↔ bim-crm model mismatch (string `_id` vs integer PK) | Stale persisted local state after upgrade | Open — cache versioning in **Unit D** |
| R5 | Zero automated tests in the mobile repo | No safety net for a full backend swap | **Resolved** — Q8=B; **Unit 0** |
| R6 | Existing Cockpit data | Historical visits not in the app at cutover | **Accepted** — Q6=C, no migration. See FR-13; users must be told. |
| R7 | **Big-bang delivery** — hard cutover + single release + harness-first | Nothing shippable until all of it works | Accepted — 2.6.1 stays live on `cms-integration`; trunk green per wave |
| R8 | Cross-sector data leak via a missed row-level scope across ~48 endpoints | Confidentiality breach | Open — mandatory 403 test per endpoint (NFR-11) |
| R9 | `App.tsx` switches screens on state; will not hold at 35+ screens | Costly retrofit if deferred | **Resolved** — Expo Router, migrated in Unit D.NAV before any new screens |
| R10 | Empty CRM on day one (Q6=C) | Every list blank at launch; reads as broken | Open — empty states (C3) become the first thing every user sees |
| R11 | Expo Router migration touches the entry point, `app.json`, and every screen's location | Could destabilise a working UAT build | Separate commits from data re-pointing; app runnable at each of the 7 migration steps; 2.6.1 untouched on `cms-integration` |
