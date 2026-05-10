# VisitPlan MVP — Product & Development Plan

**Version:** 2.6 (May 10, 2026)  
**App Release Version:** 2.6.0  
**iOS TestFlight Build:** 4  
**Stack:** Expo React Native (SDK 55) + Cockpit CMS (cms.bimats.com)  
**Repo:** https://github.com/ThomasHeinThura/BIM.visitplan  
**Goal:** Unblock sales team — visit tracking + client management + management reports.

---

## Changelog — v2.6 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | **Team Report (S-14)** department and sector drilldowns now open in a centered detail modal instead of a bottom sheet. |
| 2 | **By Departments** now drills into the actual visit owners and contributors and shows each member's total visits for the quarter. |
| 3 | **By Sector** now drills into sector clients and shows the top 5 AM / Sales / Solution contributors under each client. |
| 4 | **Profile (S-12)** owned-sector picker now loads from the Cockpit `sectors` collection plus existing client sector values, so new sectors appear immediately. |
| 5 | **Profile (S-12)** no longer shows or depends on the old seniority field. |
| 6 | **Today Dashboard (S-02)** visit rows now use a compact summary line instead of repeating client names. |
| 7 | **Team Report dark mode** now uses theme-aware initials contrast for department, sector, and AM avatars. |
| 8 | **MVP documentation updated** to match current screen routing and Cockpit collection names: `agendaitems` and `visitoutcomes`. |

## Changelog — v2.5 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | **Team Report (S-14) view controls changed** from sort tabs into report views: `By AMs`, `By Departments`, and `By Sector`. |
| 2 | **By AMs** keeps the existing AM drilldown flow into S-15. |
| 3 | **By Departments** now aggregates quarter visit totals, completed totals, AM counts, and pipeline totals by department. |
| 4 | **By Sector** now aggregates quarter visit totals, completed totals, client counts, and pipeline totals by sector. |
| 5 | **Admin Create Client** now uses the live sector list instead of a fixed hardcoded list, including newly created sectors. |
| 6 | **Client Workspace (S-08)** now allows sector editing in the client profile info form. |
| 7 | **Visit detail and edit flows** now preload and display saved pipeline values in summary and edit state. |
| 8 | **Individual Reports (S-10)** now show pipeline values inside completed visit rows for 7-day and 30-day views. |

---

## Changelog — v2.4 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | **Unified bottom nav across all roles:** `Today · Plan · Clients · Reports · Profile` (5 tabs). Team Overview and Admin moved out of nav for admin/management. |
| 2 | **Profile (S-12) now hosts "Admin Tools" card** — visible only to admin/management. Provides shortcut entries to Admin (S-09) and Team Report (S-14). |
| 3 | **New screen S-13 — Edit Visit (Outcome & Status).** Reached from a 3-dot ⋮ menu on visit cards in Today (S-02), Plan (S-03), and Client Workspace (S-08). Edits status (Planned / Active / Done / No-show / Rescheduled / Cancelled), outcome (Positive / Neutral / Negative / No-show), pipeline value, notes, and reschedule date/time. Also exposes Delete. |
| 4 | **Reports (S-10) for AM/Sales/Solution — Teams tab removed.** They only see All / Mine. |
| 5 | **Reports (S-10) for Admin/Management — Teams tab navigates to a dedicated Team Report flow** (S-14 → S-15) instead of an inline list. |
| 6 | **New screen S-14 — Team Report.** Lists current-quarter AM activity with report views for AMs, Departments, and Sectors. Admin/management only. |
| 7 | **New screen S-15 — AM Visit List (drilldown from S-14).** Shows the selected AM's full visit list for the current quarter, grouped by date with status badges and outcomes. Filters: All / Done / Pending / No-show. |
| 8 | **Sales + Solution merged on the login screen** into a single "Sales / Solution" entry (the underlying roles remain distinct in RBAC). |
| 9 | **Admin Tools (S-09) simplified** — Sectors tab removed and "Create Sector" inlined into Tools. |
| 10 | **3-dot ⋮ menu on every visit card** in S-02, S-03, S-08 opens S-13 Edit Visit without disturbing card-level navigation. |

---

## Current Build Status — May 10, 2026

### Finished and Working

