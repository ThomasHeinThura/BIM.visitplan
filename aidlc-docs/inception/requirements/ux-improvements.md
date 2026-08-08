# UX and Quality-of-Life Scope

Bounds FR-21 through FR-24. Written because "improve the UX" is unbounded otherwise — this is the
list, and anything not on it is out of scope for this workflow.

Premise from the Q9 addendum: **2.6.1 shipped successfully to UAT.** Its UX is a baseline to beat,
not a draft to replace. bim-crm becomes the source of truth for *data*; it does not become the source
of truth for *interaction design* — the mobile app is further along there.

---

## What already exists (do not rebuild)

The mobile design system in `src/components/ui.tsx` (497 lines) is more coherent than anything on the
web side:

- `Icon` set, `Card`, `Badge`, `KPICard`, `SectionHead`, `Avatar`, `FAB`, `PrimaryButton`,
  `SecondaryButton`, `FilterTab`, `VisitItem`, `SearchBar`
- Design tokens in `ThemeContext.tsx`: `radii` (sm/md/lg/xl/full), `fonts`, light and dark palettes,
  and a **three-state** theme mode (`light | dark | system`)

bim-crm's web side has `resources/js/components/ui/` plus 20 page directories, but no equivalent
token layer — its recent `AppLayout.tsx` change was navigation plumbing, not a design system.

**Direction of travel: mobile tokens are the reference.** Where the two disagree, the web app moves.

## Group 1 — Preserve (regression guards, not features)

Hard-won fixes in the shipped build. Each needs an explicit test or manual check in the release
checklist, because a full data-layer swap is exactly the kind of change that quietly breaks them.

| # | Property | Origin |
| --- | --- | --- |
| P1 | Independent per-page scrolling — client list, detail, visit, review each scroll separately | `a6439fb`, `33fffd4` |
| P2 | Android status-bar overlap fix | `5bb0103` |
| P3 | Responsive web workspace layout for review and clients | `04261d7`, `20d9bde` |
| P4 | Light/dark/system theming across every screen | `ThemeContext` |
| P5 | iOS bundle identifier, signing, and TestFlight pipeline intact | `390bcae`, `953707e` |

## Group 2 — Cross-product consistency (FR-22)

Reconcile mobile and web so they read as one product. Cheap, high perceived quality.

| # | Item | Detail |
| --- | --- | --- |
| C1 | **Status colours** | Deal stage types (`lead`/`progress`/`won`/`lost`/`custom`) and quotation states (draft/sent/accepted/rejected) must use one palette in both apps. Currently mobile invents its own `Badge` tones. |
| C2 | **Terminology** | Mobile says "visit"; the CRM says "visit plan". Mobile says "opportunity"; the CRM says "deal". Pick one vocabulary and apply it in both UIs and in API field names. |
| C3 | **Empty states** | Every list gets an explanatory empty state. Newly critical: with D6 (CRM starts clean) **every list is empty on day one** — a blank screen with no explanation is the first thing users will see. |
| C4 | **Error states** | One error presentation derived from the `{message, errors}` envelope. Field-level validation errors surface next to fields, not in a toast. |
| C5 | **Iconography** | Extend the mobile `Icon` set to cover deals, quotations, orders, products, suppliers, sourcing; mirror on web. |
| C6 | **Permission-denied state** | With row-level scopes, 403s are normal. Show "you don't have access to this" rather than a generic failure. |

## Group 3 — Mobile smoothness (FR-24)

The CRM dataset is larger than Cockpit's, and lists that felt fine will not.

