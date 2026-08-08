# Dead Code Audit — answers Q9 "what is duplicate???"

Generated 2026-08-05. Method: reachability sweep from the two entry points (`index.ts` → `App.tsx`)
across `src/`, resolving who imports each module.

## The short answer

`App.tsx` is **355 lines** and imports **14 components**. The repo contains **27**. The other 13 are
mostly an **older generation of visit UI that nothing imports** — it is on disk only because
`cms-integration` is a strict superset of `main`, so `main`'s pre-redesign screens came along for the
ride while `App.tsx` was rewritten to use the new ones.

Nothing is "duplicated" in the sense of two live code paths. It is **one live path plus ~1,800 lines
of unreachable code** that still typechecks, still gets bundled into dependency graphs, and still
shows up in every grep you run while working.

## What `App.tsx` actually renders

```
index.ts → App.tsx (355 lines)
  ├── LoginScreen · PendingApprovalScreen          (auth)
  ├── TodayDashboard                               (dashboard)
  ├── VisitListScreen · AmVisitListScreen          (visit lists)
  ├── CreateVisitModal · EditVisitModal · VisitDetailModal   (visit CRUD)
  ├── ClientListScreen · ClientWorkspaceScreen     (clients)
  ├── ReportsScreen · TeamReportScreen             (reports)
  ├── AdminScreen                                  (admin)
  ├── ProfileScreen                                (profile)
  └── BottomNavigation                             (nav)
```

Support modules reached from there: `ui.tsx`, `ThemeContext`, `useAuth`, `lib/cockpit`, `lib/auth`,
`lib/storage`, `config`, `types`, `styles`, `utils/schedule`, `utils/meetingGroups`,
`utils/visitplan`, `Banner`.

## Unreachable modules

| File | Lines | Why it's dead |
| --- | --- | --- |
| `components/AdminQuickActions.tsx` | 446 | No importer. **Largest dead file** — superseded by `AdminScreen`. |
| `components/VisitPlanModal.tsx` | 332 | Old visit editor → `CreateVisitModal` / `EditVisitModal` |
| `components/CalendarBoard.tsx` | 245 | Old calendar → calendar now inside the visit modals |
| `components/FieldControls.tsx` | 220 | **Transitively dead** — only `VisitPlanModal` + `CalendarBoard` import it |
| `hooks/useVisits.ts` | 163 | No importer; `App.tsx` calls `lib/cockpit` directly |
| `components/TeamOverviewScreen.tsx` | 158 | No importer — superseded by `TeamReportScreen` |
| `components/VisitPlanSummary.tsx` | 70 | Old summary card |
| `components/AppHeader.tsx` | 68 | Superseded by per-screen headers |
| `components/ReviewScreen.tsx` | 60 | Old outcome capture → `VisitDetailModal` |
| `components/WorkspaceHeader.tsx` | 35 | Superseded |
| `components/MetricCard.tsx` | 20 | Superseded by tiles in `ui.tsx` |
| **Total** | **~1,817** | |

### Near-dead

- **`lib/api.ts`** — the bim-crm client. Its only live reach is `ApiError`, imported by
  `utils/visitplan.ts`. Every actual endpoint function is unreferenced. It is a **contract sketch,
  not a client** — which is why it is the right seed for `lib/crm/` rather than something to delete.
- **`Banner.tsx`** — **live, keep.** Two dead files import it, but so do `ReportsScreen` and
  `CreateVisitModal`.

## Correction to an earlier artifact

`component-inventory.md` listed `TeamOverviewScreen` as a live report screen to re-map and
`AdminQuickActions` as "re-point". Both are unreachable. `feature-parity-matrix.md`'s report row
should read `ReportsScreen` + `TeamReportScreen` only. Corrected in those files.

## Decision (Q9 = C then A)

Delete the 11 unreachable files (~1,817 lines) as the **first commit of Unit E**, before any
re-pointing work starts. Rationale:

- Every one of them imports `lib/cockpit` or `styles`, so leaving them in place means the hard
  cutover (Q1=A) has to either migrate or delete them anyway — and migrating dead code is pure waste.
- `tsc --noEmit` covers the whole repo, so dead files keep breaking the build during the model change
  from Cockpit string `_id` to integer PK.
- They inflate every search during a 21-screen build-out.

Keep `Banner.tsx`. Keep `lib/api.ts` as the seed for `lib/crm/`. Delete in one clearly-labelled
commit so it is trivially revertible.

## Caveat on method

The sweep matches module basenames as substrings, which over-reports importers for short names
(`ui`, `api`, `types`, `config`, `auth`, `styles`, `schedule`). Those were verified by reading the
actual import statements. The 11 files above have **zero** importers by any matching strategy, so the
dead list is safe. Before deleting, run `npx tsc --noEmit` and confirm the error count does not rise.
