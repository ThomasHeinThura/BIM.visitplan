# Requirements

**Stage**: Requirements Analysis — Comprehensive depth
**Status**: ✅ APPROVED — derived from answered questions, 2026-08-05
**Source**: `requirement-verification-questions.md` (all 12 answered)

---

## Vision

Make **bim-crm the single system of record** and BIM.visitplan a full-featured mobile client of it.
Cockpit CMS is retired. Every bim-crm capability that makes sense on a phone is available on the
phone, and the mobile experience is better after the migration than the shipped 2.6.1 build — not
merely equivalent.

## Confirmed decisions

| Ref | Decision | Consequence |
| --- | --- | --- |
| D1 | **Hard cutover** (Q1=A) | `lib/cockpit.ts` is deleted, not wrapped. One CRM-only release. No dual-backend scaffolding, no feature flags per domain. |
| D2 | **Single release, all features** (Q2=A) | All ~48 endpoints and all mobile surfaces ship together. No intermediate release. |
| D3 | **Entra-only + Sanctum device token** (Q3=A) | No local password path. `POST /api/auth/login` from the old `api.ts` sketch is **not** implemented. `ai/CONSTRAINTS.md` amended to permit Sanctum-after-Entra. |
| D4 | **Quotations read-only + actions** (Q4=A) | Read, status transitions, send, share-link, PDF, MMK convert. **No line-item editing on mobile.** Totals and numbering stay server-authoritative. |
| D5 | **Add all three missing entities** (Q5=A) | bim-crm gains check-in/out columns, `visit_outcomes`, `visit_agenda_items`. Zero feature loss. |
| D6 | **Cockpit fully abandoned** (Q6=C, reaffirmed) | No ETL, **no archive, no read-only fallback**. Cockpit was an experiment to prove the backend shape; its data has no ongoing value. Every trace goes: `lib/cockpit.ts`, the 6 Cockpit scripts, `Cockpit*` types, and the `EXPO_PUBLIC_COCKPIT_*` env vars. |
| D7 | **Read cache offline** (Q7=B) | react-query persistence for viewing. Writes require connectivity with clear UI state. No write queue. |
| D8 | **Full test harness first** (Q8=B) | Mobile test infrastructure is built and critical existing screens backfilled **before** feature work. Blocks the critical path by design. |
| D9 | **Delete dead code, then improve UX** (Q9=C→A + addendum) | 11 unreachable files (~1,817 lines) deleted first. Then UI/UX quality-of-life work as first-class scope, not polish. |

## Extension configuration

| Extension | Status | Scope |
| --- | --- | --- |
| Security Baseline | **ENFORCED** — blocking | All units. Auth, token handling, authorization, transport. |
| Resiliency Baseline | **ENFORCED** — blocking | All units. AWS-cloud-specific practices marked N/A (single Docker deployment behind Traefik). |
| Property-Based Testing | **PARTIAL** | Pure functions and serialization round-trips only: `utils/schedule.ts`, `utils/meetingGroups.ts`, `utils/visitplan.ts`, quotation total recalculation, `QT-YYYYMMDD-NN` numbering sequence. Not required for UI or thin API wrappers. |

## Functional requirements

### Authentication and authorization

- **FR-1** Users authenticate **only** via Microsoft Entra ID. Mobile performs the full PKCE exchange itself (already built in `lib/auth.ts`) and posts the resulting **`id_token`** to `POST /api/auth/entra`. bim-crm validates it — signature against Entra's JWKS, plus `aud`/`iss`/`exp`/nonce — resolves the user on the verified email claim, and issues a Sanctum device token. **Revised 2026-08-05**: the earlier design (mobile posts the auth code, server exchanges it) was wrong — bim-crm is a confidential client, mobile is a public PKCE client. See D-1b in `application-design/mobile-architecture.md`.
- **FR-2** Tokens are stored in `expo-secure-store` (Keychain/Keystore). Never AsyncStorage.
- **FR-3** Tokens expire. Refresh is supported; refresh failure logs the user out. A lost device can be revoked server-side.
- **FR-4** ~~The Entra email-domain allowlist blocks mobile login.~~ **CORRECTED 2026-08-05 — not a blocker.** `MicrosoftController.php:35` does hardcode `@bimgoc.com`, but all users are on `@bimgoc.com`, so Entra login works as-is. The earlier claim that mobile users are `@bimats.com` was wrong: the only `bimats` references in this repo are a server hostname (`uat-crm.bimats.com:10443`, `config.ts:44`) and a doc comment (`auth.ts:66`) — neither is a user account. bim-crm's `FEATURE_LOG.md` gap #2 makes the same inference and is likewise unverified.
  **Residual (low priority, not blocking):** making the allowlist configurable is still worth doing before any guest, contractor, or second-tenant account needs access. Not on the critical path.
- **FR-5** `GET /api/auth/me` returns user, roles, sector, and a **flat permission list**. Mobile gates navigation and controls on it, mirroring the web sidebar.
- **FR-6** Every endpoint enforces existing policies and `visibleTo`/`forUser` row-level scopes. An endpoint returning unscoped rows is a defect, not a performance choice.
- **FR-7** New users without a role see an explanatory pending state, not an empty dashboard. Mobile's `PendingApprovalScreen` is the model; **port this UX to the CRM web app**, which currently drops new SSO users into `employee` silently (its gap #3).

