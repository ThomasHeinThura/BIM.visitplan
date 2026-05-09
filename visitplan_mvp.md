# VisitPlan MVP — Product & Development Plan

**Stack:** Expo React Native (existing repo) + Cockpit CMS (already deployed at cms.bimats.com)  
**Repo:** https://github.com/ThomasHeinThura/BIM.visitplan  
**Goal:** Unblock sales team — visit tracking + management report. Nothing else.

---

## What We Are Building

Two things only:

1. **Mobile App** (iOS + Android) — for Area Managers to plan and log visits
2. **Report Screen** (in-app, manager view) — visit counts per AM, weekly and monthly

Pipeline tracking is a **separate app**. Not in this MVP.

---

## Users & Roles

| Role | Access | Assignment | Platform |
|------|--------|------------|----------|
| `admin` | Full access — manage users, approve accounts, create clients/quarters, all visits + reports | Director job title → auto-assigned; or manually assigned by existing admin | Mobile |
| `am` | Account Manager — own visits only: create, check-in, log outcome | Assigned by admin after approval | Mobile |

---

## Authentication — Microsoft Login

Users log in with their **Microsoft work account** (BIM Group Entra ID).  
Cockpit CMS stores user profile + role. Microsoft handles identity only.

**Flow:**
1. User taps "Login with Microsoft" → MSAL redirects to Entra ID
2. Microsoft returns token + user email + job title
3. App queries Cockpit `users` collection by `ms_email`
4. Not found → create pending record → show **Pending Approval** screen (S-08)
5. Found, `approval_status = pending` → show **Pending Approval** screen (S-08)
6. Found, `role = am`, `approval_status = approved` → enter AM Dashboard (S-01)
7. Found, `role = admin`, `approval_status = approved` → enter Admin Dashboard (S-07)
8. Special case: job title contains "Director" → auto-assign `admin` role, skip approval

**Admin approves users via:**
- **In-app**: Admin screen (S-07) → Approvals tab → assign role (AM or Admin)
- **Cockpit CMS**: `users` collection → update `role` + `approval_status` fields directly

No passwords. No separate registration. Users sign in with Microsoft; admin assigns roles.

---

## Cockpit CMS Backend Setup

### Already Done
- Cockpit deployed at https://cms.bimats.com ✅
- Admin account created ✅

### Step 1 — Create 5 Collections

Go to **cms.bimats.com → Content → Add Collection** and create each one below.

---

#### Collection: `users`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required |
| `email` | Text | Required |
| `role` | Select | Options: `am`, `admin` |
| `approval_status` | Select | Options: `pending`, `approved`, `rejected`; Default: `pending` |
| `job_title` | Text | From Microsoft Entra ID — auto-populated on first login |
| `team` | Text | Team or region name |
| `ms_email` | Text | Must match Microsoft work email exactly |
| `ms_id` | Text | Microsoft Entra ID object ID (optional) |
| `active` | Boolean | Default: true |

---

#### Collection: `clients`

| Field | Type | Notes |
|-------|------|-------|
| `name` | Text | Required |
| `sector` | Text | Industry |
| `tier` | Select | Options: `A`, `B`, `C` |
| `address` | Text | |
| `phone` | Text | |
| `status` | Select | Options: `active`, `inactive` |

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
| `assigned_am` | Collection Link | Links to `users` |
| `date` | Date | Visit date |
| `start_time` | Text | Format: HH:MM |
| `end_time` | Text | Format: HH:MM |
| `location` | Text | Address or place name |
| `agenda` | Textarea | Pre-visit agenda notes |
| `status` | Select | `scheduled`, `in_progress`, `completed`, `missed` |
| `checkin_at` | Text | ISO timestamp on check-in |
| `checkout_at` | Text | ISO timestamp on check-out |
| `checkin_lat` | Number | GPS latitude |
| `checkin_lng` | Number | GPS longitude |

---

#### Collection: `visit_outcomes`

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
- Permissions: Read + Write on all 5 collections, Read on Assets
- Copy the key → add to app as `COCKPIT_API_TOKEN` in `.env`

**Do not use the Master API key in the mobile app.**

### Step 3 — Enable CORS

**Settings → Security → CORS**  
Add your app's domain and `*` for development.

---

## Mobile App — 9 Screens

### Screens by Role

| # | Screen | Role | Purpose |
|---|--------|------|---------|
| S-00 | Login | All | Microsoft SSO only — no email/password |
| S-01 | Today Dashboard | AM | Today's visits, pending outcomes, KPIs |
| S-02 | Plan Visit | AM | Create new visit — client, agenda, schedule |
| S-03 | Active Visit | AM | Live check-in/out timer, GPS verify, agenda checklist |
| S-04 | Outcome Form | AM | Post-visit result + notes (locks on submit) |
| S-05 | Team Overview | Admin | Team visit stats, AM activity feed, bar chart |
| S-06 | Visit History | AM + Admin | Filter visits by date/status/team/AM |
| S-07 | Admin Dashboard | Admin | Tools tab (Create Client, Add Quarter) + Approvals tab (assign AM/Admin role) |
| S-08 | Pending Approval | New user | Shown after MS login if account not yet approved by admin |

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
12. `UserManagementScreen.tsx` — admin only

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
POST https://cms.bimats.com/api/content/item/visit_outcomes
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

## Admin Screen — S-07 (Admin role only)

The Admin screen has two tabs:

**Tools tab:**
- Create Client — name, sector, tier
- Add Financial Quarter — FY + Q1/Q2/Q3/Q4

**Approvals tab:**
- Lists users with `approval_status = pending`
- Shows: name, MS email, job title (from Entra ID)
- Approve buttons: **Assign as AM** or **Assign as Admin**
- Approved users immediately get app access

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

- Visit agenda items (checklist per visit) — Phase 2
- Recurring visit templates — Phase 2
- Route planning / map view — Phase 2
- Push notifications (overdue alerts) — Phase 2
- Offline mode (sync queue) — Phase 2
- Pipeline / deals tracking — separate app entirely
- WSO2 IS / APIM integration — UAT demo environment only
- Director KPI dashboard (web) — Phase 2
- Excel / PDF report export — Phase 2

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cockpit CORS blocks mobile app calls | High | Configure CORS in Cockpit settings on Day 1, test before writing screens |
| MSAL redirect URI mismatch on device | Medium | Test auth on real device in Week 1, not emulator |
| Cockpit collection links (populate) not returning nested data | Medium | Use `populate=1` query param on collection requests |
| Manager report slow with 500+ visits | Low for MVP | Add `limit` + date filter, acceptable for 100 users |
| Admin forgets to create user before AM tries to log in | Medium | Show clear "contact admin" message on login failure |

