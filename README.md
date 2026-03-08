# BIM.Visitplan

Expo TypeScript client for BIM CRM visit plans. One codebase runs on iOS, Android, and web.

## What it does

- Sign in against the CRM bearer-token API.
- List visit plans visible to the current user.
- Create new visit plans.
- Edit existing visit plans.
- Inspect visit plan detail.
- Update visit plan status when the backend exposes `PATCH /api/v1/visit-plans/{id}/status`.

## Default API target

The app points to `https://uat-crm.bimats.com:10443` by default. You can override that with the login screen or by setting `EXPO_PUBLIC_API_BASE_URL`.

## Run

```bash
npm install
npm run typecheck
npm run ios
npm run android
npm run web
```

## Backend expectation

The app is designed for the BIM.GRGCRM API layer under `application/routes/api.php`.

For full app support, deploy these API capabilities:

- `GET /api/auth/me` returning visit plan permission metadata.
- `GET /api/v1/visit-plans`
- `POST /api/v1/visit-plans`
- `GET /api/v1/visit-plans/{id}`
- `PUT /api/v1/visit-plans/{id}`
- `PATCH /api/v1/visit-plans/{id}/status`

The current UAT instance should support login, list, detail, create, update, and status update after the latest BIM.GRGCRM deployment. If an endpoint is still missing, the app surfaces the API error directly.