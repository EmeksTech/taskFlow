# TaskFlow API reference

**Base URL:** `https://task-flow-six-rouge.vercel.app` (replace with an
instructor-approved local or preview host when testing). Database endpoints
require `NEXT_PUBLIC_API_MODE=database`. Do not give students database
credentials.

All JSON errors have this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "details": [{ "path": "title", "message": "Enter a task title." }]
  }
}
```

`details` is optional. Database/authorization errors do not return internal
stack traces or connection strings.

## Authentication: Auth.js v5 Credentials

There is **no** conventional `POST /api/login` endpoint. The installed Auth.js
5 beta implementation exposes these endpoints through the existing
`/api/auth/[...nextauth]` Route Handler:

| Method and path | Purpose | Request/response |
| --- | --- | --- |
| `GET /api/auth/providers` | Discover enabled providers | JSON object keyed by provider ID; `credentials` should be present. |
| `GET /api/auth/csrf` | Start a protected Auth.js POST | JSON `{ "csrfToken": "..." }`; sets the matching CSRF cookie. |
| `POST /api/auth/callback/credentials` | Authenticate | URL-encoded `csrfToken`, `callbackUrl`, `email`, and `password`; include `X-Auth-Return-Redirect: 1`. Auth.js returns JSON redirect information and sets the session cookie on success. |
| `GET /api/auth/session` | Check current session | JSON session or `null`. Public session data contains user ID, name, email, and expiration; password hashes are not included. |
| `POST /api/auth/signout` | End the session | URL-encoded `csrfToken` and `callbackUrl`; include `X-Auth-Return-Redirect: 1`. Auth.js clears the session cookie and returns redirect information. |

Keep the cookie jar enabled. Fetch a fresh CSRF token before each sign-in or
sign-out POST. Do not expose cookies to frontend JavaScript or copy them into
shared Postman files. Auth.js owns its CSRF checks and cookie policy.

## Tasks

| Method and path | Authentication | Request | Success |
| --- | --- | --- | --- |
| `GET /api/tasks` | Required | Optional query parameters below | `200`, task array; paginated envelope when `page` or `limit` is present |
| `POST /api/tasks` | Required; same-origin or explicitly trusted Origin | JSON task fields | `201`, created task |
| `GET /api/tasks/{id}` | Required; owner-scoped | UUID path parameter | `200`, task |
| `PATCH /api/tasks/{id}` | Required; owner-scoped; same-origin or explicitly trusted Origin | Non-empty JSON subset of task fields | `200`, updated task |
| `DELETE /api/tasks/{id}` | Required; owner-scoped; same-origin or explicitly trusted Origin | UUID path parameter | `204`, no body |

For database-backed requests, `GET` requires a valid Auth.js session and returns
only tasks belonging to that session user. `POST` derives owner ID only from
the server session. Item reads, updates, and deletes constrain the query by
both task UUID and owner ID. Missing and other users' tasks both return
`404 NOT_FOUND`.

### Task representation

```json
{
  "id": "c1fd7bab-8265-4e40-85f4-4c8f6125ef3a",
  "title": "Learn REST API with Postman",
  "description": "Testing the TaskFlow API",
  "assignee": "Classroom Student",
  "category": "Training",
  "priority": "High",
  "status": "Pending",
  "dueDate": "2026-11-18"
}
```

IDs are strings in the shared frontend contract and UUIDs in database mode.
Prisma enum values are translated to/from title case. Dates are serialized as
`YYYY-MM-DD`; an unset date is `""`. The API does not include `ownerId`.

### Task input rules

- `title`: required on create; trimmed, 1–200 characters.
- `description`: optional, up to 5,000 characters.
- `assignee`: optional, up to 120 characters.
- `category`: optional, up to 100 characters.
- `priority`: optional; `Low`, `Medium`, or `High`.
- `status`: optional; `Pending`, `In Progress`, or `Completed`.
- `dueDate`: optional; `""` or valid ISO date `YYYY-MM-DD`.
- PATCH requires at least one valid task field.
- Unknown fields, including `ownerId`, are rejected.
- List query parameters: `status`, `priority`, `category`, `assignee`,
  `dueBefore`, `dueAfter`, `search`, `page`, `limit`, `sortBy`, and `order`.
  Search matches title or description case-insensitively. Date bounds are
  inclusive. Supported sort keys are
  `title`, `category`, `priority`, `status`, `dueDate`, `createdAt`, and
  `updatedAt`; `order` is `asc` or `desc`.
- Pagination is opt-in for backwards compatibility. Supplying either `page`
  or `limit` returns `{ "tasks": [], "page": 1, "limit": 10, "total": 0,
  "totalPages": 0 }`; defaults are page 1 and limit 10, with a maximum limit
  of 100. Without either parameter, the endpoint continues returning a task
  array.

### Task status codes

`400` invalid task input or UUID; `401` unauthenticated; `403` missing/untrusted
Origin for mutations; `404` unknown or not-owned task; `500` safe database
failure. `POST` returns `201`; delete returns `204`. Auth.js may encode CSRF
failure in the redirect URL when `X-Auth-Return-Redirect: 1` is used, rather
than returning a task API `400` response.

## Accounts and profile

| Method and path | Authentication | Contract |
| --- | --- | --- |
| `POST /api/register` | No session; same-origin or explicitly trusted Origin | JSON `{ name, email, password, confirmPassword }`; returns `201` with `{ id, name, email, createdAt }`. Duplicate email is `409`; validation is `400`; rate limit is `429`. |
| `GET /api/profile` | Required | Returns `{ id, name, email, createdAt }` for the session user. |
| `PATCH /api/profile` | Required; same-origin or explicitly trusted Origin | JSON with `name`, `email`, or both. Returns the updated public profile; duplicate email is `409`. |
| `POST /api/profile/password` | Required; same-origin or explicitly trusted Origin | JSON `{ currentPassword, newPassword, confirmNewPassword }`; current password is verified, then sessions are invalidated. |

Registration and profile APIs never return password hashes. Names are 2–100
characters; normalized emails must be valid and at most 320 characters.
Registration/password-change passwords must be 12–128 characters.

## Availability

`GET /api/health` returns `200 { "status": "ok" }` when available and `503
{ "status": "unavailable" }` on database unavailability. It does not expose
connection details.

## Origin and CORS policy

The current API does not enable CORS. Mutations require an `Origin` matching the
API request origin. The optional server-only `TASKFLOW_ALLOWED_ORIGINS` accepts
a comma-separated list of exact bare HTTP(S) origins; it is unset by default.
Unknown and missing origins are rejected. This is an Origin check, not an
authentication substitute. Vite proxy requests need an explicit trusted-origin
entry for their local origin; they do not need CORS headers. Never wildcard the
list or rewrite a browser's Origin header.

In mock mode, `/api/tasks` and Auth.js endpoints are not the classroom backend;
the student Vite mock mode instead calls JSON Server. No endpoint gives a
student direct database access.