- Login screen is working.
- Pending approval screen is working.
- Today screen is working.
- Plan screen is working, including the grouped current-week visit view.
- Client list screen is working and shows client data for all users.
- Create Visit is working, including financial year / quarter selection and office-hour time selection.
- Edit Visit is working, including visible time options and office-hour enforcement.
- Client profile is working, including client save feedback, contact creation, and clean launch of Schedule Visit.
- Reports screen period filters now use backward-looking ranges for `7 Days`, `30 Days`, and `3 Months`.
- Team Overview is working with live Cockpit data.
- Team Overview report views now support `By AMs`, `By Departments`, and `By Sector`.
- Admin client creation now uses the live sector list, including newly created sectors.
- Client profile now supports sector editing.
- Visit summary and edit mode now show previously saved pipeline values.
- Department handling now follows role-based rules in Profile and approvals.
- Owned sectors are now user-specific and drive the default sector shown first in Clients and visit client selection.
- Department drilldowns now show each member with total visits only.
- Today screen visit rows now use the compact summary layout.
- Team Report initials now remain readable in dark mode.

### Verified Report Fixes

- `3 Months` no longer uses the same window logic as `30 Days`.
- Older visits such as March 31 are now included in `3 Months` instead of only appearing in `All Time`.
- Weekly chart date math uses local dates rather than timezone-shifted UTC conversion.

### Still Needs Live Recheck

- Reports screen should be refreshed once in the web app to confirm the corrected totals and chart values after the latest bundle reload.

---

## Changelog — v2.3 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | **Director + HOD merged into `management` role** — single role, group-scoped, admin-level permissions within their group |
| 2 | **5 roles total:** `admin`, `management`, `sales`, `solution`, `am` — simplified RBAC |
| 3 | **Management = admin-level but group-scoped** — can create clients/sectors, edit all client fields, create visit plans, view team overview, set sector owner — all within own group |
| 4 | **Sales + Solution = AM-equivalent but group-scoped** — Sales can create visit plans for own group; Solution can add agenda/participants; both see all group visits |
| 5 | **All roles can add participants and agenda items to any visit they can see** |
| 6 | **Target changed from MMK to USD** — `target_usd` field; default $30,000 |
| 7 | **Permission matrix simplified** to 5 columns (Admin / Management / Sales / Solution / AM) |
| 8 | **Users collection updated** — `role` options: `admin`, `management`, `sales`, `solution`, `am`; `target_usd` default 30000 |
| 9 | **Visit visibility rules** — management sees all in group; sales/solution see all in group; am sees own only |


## Changelog — v2.2 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | Full RBAC overhaul — 6 roles (superseded by v2.3) |
| 2 | Participants field on visits |
| 3 | AM is cross-department |
| 4–10 | See v2.3 for current state |

## Changelog — v2.1 (May 10, 2026)

| # | Change |
|---|--------|
| 1 | **New screen S-11 — Add Agenda Item** (dedicated agenda item editor for visits with many items) |
| 2 | **"Manager Instruction" renamed to "Instruction"** — only Admin can add instructions to a client |
| 3 | **Client Workspace screen updated** — shows total meetings + meeting outcomes for both AM & Admin |
| 4 | **Meeting Groups added** — Infra, ES, App, MS; Group Admin role can only see their group's meetings |
| 5 | **Client data model confirmed** — fields: Name, AM, Account Type, Sector, Status (with all enum values) |
| 6 | **New Profile screen (S-12)** — AM can edit their group, set personal target (default 240M MMK), see owned sectors |
| 7 | **Admin Teams screen (S-05) — navigation buttons added** |
| 8 | **Target field added to users** — 240M MMK default; shown in Profile & Reports |
| 9 | **Sector ownership** — each sector has an owner AM; visible in Profile screen |
| 10 | **Sector creation** — Admin + Management via Admin screen (Management: own group only); AM cannot create sectors |

---

## What We Are Building

1. **Mobile App** (iOS + Android + Web) — for Area Managers to plan and log visits
2. **Client Directory** — admin-managed, AM-viewable, with sector/status/type metadata
3. **Report Screen** (in-app) — visit counts per AM, weekly and monthly

Pipeline tracking is a **separate app**. Not in this MVP.

---

## Users & Roles

**5 roles.** `management` merges Director + HOD. `am` is cross-department. All group-scoped roles (`management`, `sales`, `solution`) are bound to one meeting group.

| Role | Bound To | What They See | Analogy |
|------|----------|---------------|---------|
| `admin` | — | Everything; manage all users, approve new users | System admin |
| `management` | Meeting Group | Admin-level within own group — all clients, all group visits, team overview, visit creation | Director / HOD |
| `sales` | Meeting Group | All visits in own group + participants; can create visit plans for own group | Group-scoped AM |
| `solution` | Meeting Group | All visits in own group + participants; add agenda/participants | Group-scoped AM |
| `am` | Clients + Sectors | Own visits + own clients; cross-department seller; added as participant to group visits | Field AM |

> **AM sells across all departments.** An AM visit to a Banking client may involve Infra, App, and Solution staff — all added as participants via the participant selector.

### Departments

