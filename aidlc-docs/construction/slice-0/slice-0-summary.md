# Slice 0 — Walking Skeleton — COMPLETE

**Completed**: 2026-08-08
**Branches**: `bim-crm` → `feature/mobile-api` · `BIM.visitplan` → `feature/crm-backed-mobile-app`

## Definition of done (from `plans/units.md`)

> Sign in on a real device and land on an authenticated (empty) dashboard. This proves the
> entire vertical — Entra → API → token → authorized request → render.

**Met**, with one documented substitution: real Entra sign-in cannot be exercised because the
mobile app registration does not exist yet, so a local-only dev-token path stands in. See
"Known gap" below.

## Verified end to end

```
mobile web (Expo, :8043)  ──POST /api/auth/dev-token/{role}──>  bim-crm (:8000)
                          <──── Sanctum token + user + 33 perms ────
                          ──GET /api/auth/me  (Bearer) ────────>
                          <──── 200, roles + permissions + sector ──
                          ──POST /api/auth/logout ────────────>
                          ──GET /api/auth/me  (revoked token) ─>  401
```

CORS verified from origin `http://localhost:8043`, allowlisted rather than `*`.

## Delivered — bim-crm

| Area | Detail |
| --- | --- |
| Packages | `laravel/sanctum` ^4.3, `firebase/php-jwt` ^7.1 |
| Routing | `routes/api.php`, `api:` wired in `bootstrap/app.php`, `/api/v1` prefix reserved |
| Auth | `POST /api/auth/entra`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/tokens`, `DELETE /api/auth/tokens/{id}` |
| Verification | `EntraTokenVerifier` — JWKS signature, `aud`/`iss`/`exp`/nonce, cached JWKS with TTL, single bounded refetch on rotation, fail-closed when unconfigured |
| Shared identity | `EntraUserResolver` — account linking, domain allowlist, deactivated/removed checks. **Web SSO now routes through it too**, so the two flows cannot drift |
| Config | `config/cors.php` (allowlisted origins), `services.entra.*`, token TTL (default 14 days) |
| Rate limits | `auth` 10/min per IP (unauthenticated), `api` 120/min per user |
| Reference data | `SectorSeeder` — the 9 real sectors, on the boot sequence. Creating a Sector auto-creates its 4 fixed stages, so this alone makes deals creatable |
| Contract | OpenAPI served at `/docs/api.json` (Scramble was already installed and already configured for `api` routes) |

## Delivered — BIM.visitplan

| Area | Detail |
| --- | --- |
| `src/lib/crm/client.ts` | axios-free fetch client, `{data, meta}` / `{message, errors}` envelopes, typed `CrmApiError` with `isForbidden` / `isUnauthenticated` / `isNetworkError`, auto-clears session on 401 |
| `src/lib/crm/session.ts` | Token in `expo-secure-store` (Keychain/Keystore); documented `localStorage` fallback on web only |
| `src/lib/crm/auth.ts` | `signInWithEntra`, `signInWithDevRole`, `fetchMe`, `signOut`, `isPendingApproval` |
| `src/components/CrmSignInScreen.tsx` | The skeleton screen — backend URL, sign-in, user, roles, sectors, permission list, pending-approval state |
| Entry | `App.tsx` renders the CRM screen. The Cockpit entry is preserved verbatim as `App.cockpit.tsx` because Slice 1+ re-points its 14 live screens one domain at a time |
| Config | `CRM_API_URL` from `EXPO_PUBLIC_CRM_API_URL`, **no fallback default** — the decommissioned `uat-crm.bimats.com` default was removed so a misconfigured build fails loudly |
| Platform | iPhone-only (`supportsTablet: false`, `TARGETED_DEVICE_FAMILY = "1"`). Android unchanged and still a full target. No watch target existed to remove |

## Quality gates

| Gate | Result |
| --- | --- |
| bim-crm test suite | **465 passed / 465** |
| Slice 0 API tests | 34 passed (auth, resolver, dev-token containment, seeder) |
| PHPStan on changed files | 0 errors |
| PHPStan project-wide | 197 (down from 204 — model annotations fixed 7 pre-existing) |
| Pint on changed files | clean |
| `composer audit` | no advisories (9 pre-existing cleared) |
| Mobile `tsc --noEmit` | clean |
| Expo web bundle | builds, 232 modules |

## Bugs found and fixed along the way

Each was found by a test rather than by inspection.

1. **`users.entra_id` was NOT NULL.** `create_users_table` created it non-nullable; the later
   "make it nullable" migration is skipped by its own `hasColumn` guard. This made the documented
   admin-provisioning path (*"an account provisioned ahead of first sign-in"*) impossible — the
   insert always failed. Fixed by migration.
2. **`shouldRenderJsonWhen` dropped `expectsJson()`.** It *replaces* Laravel's default rather than
   extending it, so any non-`api/*` route returned an HTML redirect even when the caller asked for
   JSON. The Reports page fetches `/reports/{slug}` and got a 302 instead of a 422 with validation
   errors. Fixed to `is('api/*') || expectsJson()`.
3. **`company_name` on clients.** Three report services selected/read `company_name`, which is a
   **Supplier** column — clients use `name`. Visit Conversion 500'd outright.
4. **`VisitPlan::user` relation does not exist** (it is `owner`). Eager-loading it threw
   `RelationNotFoundException`.
5. **`DummyDataSeeder` invented 5 parallel sectors**, so local databases held both "Banking" and
   "Banking & Financial Services". Now calls `SectorSeeder`; local matches production.
6. **`reportStages()` collided with `SectorObserver`** — the observer already creates stages at
   orders 1–4, and the helper created a second set at the same orders, erroring every report test
   on the `(sector_id, order)` unique index.
7. **Stale tests** corrected to match deliberate product decisions: deal currency format
   (`$2,500.00`, changed in `97d7171`), the privilege-escalation guard added by the security
   hardening commit, the root route's redirect, and JSON number typing.

## A change I made and reverted

I added a `Gate::before` superadmin short-circuit, following a `FEATURE_LOG` note calling its
absence a gap. `QuotationPolicyTest` proved it wrong: the app has state-based rules that must deny
**every** role, and it asserts an accepted quotation cannot be updated even by a superadmin. The
blanket allow silently unlocked immutable accepted documents. Reverted, with the reasoning recorded
in `AppServiceProvider` so it is not "fixed" again.

## Known gap — real Entra sign-in is unexercised

`POST /api/auth/entra` is implemented and unit-tested (rejects unsigned, forged, misconfigured,
wrong-audience, wrong-issuer tokens) but has **never been run against a real Entra token**, because:

- `ENTRA_MOBILE_CLIENT_ID` is unset — the mobile app registration does not exist
- the mobile client needs a public/PKCE registration with redirect `msauth.com.bim.visitplan://auth`

Standing in for it: `POST /api/auth/dev-token/{role}`, the token twin of the web's existing
`/auth/bypass/{role}`. It 404s unless `APP_ENV` is local/testing **and** `AUTH_BYPASS_ENABLED` is
true, both enforced in the controller rather than the route so a routing change cannot lose the
guard. Four containment tests cover this. **Delete it once the Entra registration exists.**

## Before this can ship

- [ ] Create the Entra mobile app registration; set `ENTRA_MOBILE_CLIENT_ID`; exercise US-1 for real
- [ ] Deploy bim-crm somewhere a TestFlight build can reach — it cannot talk to a laptop
- [ ] Rotate `AZURE_CLIENT_SECRET` (the `.env` comment already flags it as exposed)

## Next — Slice 1 (Visits)

Migrations for check-in/out, `visit_outcomes`, `visit_agenda_items`; the visit API with a
mandatory 403 test per endpoint; mobile visit routes; then delete the visit functions from
`lib/cockpit.ts`.