### Visit management

- **FR-8** Full visit CRUD, status transitions, and visit→deal conversion.
- **FR-9** Check-in and check-out with server-recorded timestamps.
- **FR-10** Visit outcome records — what happened, next step.
- **FR-11** Agenda items per visit.
- **FR-12** Visit lists filterable by AM, sector, client, date range, and financial quarter.
- **FR-13** **Consequence of D6:** the CRM starts empty — no historical visits, and no Cockpit archive to fall back on. Reports have no prior-period baseline until data accumulates. Accepted: Cockpit was a backend experiment, not production history. The practical impact is on **empty states** (C3) rather than on data loss — every list is blank on day one and must explain itself rather than look broken.

### Pipeline, documents, reference data, reporting

- **FR-14** Clients, contacts (incl. set-primary), client groups.
- **FR-15** Deals: list, detail, per-sector configurable stages, stage moves, ownership transfer, activity log, comments, attachments (camera/file upload, scoped IDOR-safe download).
- **FR-16** Source registrations: lifecycle, status, attachments.
- **FR-17** Quotations per D4. Sale orders and purchase orders read + PDF; PO status patch.
- **FR-18** Products (read + status patch), suppliers (read), sectors and stages (read), financial years and quarters (read).
- **FR-19** Dashboard: KPI tiles, pipeline-by-stage, upcoming visits.
- **FR-20** All five CRM reports (pipeline velocity, quotation win rate, revenue forecast, sector comparison, visit conversion) behind `reports.view`, with Excel export via native share.

### Experience quality — from the Q9 addendum

- **FR-21** The shipped 2.6.1 UX is a **baseline to beat**. No interaction may regress. Specific properties to preserve: independent per-page scrolling (`a6439fb`), Android status-bar handling (`5bb0103`), responsive web workspace layout, and light/dark theming.
- **FR-22** Audit **both** UIs — mobile and bim-crm web — and reconcile terminology, iconography, status colours, and empty/error states so the two read as one product.
- **FR-23** Deliver quality-of-life improvements as tracked scope, not incidental polish. Detailed in `inception/requirements/ux-improvements.md`.
- **FR-24** Every list is expected to grow well past Cockpit's dataset. Pagination, skeleton loaders, and optimistic UI on writes are required, not optional.

## Non-functional requirements

| Ref | Requirement |
| --- | --- |
| NFR-1 | Token in Keychain/Keystore; no credential in AsyncStorage or logs |
| NFR-2 | CORS allowlisted for Expo Web origins — **not** `*` with credentials |
| NFR-3 | `api` rate-limit group; per-IP buckets correct via existing `trustProxies` |
| NFR-4 | API Resources on every response — no raw model serialization |
| NFR-5 | `{data, meta}` paginated and `{message, errors}` error envelopes, matching Laravel defaults and the existing client's expectations |
| NFR-6 | `/api/v1/` prefix from day one |
| NFR-7 | OpenAPI spec generated; client types derived, not hand-mirrored across ~48 endpoints |
| NFR-8 | Timeouts, retry with backoff, and explicit offline UI state (Resiliency baseline) |
| NFR-9 | 60fps lists; virtualized rendering for long lists |
| NFR-10 | Test harness (Jest + React Native Testing Library) exists and runs in CI before feature work — D8 |
| NFR-11 | Every API endpoint has a Pest test asserting an unauthorized role receives 403 |
| NFR-12 | PBT coverage per the partial scope above |
| NFR-13 | `tsc --noEmit` clean for new code; the 4 pre-existing CRM errors are out of scope |

## Out of scope

Offline write queue (D7) · line-item quotation editing (D4) · local password auth (D3) · Cockpit data migration (D6) · sector-stage configuration on mobile · impersonation · invitations · retiring the CRM web UI · Notion import (CRM gap #1).

## Risks introduced by these decisions

| # | Risk | Mitigation |
| --- | --- | --- |
| RQ1 | **Big-bang delivery** — D1+D2+D8 means no shippable increment until everything is done | The 2.6.1 build stays in production on `cms-integration`, untouched. Trunk stays green: internal waves still land independently even though only one release ships. |
| RQ2 | **No history at cutover** (FR-13) | Accepted — Cockpit was an experiment. Mitigation is good empty states (C3), not data retention. |
| RQ3 | **D8 delays feature work** | Accepted deliberately. Harness is Unit 0 and kept small — runner, RNTL, CI, mocks, and backfill of the highest-risk existing screens only. |
| ~~RQ4~~ | ~~`@bimgoc.com` hardcode blocks every login~~ | **WITHDRAWN** — all users are `@bimgoc.com`; Entra works as-is. See FR-4. |
| RQ5 | **Cross-sector data leak** via a missed row-level scope across ~48 new endpoints | NFR-11 makes a 403 test mandatory per endpoint. |
| RQ6 | **ID model change** (Cockpit string `_id` → integer PK) breaks persisted local state | Version the local cache; clear on upgrade. |
| RQ7 | **UX scope is open-ended** (FR-21–24) | Bounded by an explicit list in `ux-improvements.md` rather than "make it nicer". |
