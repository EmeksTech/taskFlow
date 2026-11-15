# TaskFlow external REST API

## Architecture

TaskFlow keeps its existing Auth.js Credentials login and session-cookie
behavior for the Next.js dashboard and the local Vite classroom proxy. The
versioned `/api/v1/*` API is a separate resource server: it accepts explicit
TaskFlow personal access tokens (PATs) in `Authorization: Bearer ...` and does
not fall back to Auth.js cookies.

All clients use the same `User` and `Task` records in PostgreSQL. API routes
derive the user ID from the validated session or token and use owner-scoped
Prisma queries. Client-supplied `ownerId` is rejected by the existing strict
Zod task schemas.

## Personal access tokens

1. Sign in to TaskFlow and open **Settings → Manage API tokens**.
2. Give the token a name, select only the scopes the client needs, and choose
   an expiration from 1 to 365 days.
3. Copy the `tf_pat_...` value when it is shown. It is returned only on
   creation; TaskFlow stores only its SHA-256 digest.
4. Put the token in a secret Postman environment variable or another trusted
   server-side secret store. Do not put PATs in Vite `VITE_` variables,
   JavaScript source, browser storage, or a browser bundle.
5. Revoke a token from Settings when it is no longer needed. Revocation and
   expiration are checked on API requests.

Token creation and revocation require an Auth.js session and the existing
same-origin protection. They are rate limited using the shared PostgreSQL
rate-limit table. The dashboard lists only active tokens and shows a
non-secret prefix, scopes, dates, and last-use time.

### Scopes

| Scope | Allows |
| --- | --- |
| `tasks:read` | List and retrieve the authenticated user's tasks |
| `tasks:write` | Create, update, and delete the authenticated user's tasks |
| `profile:read` | Read the authenticated token owner's safe profile fields |

Scopes are independent. `tasks:write` does not implicitly grant `tasks:read`.
Use `profile:read` only when the client needs to call `GET /api/v1/me`.

## Endpoints

Every `/api/v1/*` endpoint requires a valid, unexpired, non-revoked bearer
token and is available only in database mode.

| Method | Path | Required scope | Success |
| --- | --- | --- | --- |
| `GET` | `/api/v1/me` | `profile:read` | `200`, safe user fields |
| `GET` | `/api/v1/tasks` | `tasks:read` | `200`, task array |
| `POST` | `/api/v1/tasks` | `tasks:write` | `201`, created task |
| `GET` | `/api/v1/tasks/:id` | `tasks:read` | `200`, owned task |
| `PATCH` | `/api/v1/tasks/:id` | `tasks:write` | `200`, updated task |
| `DELETE` | `/api/v1/tasks/:id` | `tasks:write` | `204`, no body |
| `OPTIONS` | `/api/v1/tasks` and `/api/v1/tasks/:id` | None | `204`, preflight headers |

`GET /api/v1/tasks` supports the existing query parameters: `status`,
`priority`, `category`, `assignee`, `dueBefore`, `dueAfter`, `sortBy`, and
`order`. Dates use `YYYY-MM-DD`; valid sort fields are `title`, `category`,
`priority`, `status`, `dueDate`, `createdAt`, and `updatedAt`; order is `asc` or
`desc`.

Task IDs are UUID strings. Task responses preserve the dashboard contract:

```json
{
  "id": "uuid",
  "title": "Prepare launch checklist",
  "description": "Review the release steps",
  "assignee": "Maya Johnson",
  "category": "Product",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2026-11-18"
}
```

`ownerId`, password hashes, token hashes, and database connection data are not
returned.

### Example requests

```http
GET /api/v1/tasks?status=Pending&sortBy=dueDate&order=asc
Authorization: Bearer tf_pat_REDACTED
Accept: application/json
```

```http
POST /api/v1/tasks
Authorization: Bearer tf_pat_REDACTED
Content-Type: application/json

{
  "title": "Prepare launch checklist",
  "description": "Review the release steps",
  "category": "Product",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2026-11-18"
}
```

### Errors

Errors use the same JSON envelope as the existing application:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "A valid bearer token is required."
  }
}
```

Common statuses:

- `400`: invalid UUID, JSON, query, or task fields.
- `401`: missing, invalid, expired, or revoked token.
- `403`: valid token lacks the required scope.
- `404`: task does not exist or is owned by someone else.
- `429`: token management rate limit reached.
- `500`: safe generic authentication or database failure.

## CORS, cookies, and CSRF

Only the bearer-token `/api/v1/*` routes return:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Authorization, Content-Type`

They do not return `Access-Control-Allow-Credentials`. `OPTIONS` preflights do
not require a token. Actual requests still require a valid bearer token and
scope. The routes ignore Auth.js cookies; CORS is not authentication or
authorization.

This CORS policy is not applied to `/api/auth/*`, `/api/tasks`, `/api/profile`,
or `/api/tokens`. Those are cookie/session routes with same-origin and Auth.js
CSRF protections. Never add wildcard credentialed CORS to them.

Auth.js session cookies are browser-managed, HTTP-only credentials for the
TaskFlow web application. PATs are revocable server-generated credentials for
trusted clients such as Postman. OAuth access tokens for a public React client
are not implemented. Auth.js Credentials is not an OAuth authorization server;
do not turn a PAT into a browser credential or add a custom password-to-JWT
endpoint.

## Migration and deployment state

The additive migration is
`prisma/migrations/20261115160000_personal_access_tokens/migration.sql`. It
creates the token scope enum and token table; it does not change or reassign
existing users or tasks. It was applied to the authorized Neon database for
integration testing. No deployment or production environment change was made.
Confirm the target schema before applying it anywhere else.

Generate and validate the client locally:

```powershell
npm run db:generate
npx prisma validate
```

After confirming a non-production target, the operator may apply it in a
development database with the repository's configured migration workflow.
Production requires separate approval and a controlled `npm run db:deploy`
step using the confirmed direct migration URL. Never run `db push`, reset, or
seed against production. The API will not work against a database until the
migration has been applied there.

## Testing

Run unit checks with `npm test`. The HTTP integration suite creates uniquely
named disposable accounts, tasks, and tokens against a local database-mode
app, and cleans up only those fixtures. It rejects non-loopback base URLs:

```powershell
$env:TASKFLOW_TEST_BASE_URL = "http://localhost:3100"
npm run test:api-security
```

The suite creates its own expired and revoked token fixtures. Do not point the
tests at a production URL.

## OAuth/PKCE status

OAuth 2.0 Authorization Code with PKCE is intentionally not implemented.
Auth.js manages TaskFlow's login/session but does not issue OAuth access tokens
for this app. A maintained authorization server must be selected and integrated
with the existing user identity before an independent browser SPA can safely
use OAuth. That infrastructure and any production auth changes require
separate approval.