User `meeting_group` is treated as a department selector in the app UI. Visit `meeting_group` still represents the visit's business department.

| Department | Description |
|------------|-------------|
| `infra` | Infrastructure |
| `es` | Enterprise Solutions |
| `app` | Application |
| `ms` | Microsoft |
| `account` | Account Manager department; AM users default here and cannot change it |
| `all` | All Departments; only for `admin` and `management` |

### Department Rules By Role

| Role | Department Options |
|------|--------------------|
| `am` | Fixed to `account` |
| `sales` | `infra`, `es`, `app`, `ms` |
| `solution` | `infra`, `es`, `app`, `ms` |
| `management` | `infra`, `es`, `app`, `ms`, `all` |
| `admin` | `infra`, `es`, `app`, `ms`, `all` |

### Owned Sectors

- Every role can see and edit their own owned sectors in Profile.
- Owned sectors are stored on the user record as `owned_sectors`.
- The first owned sector becomes the default active sector in the Clients screen when present.
- Visit client picking prioritizes clients from the user's owned sectors first.

### Visit Visibility Rules

A user can see a visit if **any** of these is true:

1. They are the `assigned_am` on the visit
2. They are listed in the visit's `participants` array
3. Their role is `management`, `sales`, or `solution` and the visit's `meeting_group` matches their `meeting_group`
4. Their role is `admin`

This means a cross-department project meeting (e.g. Infra + App joint visit) is visible to participants from both groups.

### Permission Matrix

> **Management** = admin-level, own group only. **Sales / Solution** = AM-equivalent, own group instead of own clients.

| Action | Admin | Management | Sales | Solution | AM |
|--------|-------|------------|-------|----------|----|
| Create client | ✅ all | ✅ all | ❌ | ❌ | ❌ |
| Create sector | ✅ all | ✅ all | ❌ | ❌ | ❌ |
| Edit client name / sector | ✅ all | ✅ all | ❌ | ❌ | ❌ |
| Edit client account_type / status | ✅ all | ✅ all | ✅ own group | ✅ own group | ✅ own clients |
| Assign AM to client | ✅ all | ✅ own group | ❌ | ❌ | ❌ |
| Add / edit client **Instruction** | ✅ all | ✅ own group | ❌ | ❌ | ❌ |
| View client Instruction | ✅ | ✅ | ✅ read | ✅ read | ✅ read |
| Create visit plan | ✅ all | ✅ own group | ✅ own group | ✅ own group | ✅ own clients |
| Add participants to visit | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add agenda item to visit | ✅ | ✅ | ✅ | ✅ | ✅ |
| View visits | ✅ all | ✅ own group | ✅ own group | ✅ own group | ✅ own only |
| View team overview (S-05) | ✅ all | ✅ own group | ❌ | ❌ | ❌ |
| Approve / reject users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access Admin screen (S-09) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Set sector owner | ✅ all | ✅ own group | ❌ | ❌ | ❌ |
| Edit own profile target (USD) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own meeting group | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Authentication — Microsoft Login

Users log in with their **Microsoft work account** (BIM Group Entra ID).  
Cockpit CMS stores user profile + role. Microsoft handles identity only.

**Flow:**
1. User taps "Login with Microsoft" → PKCE OAuth redirects to Entra ID
2. Microsoft returns token + user email + job title
3. App queries Cockpit `users` collection by `ms_email`
4. Not found → create pending record (`approval_status: pending`) → show **Pending Approval** screen (S-08)
5. Found, `approval_status = pending` → show **Pending Approval** screen (S-08)
6. Found, `role = am`, `approval_status = approved` → enter AM Today Dashboard (S-02)
7. Found, `role in [sales, solution, management]`, `approval_status = approved` → enter Group Today Dashboard (S-02)
8. Found, `role = admin`, `approval_status = approved` → enter Admin Today Dashboard (S-02)
9. Special case: job title contains "Director" or "HOD" → auto-assign `management` role + `approval_status: approved`
10. Special case: job title contains "Admin" → auto-assign `admin` role + `approval_status: approved`

**Admin approves users via:**
- **In-app**: Admin screen (S-09) → Approvals tab → assign role + meeting group (Admin: any role; Management: can approve within own group)
- **Cockpit CMS**: `users` collection → update `role` + `approval_status` fields directly

No passwords. No separate registration. Users sign in with Microsoft; admin assigns roles.

---

## Cockpit CMS Backend Setup

### Already Done
- Cockpit deployed at https://cms.bimats.com ✅
- Admin account created ✅

### Step 1 — Create 9 Collections

Go to **cms.bimats.com → Content → Add Collection** and create each one below.

---

