# Delivery Plan — Vertical Slices (solo)

**Status**: ✅ APPROVED — revised 2026-08-05 for solo delivery
**Supersedes**: the 10-unit / 4-wave parallel plan (kept in `proposed-units.md` + `audit.md`)

## Why this was rewritten

The previous plan assumed a team: six bim-crm units in parallel, converging on one big mobile
integration step. **You're building this solo.** That plan's failure mode for one person is a long
period where nothing runs — six half-finished backend units and a mobile app still on Cockpit.

Same total work, restructured into **vertical slices**. Each slice cuts through both repos —
migration → API → Pest test → mobile screens → RNTL test → delete that domain's Cockpit code — and
**leaves the app running with that domain live on bim-crm.**

### How this stays compatible with your earlier answers

| Answer | How slices honour it |
| --- | --- |
| Q1=A **hard cutover** | No dual-backend abstraction, no feature flags, no adapter layer. `lib/cockpit.ts` simply **shrinks** as each slice deletes the functions it replaces, and is gone by Slice 7. The end state is identical to a hard cutover. |
| Q2=A **single release** | Slices are **internal** checkpoints, not releases. One shipped build: 3.0.0. 2.6.1 stays live throughout. |
| Q8=B **harness first** | Harness is in Slice 0, before any feature work — kept deliberately minimal (runner + CI + auth flow). |

The difference from Q1=B (which you rejected) is that B kept two clients permanently and shipped
incrementally. This keeps one client, ships once, and just doesn't have a dead period in the middle.

---

## Scope confirmation

All four role groups use mobile — account managers/sales execs, sector heads, management/superadmin,
consultants/employees. **So the ~35-screen scope stands; nothing was trimmed.**

Stating the size plainly: solo + every CRM feature + all four roles + harness-first + one big-bang
release is a large body of work. The slices make it *tractable and measurable* — you'll have a working
app after Slice 0 and a genuinely useful one after Slice 1 — but they don't make it smaller. If a date
appears later, Slices 4–6 (documents, reference data, reports) are the natural things to defer, since
Slices 0–3 cover the field workflow that justifies the app.

---

## Prerequisites (confirmed 2026-08-05)

**Two repos, two branches.** The mobile branch is `feature/crm-backed-mobile-app` in
**BIM.visitplan**. bim-crm is still sitting on `develop` with no branch for this work — Slice 0 needs
`feature/mobile-api` (or similar) cut from `develop` there, since API work should not land directly on
a shared branch.

**No deployed backend exists.** `uat-crm.bimats.com:10443` is the decommissioned old system and is not
in use. There is therefore **no server to develop against** — development runs the bim-crm
`docker-compose.test.yml` stack locally (marked *Working* in `FEATURE_LOG.md`, and it includes Traefik
so the proxy path is exercised). Consequences:

- `EXPO_PUBLIC_CRM_API_URL` points at the local stack. The dead `uat-crm` fallback default has been
  removed from `config.ts` so a misconfigured build fails loudly instead of hitting a dead host.
- Physical iOS/Android devices cannot reach `localhost` — plan for a LAN IP or a tunnel when testing
  US-1 on device.
- Deploying bim-crm somewhere reachable becomes a real prerequisite for TestFlight UAT, since a
  TestFlight build cannot talk to your laptop. Not needed for Slice 0, needed before release.

**iPhone only.** Applied 2026-08-05: `app.json` `supportsTablet` → `false`; `TARGETED_DEVICE_FAMILY`
→ `"1"` in both build configurations. There was **no watch target to remove** — the Xcode project
never had one. `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD` and `SUPPORTS_XR_DESIGNED_FOR_IPHONE_IPAD` were
already `NO`, and orientation is already locked to portrait. This simplifies the UX work: every layout
targets one form factor, so the responsive web workspace (P3) is the only multi-width case left.

## Slice 0 — Walking skeleton 🔴 FIRST

**Goal: log in on a real device with your `@bimgoc.com` account against bim-crm and land on an
authenticated (empty) dashboard.** Nothing else. This proves the entire vertical — Entra → API →
token → authorized request → render — before any feature depends on it.

### bim-crm

- `laravel/sanctum`; `api:` in `withRouting`; `routes/api.php`; `/api/v1` prefix
- `config/cors.php` for `api/*` — allowlisted Expo origins, never `*` with credentials
- `api` rate-limit group
- **`POST /api/auth/entra`** — accepts an **`id_token`**, validates signature against Entra's JWKS,
  plus audience / issuer / expiry / nonce; resolves or links the user by email; issues a Sanctum token.
  Isolate this in one service class (`EntraTokenVerifier`) so the mechanism can change without
  touching controllers.
