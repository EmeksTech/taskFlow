# TaskFlow

TaskFlow is a responsive task management dashboard built with Next.js App Router, TypeScript, and Tailwind CSS. Its dashboard and `/tasks` page share the same task service and can use either JSON Server or the development-only Prisma/Neon API.

## Requirements

- Node.js 22.12 or newer (required by the installed JSON Server version)
- npm

## Mock API mode (default)

Install dependencies:

```bash
npm install
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

The API base URL defaults to `http://localhost:3001`. To override it, set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. Set `NEXT_PUBLIC_API_MODE=mock` to use JSON Server.

## Database mode (development only)

Set these variables in `.env.local` (never use a `NEXT_PUBLIC_` prefix for database URLs):

- `NEXT_PUBLIC_API_MODE=database`
- `DATABASE_URL` to the Neon pooled connection URL used by the app
- `DIRECT_URL` to the Neon direct (non-pooler) connection URL used by Prisma migrations

Generate the Prisma client before starting the app:

```bash
npm run db:generate
npm run dev
```

The database API is intentionally available only while `NODE_ENV=development` and `NEXT_PUBLIC_API_MODE=database`. Do not expose this unauthenticated development API in a public deployment. No migration or seed is applied automatically.

After confirming that the configured Neon target is the intended development database, create and apply the initial migration:

```bash
npm run db:migrate
```

Prisma migrations use only `DIRECT_URL`; the Prisma config never falls back to the pooled runtime URL in `DATABASE_URL`. Confirm `DIRECT_URL` is the direct (non-pooler) URL for the intended development branch. To seed sample data, explicitly set `NODE_ENV=development` and `TASKFLOW_ALLOW_DEV_SEED=1` before running `npm run db:seed`. In PowerShell:

```powershell
$env:NODE_ENV = "development"
$env:TASKFLOW_ALLOW_DEV_SEED = "1"
npm run db:seed
```

The seed uses fixed UUIDs and skips existing rows; it does not update or delete existing data. Inspect the database with:

```bash
npm run db:studio
```

For mock mode, use the JSON Server and Next.js commands in the first section. To switch between sources, change `NEXT_PUBLIC_API_MODE` and restart Next.js. The database API uses the existing task response format, so the dashboard and task page continue to share the same data source.

## Database API

While running in database mode, the API provides:

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

### Manual endpoint checks (PowerShell)

With the development server running in database mode and the confirmed development database migrated:

```powershell
$base = "http://localhost:3000/api/tasks"
$body = @{
  title = "API smoke test"
  description = "Created from the manual API checklist"
  assignee = "Maya Johnson"
  category = "Testing"
  priority = "Medium"
  status = "Pending"
  dueDate = "2026-11-18"
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri $base -ContentType "application/json" -Body $body
Invoke-RestMethod -Method Get -Uri "$base/$($created.id)"
Invoke-RestMethod -Method Patch -Uri "$base/$($created.id)" -ContentType "application/json" -Body '{"status":"Completed"}'
Invoke-RestMethod -Method Delete -Uri "$base/$($created.id)"
```

Also verify that an invalid title returns `400`, a non-UUID ID returns `400`, and a valid but nonexistent UUID returns `404`. The route response on successful deletion is `204`.

## Migration target safety

Prisma migration commands require `DIRECT_URL`. Before running `npm run db:migrate`, verify that both URLs point to the intended Neon development branch. This project has no authentication yet: database routes are deliberately blocked outside development, but requests in development are unauthenticated. Do not deploy database mode publicly until authentication and authorization are implemented.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