#### Collection: `users`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required |
| `email` | Text | Required |
| `role` | Select | Options: `am`, `sales`, `solution`, `management`, `admin` |
| `approval_status` | Select | Options: `pending`, `approved`, `rejected`; Default: `pending` |
| `job_title` | Text | From Microsoft Entra ID — auto-populated on first login |
| `meeting_group` | Select | Options: `infra`, `es`, `app`, `ms`, `account`, `all`; role-restricted in app UI |
| `owned_sectors` | Tags / JSON array | User-selected sectors shown in Profile and used as default client-sector preference |
| `target_usd` | Number | Personal target in USD; Default: `30000` ($30,000) |
| `ms_email` | Text | Must match Microsoft work email exactly |
| `ms_id` | Text | Microsoft Entra ID object ID (optional) |
| `active` | Boolean | Default: true |

---

#### Collection: `sectors`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required — e.g. Microfinance, Banking, Healthcare |
| `owner_am` | Collection Link | Links to `users` — AM who owns this sector; nullable |
| `active` | Boolean | Default: true |

**Seeded values:** Microfinance, MDR, Healthcare, Insurance, Banking, Telecom, Media, Software, Government  
Admin and Management can add new sectors (Management: own group only). AMs cannot create sectors.  
Each sector has an optional `owner_am` — the AM responsible for that sector. Admin sets the owner; AM can see their owned sectors in their Profile screen.

---

#### Collection: `clients`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required |
| `sector` | Text | Stored as plain text sector name; values come from the `sectors` collection list |
| `account_type` | Select | Options: `Named Account`, `Key Account` |
| `status` | Select | Options: `Active`, `Hold`, `Inactive`, `Churned`, `Prospect`; Default: `Prospect` |
| `am` | Collection Link | Links to `users` — assigned AM |
| `address` | Text | |
| `phone` | Text | |
| `website` | Text | |
| `notes` | Textarea | Internal notes |
| `instruction` | Textarea | Admin-managed only. Shown read-only to AM and Group Admin. Replaces "manager instruction". |

**Who can do what:**
- Admin: create clients, edit all fields globally
- Management: create clients, edit all fields (including `instruction`, `name`, `sector`, `am`) — own group only
- Sales / Solution: view all clients; can edit `account_type` and `status` on own group clients; cannot create or edit core fields
- AM: view own clients; can edit `account_type` and `status` on own clients only
- All roles: can read `instruction`

---

#### Collection: `contacts`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required |
| `client` | Collection Link | Links to `clients` |
| `email` | Text | |
| `phone` | Text | |
| `position` | Text | Job title |

---

#### Collection: `visits`

| Field | Type | Notes |
|-------|------|-------|
| `title` | Text | Required |
| `client` | Collection Link | Links to `clients` |
| `contact` | Collection Link | Links to `contacts` |
| `assigned_am` | Collection Link | Links to `users` — the AM who owns this visit |
| `participants` | Collection Link (multi) | Links to `users` (multiple) — additional attendees from any group; enables cross-dept visibility |
| `meeting_group` | Select | Options: `infra`, `es`, `app`, `ms` — required; determines which group's Management/Sales/Solution can see this visit |
| `date` | Date | Visit date |
| `start_time` | Text | Format: HH:MM |
| `end_time` | Text | Format: HH:MM |
| `location` | Text | Address or place name |
| `status` | Select | `scheduled`, `in_progress`, `completed`, `missed` |
| `checkin_at` | Text | ISO timestamp on check-in |
| `checkout_at` | Text | ISO timestamp on check-out |
| `checkin_lat` | Number | GPS latitude |
| `checkin_lng` | Number | GPS longitude |

> **Agenda items are now stored in the `agendaitems` collection** (not a textarea field on the visit). This allows adding many agenda items with individual completion tracking.

#### Collection: `agendaitems`

| Field | Type | Notes |
|-------|------|-------|
| `visit` | Collection Link | Links to `visits` — required |
| `title` | Text | Required — agenda item text |
| `order` | Number | Display order (drag-to-reorder) |
| `completed` | Boolean | Checked off during active visit; Default: false |
| `created_by` | Collection Link | Links to `users` |

---

#### Collection: `visitoutcomes`

| Field | Type | Notes |
|-------|------|-------|
| `visit` | Collection Link | Links to `visits` (1:1) |
| `result` | Select | `positive`, `neutral`, `negative`, `no_show` |
| `summary` | Textarea | What happened |
| `next_action` | Text | Follow-up task |
| `next_visit_date` | Date | Suggested next visit |
| `attachments` | Asset | Photos or documents (multiple) |
| `submitted_by` | Collection Link | Links to `users` |
| `submitted_at` | Text | ISO timestamp — record locked after this |

---

### Step 2 — Create Scoped API Key

