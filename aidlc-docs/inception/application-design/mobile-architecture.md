# Mobile Architecture — Decisions

**Status**: ✅ DECIDED — delegated to me 2026-08-05 ("choose best decision and align with best practice")
**Scope**: navigation, state, forms, lists, design system, folder structure, migration path

Context: `App.tsx` currently switches screens with `useState` across 14 components. The plan adds ~21
more. Your read is correct — that approach fails at 35+ screens. Decisions below, each with the
reasoning, so you can overrule any of them knowing the trade-off.

---

## D-1 — Navigation: **Expo Router** ✅

| Option | Verdict |
| --- | --- |
| Keep `useState` switching | ✗ Fails. No back gesture, no deep links, no URLs, whole-tree re-render on every navigation, unbounded `App.tsx` growth. |
| React Navigation directly | ◐ Correct and powerful, but every route wired by hand — ~35 screens of boilerplate, and web URLs need manual `linking` config. |
| **Expo Router** | ✅ **Chosen.** File-based routing *built on* React Navigation — same primitives, conventions instead of boilerplate. |

**Why it wins here specifically:**

1. **This app ships to web.** `react-native-web` is a dependency and there's a responsive web
   workspace layout (`20d9bde`, `04261d7`). Expo Router gives **real URLs on web for free** — an
   account manager can bookmark a client, share a deal link, use browser back. State-switching gives
   one URL for the entire app. This alone decides it.
2. **Deep links are already half-built.** `app.json` declares `scheme: msauth.com.bim.visitplan` with
   Android intent filters for Entra callbacks. Expo Router uses the same mechanism, so
   `visitplan://deals/42` costs nothing extra.
3. **Native back gesture and Android hardware back** work correctly per-stack. Note
   `predictiveBackGestureEnabled: false` in `app.json` — revisit once real navigation exists.
4. **Modals become routes.** `CreateVisitModal`, `EditVisitModal`, `VisitDetailModal` are currently
   boolean state in `App.tsx`. As routes they get their own URL, back behaviour, and deep link.
5. **Typed routes** — compile-time checked params, which matters when 21 new screens pass IDs around.
6. **Lazy loading per route** instead of one bundle importing all 35 screens.

**Cost, stated honestly:** this restructures the app into an `app/` directory, `index.ts` is replaced
by `expo-router/entry`, and `App.tsx` dissolves into `app/_layout.tsx`. It is a real migration — but
it is far cheaper now (14 live screens, 11 of which are being deleted anyway) than after 21 more land.
Doing it in Unit D is the whole point.

Install: `npx expo install expo-router react-native-safe-area-context react-native-screens`
(SDK-matched versions — none are currently installed).

### Route tree

```
app/
├── _layout.tsx                    root: providers (Theme, QueryClient, Auth), splash gate
├── (auth)/
│   ├── _layout.tsx                redirects to (app) if authenticated
│   ├── login.tsx
│   └── pending-approval.tsx
├── (app)/
│   ├── _layout.tsx                <Tabs> — permission-filtered, replaces BottomNavigation
│   ├── index.tsx                  Today dashboard (landing — QoL Q3)
│   ├── visits/
│   │   ├── index.tsx              list + filters
│   │   ├── [id].tsx               detail
│   │   └── mine.tsx               AM-scoped list
│   ├── clients/
│   │   ├── index.tsx
│   │   └── [id]/
│   │       ├── index.tsx          workspace summary
│   │       ├── contacts.tsx
│   │       ├── timeline.tsx
│   │       ├── opportunities.tsx
│   │       ├── files.tsx
│   │       └── notes.tsx
│   ├── deals/
│   │   ├── index.tsx              list
│   │   ├── board.tsx              stage board
│   │   └── [id]/
│   │       ├── index.tsx
│   │       ├── comments.tsx
│   │       ├── attachments.tsx
│   │       └── activity.tsx
│   ├── sourcing/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── documents/
│   │   ├── quotations/{index,[id]}.tsx
│   │   ├── sale-orders/{index,[id]}.tsx
│   │   └── purchase-orders/{index,[id]}.tsx
│   ├── reference/
│   │   ├── products.tsx
│   │   └── suppliers.tsx
│   ├── reports/
│   │   ├── index.tsx
│   │   └── [slug].tsx             5 CRM reports, one screen
│   ├── admin/{index,users}.tsx
│   └── profile.tsx
├── (modals)/
│   ├── _layout.tsx                presentation: 'modal'
│   ├── visit-create.tsx
│   ├── visit-edit/[id].tsx
│   └── check-in/[id].tsx          one-tap check-in (QoL Q4)
└── +not-found.tsx
```