- `GET /api/auth/me` — user, roles, sector(s), **flat permission list**
- `POST /api/auth/logout`, `DELETE /api/auth/tokens/{id}`, token expiry + refresh
- Base `JsonResource` conventions — `{data, meta}`, `{message, errors}`
- `Gate::before` for superadmin (CRM gap #4)
- **`SectorSeeder`** — the 9 real sectors from `clientdb.csv`, **confirmed 2026-08-05**:
  Banking · Government · Healthcare · Insurance · **MDR (Manufacturing, Distribution & Retail)** ·
  Media · Microfinance · Software · Telecom. Idempotent, added to the boot sequence alongside
  `RoleSeeder`. **Creating a Sector auto-creates its 4 fixed pipeline stages**
  (`DummyDataSeeder.php:102` — "Fixed stages are created by the application when a sector is
  created"), so this one seeder unblocks deals, visit plans, and sector-based authorization.
  Store `MDR` with its expanded name so the UI is readable; the CSV abbreviation is only an import key.
  `DummyDataSeeder`'s five invented sectors are demo data and are **not** the business list.
- Amend `ai/CONSTRAINTS.md` — permit Sanctum-after-Entra, with rationale
- OpenAPI spec generated (NFR-7)
- Pest: authed/unauthed, token revocation, expiry, invalid/expired `id_token` rejected

### mobile

- `npx expo install expo-router react-native-safe-area-context react-native-screens`
- Entry → `expo-router/entry`; `expo-router` plugin in `app.json`; **`userInterfaceStyle` →
  `"automatic"`** (currently `"light"`, which breaks dark mode natively — S10)
- `app/_layout.tsx` providers; `app/(auth)/`; `app/(app)/_layout.tsx` `<Tabs>`; `app/(modals)/`
- Move the 14 live screens to routes **unchanged** — no data-layer edits in this commit
- **Delete the 11 dead files** (~1,817 lines, `dead-code-audit.md`)
- `src/lib/crm/` — axios, interceptors, types generated from OpenAPI, query-key conventions
- `lib/auth`: keep the existing PKCE, send the resulting `id_token` to `/api/auth/entra`, store the
  Sanctum token in `expo-secure-store`
- Permission-aware `<Tabs>` gating from `/api/auth/me`
- react-query provider + **versioned** persistence key
- `src/ui/` split + `tokens.ts` extraction
- **Minimal harness**: `jest-expo`, RNTL, `npm test`, CI running `tsc --noEmit` + tests. Cover the
  auth flow only. Resist backfilling more here — it's on the critical path.

**Done when:** real device login works on iOS, Android, and web; `/api/auth/me` permissions drive the
visible tabs; `tsc --noEmit` clean; CI green.

---

## Slice 1 — Visits (highest value)

The app's actual job. Ship-worthy on its own even though we're not shipping yet.

- **Migrations**: check-in/out columns on `visit_plans`; `visit_outcomes`; `visit_agenda_items`
- API: visit-plans CRUD, `status`, `convert`, `check-in`, `check-out`, `outcome`, `agenda-items`
- Filters via `spatie/laravel-query-builder`: AM, sector, client, date range, quarter
- Pest incl. **403 when reading another sector's visit**
- Mobile routes: `visits/index`, `visits/[id]`, `visits/mine`, `(modals)/visit-create`,
  `visit-edit/[id]`, `check-in/[id]`
- `react-hook-form` + `zod` — `CreateVisitModal`'s 1,109 lines should land near 300
- FlashList + `<DataList>` wrapper (loading / empty / error / offline in one place)
- Optimistic check-in/out
- **Delete the visit functions from `lib/cockpit.ts`**

## Slice 2 — Clients, contacts, dashboard

- API: clients, contacts (incl. set-primary), client groups, `/clients/{id}` workspace aggregate,
  `/dashboard`, sectors + stages, financial years + quarters
- **Import `clientdb.csv`** — 153 real clients. ⚠️ Two CSV fields have nowhere to go: the `clients`
  table has no `account_type` (Key/Named) and no `status` (Prospect) column. Either add two columns or
  drop those fields — needs a decision. `AM` is empty in the data and there's no owner column either.
- Mobile: `clients/index`, `clients/[id]/{index,contacts,timeline,opportunities,files,notes}`,
  dashboard as landing route
- QoL: tap-to-call / tap-to-email (Q1), address → maps (Q2), recently-viewed (Q7)
- **Delete the client/sector/dashboard functions from `lib/cockpit.ts`**

## Slice 3 — Deals and sourcing

Largest net-new area. API + mobile: deals CRUD, per-sector stage moves, ownership transfer
(`deals.change-owner`), activity log, comments, attachments (camera capture — QoL Q5 — with the
IDOR-safe scoped download from `953d250` preserved), source registrations, visit→deal conversion.
Routes: `deals/{index,board,[id]/*}`, `sourcing/*`.

## Slice 4 — Documents

Per Q4=A: quotations **read + `transition` + `send` + `share-link` + `pdf` + `convert-mmk`**, no
line-item editing. Sale orders and purchase orders read + PDF; PO status patch. Binary passthrough with
`Content-Disposition`; native share (QoL Q6). Verify a large PDF over the API path — the nginx spool
fix was only exercised on web.

## Slice 5 — Reference data

Products (read + status patch), suppliers (read). Small slice; good recovery point after Slice 4.

## Slice 6 — Reports

Five CRM reports behind `reports.view` + `{slug}/export` xlsx. Mobile: one parameterised
`reports/[slug].tsx`. This is **reconciliation, not new charting** — `ReportsScreen` and
`TeamReportScreen` exist and `react-native-svg` is installed.

## Slice 7 — Erasure, UX pass, release

- **Delete `lib/cockpit.ts`** (should be near-empty by now), the 6 Cockpit scripts, all `Cockpit*`
  types, and `EXPO_PUBLIC_COCKPIT_*` from `config.ts` and `.env.example`. Keep
  `patch-rn-ios-toolchain.mjs`.
- Consistency pass C1–C6 across every screen; remaining smoothness S3, S5, S7, S8
- Remaining QoL: reminders (Q8), haptics (Q10), filter persistence (Q9)
- Web-side port: W1 pending-approval UX, W2 design tokens, W3 dark mode
- Release checklist below; version → 3.0.0

---

## Working rules for solo delivery

1. **Never combine a navigation change with a data change** in one commit. Un-bisectable otherwise.
2. **One slice at a time, finished.** A half-done slice plus a half-done next slice is the failure
   mode the team plan had.
3. **`tsc --noEmit` clean and CI green at every slice boundary.** This is the only real progress signal.
4. **Delete Cockpit code inside the slice that replaces it**, not at the end. Otherwise Slice 7
   becomes a scary 500-line deletion instead of a formality.
5. **Contract first.** Regenerate the OpenAPI spec and client types when a slice's endpoints land, so
   mobile never hand-mirrors a shape.
6. **Every endpoint gets a 403 test.** ~48 endpoints is ~48 chances to leak another sector's data.

## Release checklist (3.0.0)

- [ ] Entra login verified on device with a real `@bimgoc.com` account — iOS, Android, web
- [ ] Token expiry, refresh, and remote revocation verified on device
- [ ] Every endpoint has a passing 403 test
- [ ] Regression guards P1–P5 verified: per-page scrolling, Android status bar, responsive web layout, light/dark/system theming, iOS signing
- [ ] `tsc --noEmit` clean; CI green
- [ ] CORS verified from an Expo Web origin
- [ ] Large quotation PDF verified over the API path
- [ ] 9 sectors seeded; fixed stages auto-created; 153 clients imported
- [ ] Empty states reviewed — a fresh CRM shows explanations, not blank screens
- [ ] No Cockpit references remain: `grep -ri cockpit src app.json .env.example package.json` is empty
- [ ] **iPhone-only build verified** — no iPad layout offered; `TARGETED_DEVICE_FAMILY = "1"`; App Store listing shows iPhone only
- [ ] bim-crm deployed to a host the TestFlight build can actually reach (not localhost)
- [ ] TestFlight UAT pass before App Store submission (matching the 2.6.0 process)
- [ ] 2.6.1 remains installable until 3.0.0 is accepted

## Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| 1 | **Scope vs. one person** | Slices give working software early. Slices 4–6 are the deferrable tail if a date appears. |
| 2 | Slice 0 is a large first step (two repos, navigation migration, harness) | It is unavoidably the foundation, but its *goal* is deliberately tiny — one working login. Resist adding features to it. |
| 3 | Cross-sector data leak across ~48 endpoints | Mandatory 403 test per endpoint (rule 6) |
| 4 | Empty CRM is **non-functional** without sectors, not merely blank | `SectorSeeder` in Slice 0 — sectors auto-create their stages |
| 5 | `MDR` sector meaning unknown; `DummyDataSeeder` lists 5 different sectors | Confirm the 9-sector list before Slice 0 |
| 6 | `clientdb.csv` has `Account Type` + `Status` with no columns to hold them | Decide in Slice 2: add two columns, or drop the fields |
| 7 | Expo Router migration destabilises a working UAT build | 2.6.1 untouched on `cms-integration`; app runnable at each migration step |
| 8 | Solo review blind spots | Every slice ends with `/code-review` or `/security-review` on the diff |