**Settings → API Access → Add API Key**
- Name: `visitplan-mobile`
- Permissions: Read + Write on all 8 collections, Read on Assets
- Copy the key → add to app as `COCKPIT_API_TOKEN` in `.env`

**Do not use the Master API key in the mobile app.**

### Step 3 — Enable CORS

**Settings → Security → CORS**  
Add your app's domain and `*` for development.

---

## Mobile App — 16 Screens

### Bottom Navigation (v2.4)

All roles share the same 5-tab bottom navigation:

`Today (S-02)` · `Plan (S-03)` · `Clients (S-07)` · `Reports (S-10)` · `Profile (S-12)`

Role-specific surfaces are reached **inside** these tabs:

- **Admin / Management** open Admin (S-09) and Team Report (S-14) from the **Admin Tools** card on Profile (S-12).
- **Admin / Management** open the Team Report flow (S-14 → S-15) from the **Teams** sub-tab on Reports (S-10). The Teams sub-tab is hidden for AM / Sales / Solution.
- **All roles** open Edit Visit (S-13) from the **⋮** menu on any visit card in S-02 / S-03 / S-08.

### Role → Screen Access

Screens adapt based on the user's role. The bottom navigation is the same for everyone; visible data and role-gated surfaces change per role.

| # | Screen | Who Can Access | Purpose |
|---|--------|----------------|---------|
| S-00 | Login | All | Microsoft SSO only — no email/password |
| S-01 | Pending Approval | New user | Shown after MS login if account not yet approved |
| S-02 | Today Dashboard | All approved | Today's visits (scoped by role), quick actions, KPIs. AM sees own; Sales/Solution/Management sees group; Admin sees all |
| S-03 | Visit Plan (Calendar & List) | All approved | Month calendar + daily visit list. Same scoping as S-02 |
| S-04 | Create / Edit Visit (Modal) | AM + Admin + Management + Sales | POPUP modal: client, meeting group, date/time, **participant selector** (multi-user from any group). AM limited to own clients; Sales/Management limited to own group |
| S-05 | Team Overview | Admin + Management | Admin: all groups; Management: own group only. Legacy concept replaced in-app by the Team Report flow and admin shortcuts |
| S-06 | Visit Detail / Active Visit | All approved | Check-in/out, agenda checklist (→ S-11), notes, start/finish. Participants listed. All roles can add agenda items and participants |
| S-07 | Client List | All approved | Full client directory; search + filter by sector/status/AM. AM sees own clients prominently |
| S-08 | Client Workspace / Detail | All approved | Client record, total meetings count, outcome summary. **Instruction tab** (admin-edit, all-read). Tabs: Overview / Instruction / Visits / Outcomes |
| S-09 | Admin Screen | Admin + Management | Tools + Approvals tab (set role + group) + sector and client creation. Management sees own group only |
| S-10 | Reports | All approved | AM: personal. Management: group. Admin: full team. Shows target (USD) vs. actuals |
| S-11 | Add / Edit Agenda Item | All approved | Dedicated screen from S-06. Add/edit/delete/reorder agenda items. Any participant or group-scoped user can add items |
| S-12 | Profile | All approved | View/edit: meeting group, personal target (USD), owned sectors, theme. **Admin Tools card** (admin/management only) links to S-09 and S-14. Sign out. |
| S-13 | Edit Visit | All approved | Opened from ⋮ menu on any visit card. Edit status, outcome, pipeline value, notes, reschedule date/time. Delete option. |
| S-14 | Team Report | Admin + Management | Reached from Teams sub-tab on S-10. View tabs: By AMs / By Departments / By Sector. Departments and sectors open centered live drilldown modals. |
| S-15 | AM Visit List | Admin + Management | Drilldown from S-14. Selected AM's Q visits with date, client, outcome, status. Filter All / Done / Pending / No-show. |

> S-04 is a modal overlay (not standalone navigation). S-11 pushes onto the navigation stack from S-06 (Visit Detail). S-13 is reached from the ⋮ menu on visit cards (S-02 / S-03 / S-08). S-14 is reached from the Teams sub-tab on S-10 and from the Admin Tools card on S-12. S-15 remains the AM-only drilldown from S-14.

---

### S-04 — Create / Edit Visit: Participant Selector

The Create Visit modal now includes a **Participants** field:

- **All roles can add participants** — AM, Sales, Solution, Management, Admin
- Multi-select from all active users in Cockpit
- Users can be from any meeting group — not restricted to visit's group
- Shown as avatar chips in the modal and in Visit Detail (S-06)
- Selected participants will see the visit in their feed even if it's in a different group
- Default: only the creator (auto-added)

Use case: An AM schedules a Banking client visit that needs Infra + App Solution staff — AM selects both as participants. Those users see the visit in their own Today/Plan screens.

