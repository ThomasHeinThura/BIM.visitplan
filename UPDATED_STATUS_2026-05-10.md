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

- Team Overview department and sector drilldowns now open in a centered detail modal instead of a bottom sheet, with a cleaner desktop/mobile presentation.
- `By Departments` drilldown now shows the actual visit owners and contributors behind the selected department row, including `All Departments`, with total visit counts only.
- `By Sector` drilldown now shows each client in the selected sector and the top 5 AM / Sales / Solution contributors under that client.
- Profile owned-sector picker now includes newly created sectors from the Cockpit `sectors` collection even before any client is assigned to them.
- Profile no longer shows the old senior / junior badge, and the app no longer uses the `seniority` field in its user model or update flow.
- Today schedule rows now use a compact single summary line instead of repeating the client name multiple times.
- Team Report avatar initials now use theme-aware contrast so they remain readable in dark mode.
- Changed Team Overview view controls from sort tabs into report views: `By AMs`, `By Departments`, and `By Sector` in [/Users/heinthura/Documents/lab/BIM.Application/BIM.CRM/BIM.Visitplan/src/components/TeamReportScreen.tsx](/Users/heinthura/Documents/lab/BIM.Application/BIM.CRM/BIM.Visitplan/src/components/TeamReportScreen.tsx).
- `By Departments` now aggregates quarter activity by department and shows total visits, completed visits, AM count, and pipeline totals.
- `By Sector` now aggregates quarter activity by sector and shows total visits, completed visits, client count, and pipeline totals.
- Team Overview now has live Cockpit AM rows and department/sector summaries in the same report flow.
- Project documentation was updated in the status file, MVP file, and finished summary file to reflect the shipped report and sector changes.

- Fixed the shared Cockpit visit loading path for AM-scoped screens.
- Replaced broken nested `assigned_am._id` filtering with client-side AM filtering in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Fixed the Plan month range query so calendar screens can pull visits for the selected month in [src/components/VisitListScreen.tsx](src/components/VisitListScreen.tsx).
- Updated the query hook path used by visit data consumers in [src/hooks/useVisits.ts](src/hooks/useVisits.ts).
- Reworked the Reports screen toward the `visitplan-v2.html` layout with KPI strip, weekly chart, and recent activity in [src/components/ReportsScreen.tsx](src/components/ReportsScreen.tsx).
- Removed the temporary local Cockpit proxy path after direct Cockpit CORS checks started returning the required browser headers in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Confirmed the remaining `Clients` failure is the Cockpit `clients` collection returning `500 system error` for `sort[name]=1`, not a current CORS block.
- Made the Admin `Tools` tab functional so it can create clients, create sectors, and sync five years of financial years and quarters in [src/components/AdminScreen.tsx](src/components/AdminScreen.tsx).
- Added the sample `Owned Sectors` block to Profile in [src/components/ProfileScreen.tsx](src/components/ProfileScreen.tsx).
- Reworked meeting group handling into role-based department rules with `Account Manager` and admin/management-only `All Departments` options in [src/utils/meetingGroups.ts](src/utils/meetingGroups.ts), [src/components/ProfileScreen.tsx](src/components/ProfileScreen.tsx), and [src/components/AdminScreen.tsx](src/components/AdminScreen.tsx).
- Persisted user-owned sectors on the Cockpit user record and made them editable from Profile in [src/types.ts](src/types.ts), [src/lib/cockpit.ts](src/lib/cockpit.ts), and [src/components/ProfileScreen.tsx](src/components/ProfileScreen.tsx).
- Defaulted the Clients screen to the user's first owned sector and moved owned sectors to the front of the filter bar in [src/components/ClientListScreen.tsx](src/components/ClientListScreen.tsx).
- Prioritized visit client selection by the user's owned sectors and renamed the visit setup label from `Meeting Group` to `Department` in [src/components/CreateVisitModal.tsx](src/components/CreateVisitModal.tsx).
- Extended admin approvals so pending users can be approved as `AM`, `Sales`, `Solution`, or `Management` with the correct department restrictions in [src/components/AdminScreen.tsx](src/components/AdminScreen.tsx).
- Wired financial year and quarter selection into the active visit creation flow in [src/components/CreateVisitModal.tsx](src/components/CreateVisitModal.tsx).
- Added a reusable financial calendar seed script in [scripts/seed-financial-calendar.mjs](scripts/seed-financial-calendar.mjs).
- Fixed Create Visit financial year and quarter loading by removing Cockpit server-side sort params and sorting those lookups client-side in [src/lib/cockpit.ts](src/lib/cockpit.ts).
- Hardened Create Visit quarter selection so quarter chips still render when Cockpit year links are incomplete in [src/components/CreateVisitModal.tsx](src/components/CreateVisitModal.tsx).
- Reworked the Visit detail `Missed` action into visible in-modal choices for `Project Cancel` and `Reschedule Later` in [src/components/VisitDetailModal.tsx](src/components/VisitDetailModal.tsx).
- Updated the Plan screen to show the current week as a 7-day grouped schedule instead of only the selected day in [src/components/VisitListScreen.tsx](src/components/VisitListScreen.tsx).
- Fixed Reports period filters to use backward-looking ranges for `7 Days`, `30 Days`, and `3 Months`, so older visits like March 31 are included in `3 Months` instead of only appearing in `All Time` in [src/components/ReportsScreen.tsx](src/components/ReportsScreen.tsx).

## Finished Status

- Team Overview is now working with live Cockpit data.
- Team Overview department and sector rows now open centered detail views with live drilldown data.
- Team Overview department detail now shows member totals only, and dark-mode initials are readable.
- Sector creation, new client creation with new sectors, and client profile sector editing are working.
- Reports now include AM, department, and sector team views.
- Today screen visit rows now use the compact summary layout.

## Validation

- TypeScript validation passed after these changes: `npm run typecheck`
- Financial calendar can now be prepared explicitly with: `npm run seed:financial-calendar`
- Direct Cockpit `curl` checks now return CORS headers for browser use; the remaining bad request is `clients?limit=500&populate=1&sort[name]=1`, which still returns `HTTP 500`.
- Today screen, Plan screen, Client screen, Create Visit flow, Edit Visit flow, and Client profile flow are now confirmed good by live user verification.