`reports/[slug].tsx` is deliberate: the five CRM reports differ in data, not layout. One
parameterised screen, not five files.

---

## D-1b — Entra token flow: **mobile exchanges, server validates `id_token`** ✅

**Corrects my earlier proposal.** `architecture.md` and the first draft of this doc said mobile posts
the *authorization code* and bim-crm exchanges it. That design is wrong for this setup:

- bim-crm's `.env.example` has `AZURE_CLIENT_SECRET` — a **confidential** client registration
- mobile uses PKCE with **no secret** — a **public** client registration
- A confidential-client secret does not apply to a public-client authorization code. The server would
  need the mobile `client_id` and an exactly-matching `redirect_uri`, adding coupling for no benefit.

**Chosen flow:**

```
  Mobile                          bim-crm                      Entra ID
    │                                │                            │
    │──1. PKCE authorize ────────────────────────────────────────>│
    │<──────────────────────────────────────── 2. auth code ──────│
    │──3. exchange code + verifier ──────────────────────────────>│
    │<──────────────────────────────── 4. id_token (+ tokens) ────│
    │                                │                            │
    │──5. POST /api/auth/entra ──────>│                           │
    │      { id_token }              │  6. fetch JWKS (cached)    │
    │                                │─────────────────────────-->│
    │                                │  7. verify signature,      │
    │                                │     aud / iss / exp / nonce│
    │                                │  8. resolve user by email, │
    │                                │     load roles+permissions │
    │<─ 9. Sanctum device token ──────│                           │
    │   → expo-secure-store          │                            │
    │──10. Bearer on every call ─────>│ 11. auth:sanctum → policies│
```

Steps 1–4 **already work** in `src/lib/auth.ts` (`ENTRA_DISCOVERY`, `ENTRA_SCOPES`, `handleAuthCode`).
Only steps 5–11 are new.

Why this is the better design: no secret in the flow; the server never needs the mobile
`redirect_uri`; the web app's existing confidential-client SSO is untouched (it keeps working exactly
as it does today); and `id_token` validation is a standard, well-understood server operation with
library support.

**Implementation constraint:** isolate verification in a single `EntraTokenVerifier` service. If you
later consolidate to one Azure app registration, or move to on-behalf-of, only that class changes.

**Must-nots**, since this is the security boundary (Security Baseline is enforced/blocking):
- Never trust `id_token` claims without verifying the signature against Entra's JWKS
- Always check `aud` (the mobile client_id), `iss` (your tenant), and `exp`
- Cache JWKS with a TTL; do not fetch per request, and do not pin a single key forever
- Resolve the user on the **verified** `email`/`preferred_username` claim, never on a client-supplied
  field

## D-2 — Server state: **react-query only** ✅

Already installed. Rules:

- **Structured query keys**: `['visits', {filters}]`, `['visit', id]`, `['clients', {page}]`. Enables
  targeted invalidation instead of blunt refetching.
- **No server data in `useState`.** If it came from the API, react-query owns it.
- `useInfiniteQuery` against the `{data, meta}` paginator (S5) — not `per_page=50` and hope.
- Persistence via `AsyncStorage` for the read cache (Q7=B). **Never** for tokens — those stay in
  `expo-secure-store`.
- **Versioned cache key.** The Cockpit `_id` (string) → CRM PK (integer) change makes every cached
  entry structurally invalid. Bump the persistence key so old caches are discarded, not
  misinterpreted (risk R4).
- Optimistic mutations for check-in/out, status transitions, comments (S3).

## D-3 — Client state: **Context only, no state library** ✅

Genuine client state here is small: theme, auth session, active filters. `ThemeContext` already works.
Adding Zustand/Redux would be ceremony around ~3 values. Revisit only if a concrete need appears —
introducing a state library "for later" is how apps acquire two ways to do everything.

Filter persistence (QoL Q9) goes to AsyncStorage via the existing `lib/storage.ts`.

## D-4 — Forms: **react-hook-form + zod** ✅

`CreateVisitModal` is **1,109 lines**. That is not a complex form; it is a form without a form library
— manual `useState` per field, manual validation, manual error display.

- `react-hook-form` — uncontrolled by default, so typing doesn't re-render the tree
- `zod` schemas **derived from the OpenAPI spec** (NFR-7), so client validation cannot drift from
  server validation
- One `<FormField>` wrapper mapping the `{message, errors: {field: [...]}}` envelope to inline field
  errors (C4)