| # | Item | Detail |
| --- | --- | --- |
| S1 | **Virtualized lists** | `FlatList`/`FlashList` with `keyExtractor` and stable item heights for visits, clients, deals. Required, not optional, at CRM data volumes. |
| S2 | **Skeleton loaders** | Replace spinners on dashboard, lists, and detail screens. react-query's `isPending` makes this straightforward. |
| S3 | **Optimistic writes** | Check-in/check-out, status transitions, and comments apply instantly and roll back on failure. Check-in especially — an AM standing at a client's door should not wait on a round trip. |
| S4 | **Pull-to-refresh** | Every list, wired to react-query `refetch`. |
| S5 | **Infinite scroll** | `useInfiniteQuery` against the `{data, meta}` paginator instead of fixed `per_page=50`. |
| S6 | **Offline banner** | Q7=B — a persistent, non-modal indicator when serving cached data, and writes disabled with a reason rather than silently failing. |
| S7 | **Debounced search** | `SearchBar` currently filters locally. Server-side search via `spatie/laravel-query-builder` needs debounce + in-flight cancellation. |
| S8 | **Keyboard handling** | `CreateVisitModal` is 1109 lines of form. `KeyboardAvoidingView`, correct `returnKeyType` chaining, and no field hidden behind the keyboard. |
| S9 | **Navigation** ✅ **DECIDED** | **Expo Router.** File-based routing on React Navigation: real URLs on web, deep links, native back gesture, typed params, modals as routes, per-route lazy loading. Full reasoning and route tree in `application-design/mobile-architecture.md`. |
| S10 | **`app.json` blocks dark mode** | `userInterfaceStyle: "light"` overrides the three-state theming in `ThemeContext` at the native layer. Set to `"automatic"`. One-line fix, currently makes P4 partly cosmetic. |

## Group 4 — Quality-of-life features (FR-23)

Small additions the shipped app lacks that field staff will notice. Ranked by value-to-effort.

| # | Feature | Why |
| --- | --- | --- |
| Q1 | **Tap-to-call / tap-to-email contacts** | An AM looking at a contact wants to call them. `Linking.openURL` — trivial, high value. |
| Q2 | **Address → maps** | Tap a client address to open Maps for directions to the visit. |
| Q3 | **Today-first default** | Open on today's visits. `TodayDashboard` exists; make it the landing surface. |
| Q4 | **Check-in from the visit card** | One tap from the list, no drilling into detail. |
| Q5 | **Attachment capture from camera** | Deal and source-registration attachments — photograph a document on site rather than emailing it later. |
| Q6 | **Native share for PDFs and Excel** | Quotation PDFs, report exports via the OS share sheet. |
| Q7 | **Recently viewed clients** | Small local list; AMs revisit the same handful. |
| Q8 | **Visit reminders** | Local notifications ahead of a scheduled visit. No server push needed. |
| Q9 | **Sector/quarter filter persistence** | Remember the last filter instead of resetting to default each launch. |
| Q10 | **Haptics on state changes** | Check-in, stage move, submit. Cheap and makes the app feel responsive. |

## Group 5 — Port mobile UX back to the CRM web app

Places where the mobile app is ahead and the CRM should follow.

| # | Item | Detail |
| --- | --- | --- |
| W1 | **Pending-approval screen** | Mobile explains the state; the CRM drops new SSO users into `employee` with an empty dashboard (its own gap #3). Port `PendingApprovalScreen`'s copy and framing to web. |
| W2 | **Design tokens** | Introduce the mobile `radii`/`fonts`/palette tokens into `resources/js/components/ui/`. |
| W3 | **Dark mode** | Mobile has three-state theming; the web app has none. |

## Explicitly out of scope

Full visual redesign · replacing the mobile design system · a shared cross-platform component library
(React Native Web and the Inertia React app have genuinely different constraints — shared *tokens*,
not shared *components*) · animation systems beyond the transitions in S9 · accessibility audit
(worth doing, but it is its own workflow and should not be half-done here).

## Sequencing

- **Group 1** — verified continuously; part of the release checklist.
- **Group 2** — during Units B–E, as each screen is touched. Doing it after is a second pass over the same files.
- **Group 3** — S1, S2, S4, S6 belong in Unit D's data-layer foundation, where they are nearly free. S3, S5, S7, S8 land per-screen. S9 must be decided **before** the 21 new screens, not after.
- **Group 4** — after the cutover works end-to-end. These are additive and individually revertible.
- **Group 5** — a bim-crm-side unit, independent of the mobile critical path.
