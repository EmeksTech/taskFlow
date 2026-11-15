# TaskFlow

TaskFlow is a responsive task management dashboard built with Next.js App Router, TypeScript, and Tailwind CSS. Its dashboard and `/tasks` page share the same task service and can use either JSON Server or the authenticated Prisma/Neon API.

## Requirements

- Node.js 22.12 or newer
- npm

## Classroom mock mode

Install dependencies and configure mock mode in `.env.local`:

```bash
npm install
```

```dotenv
NEXT_PUBLIC_API_MODE=mock
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

In the first terminal, start the mock API:

```bash
npm run dev:api
```

In a second terminal, start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard or [http://localhost:3000/tasks](http://localhost:3000/tasks) for task management. The API is available at [http://localhost:3001/tasks](http://localhost:3001/tasks).

`NEXT_PUBLIC_API_BASE_URL` is used only in mock mode. The production build rejects mock mode and missing database/auth configuration.

## Database and account mode

Set the following in `.env.local` for local database mode, or in your hosting provider's environment settings. Never use a `NEXT_PUBLIC_` prefix for database credentials or auth secrets.

- `NEXT_PUBLIC_API_MODE=database`
- `DATABASE_URL` to the Neon pooled connection URL used by the app
- `DIRECT_URL` to the Neon direct (non-pooler) connection URL for migrations
- `AUTH_SECRET` to a locally generated random secret for Auth.js sessions and rate-limit key hashing
- `AUTH_TRUST_HOST=true` when deployed behind Vercel/Render proxies

Generate a secret locally in PowerShell, then copy it directly into `.env.local` without sharing or committing it:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Generate the Prisma client before starting the app:

```bash
npm run db:generate
npm run dev
```

In database mode, dashboard and account pages require sign-in. Use `/register` to create an account, then `/login`. Task reads and mutations are scoped to the signed-in user. Authenticated mutations require same-origin requests. No migration or seed is applied automatically.

For local development only, after confirming that the configured Neon target is the intended development database and `DIRECT_URL` is a direct, non-pooler URL, apply pending migrations:

```bash
npm run db:migrate
```

Prisma migrations use only `DIRECT_URL`; the Prisma config never falls back to the pooled runtime URL in `DATABASE_URL`. **Do not run a migration until the direct URL points to the confirmed target.** The authentication migration is additive; do not reset the database. To seed sample data, explicitly set `NODE_ENV=development` and `TASKFLOW_ALLOW_DEV_SEED=1` before running `npm run db:seed`. Never run the seed against production. In PowerShell:

```powershell
$env:NODE_ENV = "development"
$env:TASKFLOW_ALLOW_DEV_SEED = "1"
npm run db:seed
```

The seed uses fixed UUIDs and skips existing rows; it does not update or delete existing data. Inspect a development database with:

```bash
npm run db:studio
```

For mock mode, use the JSON Server and Next.js commands in the first section. To switch between sources locally, change `NEXT_PUBLIC_API_MODE` and restart Next.js. Authentication is intentionally disabled in mock mode, so classroom JSON Server use does not require an account. Production builds are database-only and cannot silently fall back to JSON Server.

## Database API

While running in database mode and authenticated, the API provides:

- `GET /api/tasks` (optional filters: `status`, `priority`, `category`, `assignee`, `dueBefore`, `dueAfter`; sorting: `sortBy`, `order`)
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

Task IDs are strings in the frontend contract; database IDs are UUIDs. The API maps the database enums to the current title-cased values and serializes due dates as `YYYY-MM-DD`.

Example request body:

```json
{
  "title": "Prepare launch checklist",
  "description": "Review the release steps",
  "assignee": "Maya Johnson",
  "category": "Product",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2026-11-18"
}
```

### Manual endpoint checks

Sign in in a browser first. Use the browser's developer tools to exercise the API requests below with the current same-origin session cookie. Do not copy session cookies into shared logs or chat.

Verify authenticated `GET`, `POST`, `GET /:id`, `PATCH`, and `DELETE` on `/api/tasks`. Invalid fields and non-UUID IDs should return `400`; a missing or another user's task should return `404`; an unauthenticated request should return `401`; successful deletion returns `204`.

## Migration target safety

Prisma migration commands require `DIRECT_URL`. Before running `npm run db:migrate`, verify that both URLs point to the intended Neon branch and that `DIRECT_URL` is the direct endpoint. The app does not automatically assign pre-existing tasks with `ownerId = null` to any user; they remain inaccessible through user-scoped task endpoints.

Production migrations are a separate, controlled operation. Ensure the corresponding migration SQL files are present in version control, review the target Neon branch and pending migration SQL, then run `npm run db:deploy` once from a trusted CI migration job or operator environment with `DIRECT_URL` set to the intended production database. Do not run `prisma migrate dev`, `prisma db push`, reset, or seed against production. Do not run migrations automatically in the app's build, postinstall, or startup commands. The auth migration must be committed before production release; verify Git status before deployment.

## Authentication and account management

- Auth.js Credentials handles sign-in and logout with an encrypted, HTTP-only JWT session cookie and an eight-hour maximum session age.
- Registration normalizes email, validates input, rejects duplicate emails, and stores only an Argon2id password hash.
- Login, registration, and password-change attempts are rate limited using database-backed counters.
- Profile and settings pages are protected by server-side session checks. Profile and password APIs independently authorize every request.
- Changing a password increments the user's session version, invalidating existing sessions.
- Authenticated APIs do not trust a client-provided `ownerId`; task ownership always comes from the server session.
- Rate-limit counters are stored in PostgreSQL and updated atomically, so limits are shared across serverless instances. Schedule periodic removal of expired `AuthRateLimit` rows to prevent unbounded table growth.
- Rate-limit IP keys rely on `x-real-ip`/`x-forwarded-for`; deploy behind a trusted platform proxy that replaces these headers and set `AUTH_TRUST_HOST=true`. Verify proxy behavior before relying on IP-based limits.
- The health endpoint is `GET /api/health`; it returns only availability status and uses `503` if the database check fails.
- Auth.js is currently `5.0.0-beta.32`; review its release notes and retest authentication before upgrading.
- Database mode has not been approved for public deployment. Complete the multi-user isolation and authentication checks below before exposing it publicly.

### Authentication and authorization checklist

1. Register a user; confirm invalid fields and duplicate email are rejected.
2. Sign in with valid credentials; confirm invalid credentials produce a generic error.
3. Sign out, then verify the dashboard, `/tasks`, `/profile`, and `/settings` redirect to `/login`.
4. Sign in and create, update, complete, and delete a task; confirm dashboard statistics update.
5. Register/sign in as a second user in a separate browser profile. Confirm that user's task list excludes the first user's tasks and that direct read, update, and delete attempts return `404`.
6. Update the profile name/email; verify duplicate email is rejected and the header reflects the updated name.
7. Change the password; verify the old password no longer works and a fresh sign-in with the new password succeeds.
8. Confirm mock mode still works without signing in by setting `NEXT_PUBLIC_API_MODE=mock`, starting JSON Server, and restarting Next.js.
9. Verify `/api/health` returns `200` with the database available and `503` during a controlled database outage, without including connection details.

## Production deployment

The production build requires `NEXT_PUBLIC_API_MODE=database`, a valid PostgreSQL `DATABASE_URL`, an `AUTH_SECRET` of at least 32 characters, and `AUTH_TRUST_HOST=true`. `DIRECT_URL` is needed only by the controlled migration step. Auth.js v5 derives the request URL from the trusted host; `AUTH_URL`/`NEXTAUTH_URL` is not required for this setup.

### Vercel

1. Keep the migration SQL files in the Git repository and verify all authentication/ownership checks before release.
2. Import the repository into Vercel and select Node.js 22.x.
3. Configure Production and Preview variables separately: `NEXT_PUBLIC_API_MODE=database`, `DATABASE_URL` (the appropriate Neon pooled URL), `AUTH_SECRET`, and `AUTH_TRUST_HOST=true`. Do not add `NEXT_PUBLIC_` to secrets. Do not add `DIRECT_URL` to general app runtime settings unless it is needed by the protected migration job.
4. Use the standard install/build commands (`npm ci`, `npm run build`). The postinstall and prebuild hooks generate Prisma Client; no migration is run during build or startup.
5. Before promoting a release, run the reviewed migrations as a separate, controlled job using `DIRECT_URL` and `npm run db:deploy`. Verify the Neon branch and migration status first.
6. Smoke-test `/login`, registration, authenticated task CRUD, user isolation, and `/api/health` against Preview before production promotion.

### Render (optional)

Use a standard Node.js web service; no separate Express server is needed.

- Runtime: Node.js 22.12 or newer
- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Health check path: `/api/health`
- Set the same production variables as Vercel. Render deployments must explicitly set `AUTH_TRUST_HOST=true`.
- Run `npm run db:deploy` as a separately reviewed migration step with the production `DIRECT_URL`; never run migrations automatically in the web service startup command.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npx prisma validate
npm run db:generate
npm run build
```

The optional unauthenticated API integration check requires a running app in database mode and does not create data:

```powershell
$env:TASKFLOW_TEST_BASE_URL = "http://localhost:3000"
npm run test:api-security
```