Expect `CreateVisitModal` to land near 300 lines. This also delivers S8 (keyboard handling) as a
property of the shared field component rather than 1,109 lines of ad-hoc handling.

## D-5 — Lists: **FlashList**, virtualized everywhere ✅

`@shopify/flash-list` for visits, clients, deals. Non-negotiable at CRM data volumes (S1). Paired
with skeletons (S2), pull-to-refresh (S4), infinite scroll (S5). A `<DataList>` wrapper standardises
loading, empty, error, and offline states so every list behaves identically — and with an empty CRM on
day one (FR-13), the empty state is the **first** thing every user sees.

## D-6 — Design system: **evolve `ui.tsx`, don't replace it** ✅

It is the best asset in the repo and the reason we branched from `cms-integration`. Changes:

1. **Split** the 497-line file into `src/ui/{Card,Badge,Button,KPICard,...}.tsx` with a barrel export.
2. **Extract tokens** from `ThemeContext` (`radii`, `fonts`, palettes) into `src/ui/tokens.ts` as the
   single source — then share that file's *values* with bim-crm's web UI (W2). Shared tokens, not
   shared components; RN Web and Inertia React have different constraints.
3. **Extend `Icon`** for deals, quotations, orders, products, suppliers, sourcing (C5).
4. **Status colour map** as a token, one per deal-stage type and quotation state, identical on web (C1).
5. **`userInterfaceStyle: "light"` in `app.json` contradicts the three-state theming in
   `ThemeContext`** — set it to `"automatic"` or dark mode is broken at the native layer regardless of
   what the JS does.

## D-7 — Folder structure: feature-first

```
app/                    routes only — thin, composing feature components
src/
├── ui/                 design system + tokens
├── features/
│   ├── visits/         components, hooks, schemas
│   ├── clients/  deals/  documents/  reports/  admin/
├── lib/
│   ├── crm/            api client, generated types, query keys
│   ├── auth/           PKCE + Sanctum token lifecycle
│   └── storage.ts
├── context/            ThemeContext, AuthContext
└── utils/              schedule, meetingGroups (PBT-covered)
```

Rule: `app/` files stay thin and do routing; real work lives in `src/features/`. Prevents route files
from becoming the new `App.tsx`.

---

## Migration path (Unit D → E.0)

Ordered so the app is runnable at every step:

1. Install `expo-router`, `react-native-safe-area-context`, `react-native-screens`
2. Entry point → `expo-router/entry`; add the `expo-router` plugin to `app.json`
3. `app/_layout.tsx` — port `App.tsx`'s providers (Theme, QueryClient, Auth gate)
4. `app/(auth)/` and `app/(app)/_layout.tsx` with `<Tabs>` from `BottomNavigation`'s config
5. Move the 14 live screens to routes **unchanged** — no data-layer edits in the same commit
6. Delete `App.tsx`; delete the 11 dead files (E.0)
7. `src/ui/` split + token extraction
8. Then re-point data (E.1) — against a stable navigation layer

Steps 5 and 8 stay separate commits. Changing navigation and data source together makes any breakage
un-bisectable.

## Additions to `package.json`

| Package | Why |
| --- | --- |
| `expo-router` | D-1 |
| `react-native-safe-area-context` | Expo Router peer; also fixes status-bar handling properly (P2) |
| `react-native-screens` | Expo Router peer; native screen optimisation |
| `react-hook-form` | D-4 |
| `zod` | D-4 |
| `@shopify/flash-list` | D-5 |
| `@tanstack/react-query-persist-client` | D-2 read cache |
| `expo-notifications` | QoL Q8 visit reminders |
| `expo-haptics` | QoL Q10 |
| `expo-image-picker` | QoL Q5 attachment capture |
| `expo-sharing` | QoL Q6 PDF/xlsx share |
| dev: `jest-expo`, `@testing-library/react-native`, `msw` | Unit 0 |

Install with `npx expo install` so versions match SDK 55. Keep the 8 existing security `overrides`.

## What I deliberately did not choose

- **Redux / MobX** — no state to justify them (D-3)
- **A shared RN-Web + Inertia component library** — shared tokens instead (D-6)
- **Nativewind / Tailwind RN** — `ui.tsx` + tokens already work; a second styling paradigm mid-migration is churn
- **GraphQL** — the REST contract is being designed now and matches the existing client's shape
- **Detox / Maestro E2E** — Unit 0 stays small (RQ5); add once the cutover is stable
- **Full offline write queue** — Q7=B stands. Ambiguous check-in timestamps and concurrent-edit merges are their own project.