Use case 2: A Sales user in Infra creates a group visit and adds a Management user and two Solution staff as participants.

---

### S-05 — Team Overview: Navigation & Scoping

The Teams screen is accessible to **Admin and Management** only.

- **Admin**: sees all groups, all AMs, all visits — can switch group filter
- **Management**: sees only their own group; sees their group's AMs, Sales, and Solution staff

Bottom navigation tabs (added in v2.1):

| Tab | Visible to |
|-----|------------|
| Today | All |
| Plan | All |
| Clients | All |
| Reports | All |

The Team Overview itself shows:
- Group filter (Admin: dropdown; Management: pre-locked to their group)
- Member list with role badges and visit activity indicators
- Today's visit count per member
- Weekly visit count per member

---

### S-08 — Client Workspace: New Sections

The Client Workspace screen now has these tabs/sections:

1. **Overview** — client info, assigned AM, sector, account type, status
2. **Instruction** — admin-managed instruction text. Admin can edit; AM/Group Admin sees read-only
3. **Visits** — total meeting count + list of recent visits with outcome badges
4. **Outcomes Summary** — aggregate: Positive / Neutral / Negative / No-show counts + % bar

---

### S-11 — Add / Edit Agenda Item (New)

Dedicated screen pushed from Visit Detail (S-06). Handles visits with many agenda items.

**Fields:**
- Title (text input)
- Order (auto-incremented, drag to reorder)
- Completed toggle (checked off during active visit)

**Actions:**
- Add new item (+ button)
- Edit existing item (tap to edit)
- Delete item (swipe left)
- Reorder (drag handle)

Data saved to `agendaitems` collection linked to the visit.

---

### S-12 — Profile (New)

Available to all roles. Accessed from header avatar or bottom nav.

**Sections:**
- **My Info** — name, email, job title, role (read-only)
- **My Group** — select meeting group (`infra` / `es` / `app` / `ms`); editable
- **My Target** — target in USD; editable; default $30,000
- **Owned Sectors** — editable multi-select sourced from Cockpit sectors plus live client sector values
- **Admin Tools** — admin/management only; links to Admin (S-09) and Team Report (S-14)
- **Theme** — light / dark toggle
- **Sign out**

---

### S-13 — Edit Visit (New, v2.4)

Opened from the **⋮** 3-dot menu on any visit card in S-02 (Today), S-03 (Plan), or S-08 (Client Workspace · Visits tab). The 3-dot tap stops propagation so the underlying card navigation is preserved.

**Fields:**
- **Status** — radio chips: `Planned` / `Active` / `Done` / `No-show` / `Rescheduled` / `Cancelled`
- **Outcome** — radio chips: `Positive` / `Neutral` / `Negative` / `No-show` (when status = Done)
- **Pipeline value (USD)** — numeric input, prefixed `$`
- **Outcome notes** — textarea
- **Reschedule** — date + time pickers (when status = Rescheduled)

**Actions:** Save · Cancel · Delete (red link).

---

### S-14 — Team Report (New, v2.4)

Admin / Management only. Reached from the **Teams** sub-tab on Reports (S-10).

**Header:** quarter label (e.g., `Q2 2026 · Apr–Jun · 12 AMs`), back arrow → S-10.

**KPI strip (3 cells):** total visits in Q · % completed · pipeline USD.

**View tabs:** `By AMs` (default) · `By Departments` · `By Sector`.

**List behavior:**
- `By AMs`: one row per AM — avatar, name, department badge, client count, visits in Q, pipeline USD, chevron. Tap row → S-15.
- `By Departments`: one row per department — member count, completed count, visits in Q, pipeline USD. Tap row → centered detail modal with the actual visit owners and contributors and their total visit counts.
- `By Sector`: one row per sector — client count, completed count, visits in Q, pipeline USD. Tap row → centered detail modal with clients and top 5 contributors.

---

### S-15 — AM Visit List (New, v2.4)

Drilldown from S-14. Shows the selected AM's complete visit list for the current quarter.

**Header:** back arrow → S-14, AM name, AM role/sector.

**Mini stats (3 cells):** Q visits · pipeline USD · win rate %.

**Filters:** `All` (default) · `Done` · `Pending` · `No-show`.

**List:** date-grouped (This week, last week, monthly buckets) hist-items showing date, client, time + agenda summary, outcome line, status badge.

---

### Target: USD

Each user has a personal sales target stored as `target_usd` on the `users` record.  
Default: **$30,000 USD**.  
Any user can edit their own target from Profile (S-12). Shown in Reports (S-10) as progress bar vs. actuals.
---

## App Folder Structure

Build on top of existing repo structure:

```
BIM.visitplan/
├── App.tsx                  (exists)
├── src/
│   ├── config.ts            (exists — add COCKPIT_API_URL, COCKPIT_API_TOKEN)
│   ├── types.ts             (exists — add VisitOutcome type)
│   ├── styles.ts            (exists — reuse)
│   │
│   ├── lib/
│   │   ├── cockpit.ts       NEW — Axios client for Cockpit REST API
│   │   ├── auth.ts          NEW — MSAL Microsoft login + token storage
│   │   └── storage.ts       NEW — expo-secure-store helpers
│   │
│   ├── hooks/
│   │   ├── useAuth.ts       NEW — current user + role
│   │   ├── useVisits.ts     NEW — TanStack Query: fetch/create/update visits
│   │   ├── useClients.ts    NEW — fetch clients
│   │   └── useReport.ts     NEW — aggregate visits for report
│   │
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── VisitListScreen.tsx
│   │   ├── VisitDetailScreen.tsx
│   │   ├── VisitCreateScreen.tsx
│   │   ├── CheckInScreen.tsx
│   │   ├── OutcomeScreen.tsx
│   │   ├── ClientListScreen.tsx
│   │   ├── ClientDetailScreen.tsx
│   │   ├── ReportScreen.tsx
│   │   └── UserManagementScreen.tsx
│   │
│   └── components/
│       ├── VisitCard.tsx
│       ├── StatusBadge.tsx
│       ├── OutcomeChip.tsx
│       └── ReportChart.tsx
```

---

## Packages to Install

Run in your repo root:

```bash
# Navigation
npx expo install expo-router

# Microsoft Auth
npx expo install react-native-msal expo-secure-store expo-auth-session expo-crypto

# API + Server State
npx expo install @tanstack/react-query axios

# UI Components
npx expo install react-native-paper react-native-safe-area-context

# Forms + Validation
npx expo install react-hook-form @hookform/resolvers zod

# GPS
npx expo install expo-location

# Camera + Files (outcome attachments)
npx expo install expo-image-picker expo-document-picker

# Charts (report screen)
npx expo install react-native-chart-kit react-native-svg

# Date formatting
npx expo install date-fns
```

---

## Key Code Files to Write First (in order)

1. `src/lib/cockpit.ts` — Axios base client, collection CRUD helpers
2. `src/lib/auth.ts` — MSAL login, token storage, user lookup in Cockpit
3. `src/hooks/useAuth.ts` — global auth state
4. `LoginScreen.tsx` — Microsoft login button
5. `src/hooks/useVisits.ts` — TanStack Query for visits
6. `HomeScreen.tsx` + `VisitListScreen.tsx`
7. `VisitCreateScreen.tsx` + `VisitDetailScreen.tsx`
8. `CheckInScreen.tsx` — GPS check-in/out
9. `OutcomeScreen.tsx` — outcome form
10. `ClientListScreen.tsx` + `ClientDetailScreen.tsx`
11. `ReportScreen.tsx` — chart + AM table
12. `UserManagementScreen.tsx` — admin + management

---

## Cockpit API — How It Works

All endpoints use your scoped API key in the header:

```
Authorization: Api-Key YOUR_COCKPIT_API_TOKEN
```

### Key Endpoints

```
# Auth (not used — we use Microsoft, but available for fallback)
POST https://cms.bimats.com/api/user/login
  body: { user: "email", password: "pass" }

# Get visits (paginated)
GET  https://cms.bimats.com/api/content/items/visits
  ?limit=20&skip=0&sort[date]=-1

# Get visits by AM
GET  https://cms.bimats.com/api/content/items/visits
  ?filter[assigned_am._id]=USER_ID

# Create visit
POST https://cms.bimats.com/api/content/item/visits
  body: { data: { title, client, date, ... } }

# Update visit (check-in, status change)
POST https://cms.bimats.com/api/content/item/visits
  body: { data: { _id: "xxx", status: "in_progress", checkin_at: "..." } }

# Get user by MS email
GET  https://cms.bimats.com/api/content/items/users
  ?filter[ms_email]=user@bimgroup.com&limit=1

# Create outcome
POST https://cms.bimats.com/api/content/item/visitoutcomes
  body: { data: { visit: { _id: "..." }, result: "positive", ... } }

# Report: all visits in date range
GET  https://cms.bimats.com/api/content/items/visits
  ?filter[date][$gte]=2026-05-01&filter[date][$lte]=2026-05-31
  &limit=500&fields=date,status,assigned_am
```

---

## Microsoft Entra ID Setup (Azure Portal)

