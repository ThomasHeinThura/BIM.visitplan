# VisitPlan Update Status

Date: 2026-05-10

## Confirmed Good

- Login screen matches the current target well enough.
- Pending approval screen matches the current target well enough.
- Today screen is working.
- Plan screen is working.
- Client list screen is working and showing client data.
- Create Visit flow is working.
- Edit Visit flow is working.
- Client profile screen is working, including save feedback, contact creation, and launching Schedule Visit cleanly.

## Updated In This Pass

- Fixed the shared Cockpit visit loading path for AM-scoped screens.
- Replaced broken nested `assigned_am._id` filtering with client-side AM filtering in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Fixed the Plan month range query so calendar screens can pull visits for the selected month in [src/components/VisitListScreen.tsx](src/components/VisitListScreen.tsx).
- Updated the query hook path used by visit data consumers in [src/hooks/useVisits.ts](src/hooks/useVisits.ts).
- Reworked the Reports screen toward the `visitplan-v2.html` layout with KPI strip, weekly chart, and recent activity in [src/components/ReportsScreen.tsx](src/components/ReportsScreen.tsx).
- Removed the temporary local Cockpit proxy path after direct Cockpit CORS checks started returning the required browser headers in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Confirmed the remaining `Clients` failure is the Cockpit `clients` collection returning `500 system error` for `sort[name]=1`, not a current CORS block.
- Made the Admin `Tools` tab functional so it can create clients, create sectors, and sync five years of financial years and quarters in [src/components/AdminScreen.tsx](src/components/AdminScreen.tsx).
- Added the sample `Owned Sectors` block to Profile in [src/components/ProfileScreen.tsx](src/components/ProfileScreen.tsx).
- Wired financial year and quarter selection into the active visit creation flow in [src/components/CreateVisitModal.tsx](src/components/CreateVisitModal.tsx).
- Added a reusable financial calendar seed script in [scripts/seed-financial-calendar.mjs](scripts/seed-financial-calendar.mjs).
- Fixed Create Visit financial year and quarter loading by removing Cockpit server-side sort params and sorting those lookups client-side in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Hardened Create Visit quarter selection so quarter chips still render when Cockpit year links are incomplete in [src/components/CreateVisitModal.tsx](src/components/CreateVisitModal.tsx).
- Reworked the Visit detail `Missed` action into visible in-modal choices for `Project Cancel` and `Reschedule Later` in [src/components/VisitDetailModal.tsx](src/components/VisitDetailModal.tsx).
- Updated the Plan screen to show the current week as a 7-day grouped schedule instead of only the selected day in [src/components/VisitListScreen.tsx](src/components/VisitListScreen.tsx).
- Fixed Reports period filters to use backward-looking ranges for `7 Days`, `30 Days`, and `3 Months`, so older visits like March 31 are included in `3 Months` instead of only appearing in `All Time` in [src/components/ReportsScreen.tsx](src/components/ReportsScreen.tsx).

## Still Needs Live Verification On Web

- Reports screen should be checked once after refreshing the web bundle to confirm the corrected `3 Months` totals now differ from `30 Days` when older visits exist.

## Validation

- TypeScript validation passed after these changes: `npm run typecheck`
- Financial calendar can now be prepared explicitly with: `npm run seed:financial-calendar`
- Direct Cockpit `curl` checks now return CORS headers for browser use; the remaining bad request is `clients?limit=500&populate=1&sort[name]=1`, which still returns `HTTP 500`.
- Today screen, Plan screen, Client screen, Create Visit flow, Edit Visit flow, and Client profile flow are now confirmed good by live user verification.