1. Go to **portal.azure.com → Entra ID → App Registrations → New Registration**
2. Name: `VisitPlan Mobile`
3. Supported account types: **Accounts in this organizational directory only** (single tenant)
4. Redirect URI: `msauth://com.bimgroup.visitplan/callback` (Android) + `msauth.com.bimgroup.visitplan://auth` (iOS)
5. After creation → **API Permissions → Add → Microsoft Graph → Delegated:**
   - `User.Read` (profile info)
   - `email`, `openid`, `profile` (basic OIDC)
6. Copy **Application (client) ID** and **Directory (tenant) ID** → add to app config

No client secret needed for mobile (public client flow).

---

## Report Screen — What Managers See

```
Weekly Report: May 5–11, 2026
─────────────────────────────────────────
AM Name          Visits   Completed   Missed
Thomas H.          8         7          1
Kyaw Z.            7         6          1
Aung M.            7         7          0

[Bar chart: visits per AM this month]

Outcome Summary (completed visits):
  Positive  ████████░░  68%
  Neutral   ████░░░░░░  22%
  Negative  ██░░░░░░░░  10%
```

Filter controls: This Week / This Month / Custom Range  
Data source: Cockpit `visits` collection filtered by date range, grouped by `assigned_am`

---

## Admin Screen — S-09 (Admin + Management)

The Admin screen has three tabs. **Management access is group-scoped** — they can approve users, create clients/sectors, and set sector owners, but only within their own meeting group. Admin has no scoping.

The Admin screen has three tabs:

**Tools tab:**
- Create Client — name, sector (dropdown from `sectors`), account_type, status, assign AM, meeting group
- Create Sector — name + optional owner AM (Admin: globally; Management: own group)
- Assign sector owner — pick sector → pick AM

**Approvals tab:**
- Lists users with `approval_status = pending`
- Shows: name, MS email, job title (from Entra ID)
- Approve action: select **Role** (`am` / `sales` / `solution` / `management` / `admin`) + **Meeting Group** (`infra` / `es` / `app` / `ms`, if applicable)
- Confirm → sets `approval_status: approved` on the user record
- Approved users immediately get app access

**Sectors tab:**
- List all sectors with owner AM name
- Edit sector name or owner
- Create new sector

Admin can also deactivate users via Cockpit CMS (`active: false`) → immediate loss of access.

---

## MVP Delivery Timeline

### Week 1 — Foundation
- [ ] Cockpit collections created (Day 1)
- [ ] API key created and tested with Postman/curl
- [ ] Entra ID app registration completed
- [ ] Packages installed in Expo repo
- [ ] `cockpit.ts` + `auth.ts` + `storage.ts` written
- [ ] Login screen working (Microsoft login → user lookup)
- [ ] Home screen + Visit List screen (read from Cockpit)

### Week 2 — Core Visit Flow
- [ ] Visit Detail screen
- [ ] Visit Create screen (form + submit to Cockpit)
- [ ] Check-in screen (GPS + status update)
- [ ] Check-out + Outcome form (submit + lock)
- [ ] Client List + Client Detail screens

### Week 3 — Report + Admin + UAT
- [ ] Report screen (chart + table)
- [ ] User Management screen (admin)
- [ ] Role-based navigation (AM vs Manager vs Admin views)
- [ ] UAT with sales team (3–5 AMs)
- [ ] Bug fixes + deploy to TestFlight (iOS) + APK (Android)

**Total: 3 weeks, 1 developer**

---

## What Is NOT in This MVP

These are deferred to Phase 2:

- Recurring visit templates — Phase 2
- Route planning / map view — Phase 2
- Push notifications (overdue alerts) — Phase 2
- Offline mode (sync queue) — Phase 2
- Pipeline / deals tracking — separate app entirely
- WSO2 IS / APIM integration — UAT demo environment only
- Management KPI dashboard (web) — Phase 2
- Excel / PDF report export — Phase 2
- Additional team drilldown analytics beyond the current centered Team Report modal — future phase
- Multi-group Management (management scoped to 2+ groups simultaneously) — Phase 2; for MVP Management is bound to one group

> **Moved INTO MVP from Phase 2:** Agenda Items (S-11), Client Instruction field, Meeting Groups, Profile screen (S-12), expanded RBAC (5 roles), Participants on visits.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cockpit CORS blocks mobile app calls | High | Configure CORS in Cockpit settings on Day 1, test before writing screens |
| MSAL redirect URI mismatch on device | Medium | Test auth on real device in Week 1, not emulator |
| Cockpit collection links (populate) not returning nested data | Medium | Use `populate=1` query param on collection requests |
| Manager report slow with 500+ visits | Low for MVP | Add `limit` + date filter, acceptable for 100 users |
| Admin forgets to create user before AM tries to log in | Medium | Show clear "contact admin" message on login failure |

