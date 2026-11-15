# TaskFlow API: Postman classroom guide

This guide uses the existing TaskFlow API and Auth.js Credentials provider. It
does not assume a `/api/login` endpoint. The examples default to the deployed
TaskFlow host; use a local or preview API first, and use only instructor-issued
test accounts and disposable tasks.

## API and REST basics

An API is a contract that lets one program request data or actions from another.
A REST API uses resource URLs and HTTP methods. An endpoint is one method plus a
URL, such as `GET /api/tasks`.

| Method | Meaning | TaskFlow example |
| --- | --- | --- |
| `GET` | Read data; should not change it | `GET /api/tasks` |
| `POST` | Create or perform an action | `POST /api/tasks` |
| `PATCH` | Partially update a resource | `PATCH /api/tasks/{id}` |
| `DELETE` | Delete a resource | `DELETE /api/tasks/{id}` |

JSON request bodies describe input. Headers describe the request and its
format. `Content-Type: application/json` tells the server to parse a JSON body;
`Accept: application/json` asks for a JSON response.

## Authentication versus authorization

- **Authentication** answers “Who is signed in?” Auth.js establishes a session
  after validating Credentials.
- **Authorization** answers “What may that signed-in user access?” TaskFlow
  scopes every task query and mutation to the user ID in the server session.
  The API ignores no ownership checks and does not accept `ownerId` from a
  client.
- Auth.js uses an HTTP-only session cookie. Do not copy it into a variable,
  share it, or put it in a request body. Postman’s cookie jar stores it for the
  current API host.
- Auth.js requires a CSRF token and matching cookie for its POST operations.
  Fetch `GET /api/auth/csrf` before signing in or out.

## Import and configure Postman

1. Import `docs/postman/TaskFlow-Classroom.postman_collection.json`.
2. Import `docs/postman/TaskFlow-Classroom.postman_environment.json`.
3. Select the **TaskFlow Classroom** environment.
4. Confirm `baseUrl`, `apiOrigin`, and `callbackUrl` point to the same
   instructor-approved TaskFlow host. For local/preview testing, change all
   three to that host and keep `callbackUrl` on the same host.
5. Add the instructor-provided account email and password as local-only
   environment secrets. Do not export or share them.
6. Do not import, export, copy, or share session cookies.

The collection has three folders: Authentication, Tasks, and Security tests.
Send authentication requests in the order below. Postman should retain the
cookies from the CSRF and Credentials responses in its cookie jar.

## Register a student account

The **Register student account** request calls `POST /api/register`. Set a new
test name, email, password, and matching confirmation in the selected local
Postman environment before sending it. Keep the password variables secret and
do not export the populated environment. Registration returns only public
account fields; it does not sign in or issue a personal access token. Sign in
through Auth.js for cookie-authenticated requests, or create a scoped personal
access token from the authenticated TaskFlow account for the versioned Bearer
API. Do not register against production unless the instructor explicitly
approves it.

## Log in through Auth.js

1. **Get authentication providers** — `GET /api/auth/providers`; confirm
   `credentials` is listed.
2. **Get CSRF token** — `GET /api/auth/csrf`; its test script stores the returned
   `csrfToken`. Auth.js also sets the corresponding CSRF cookie.
3. **Sign in with Credentials** — `POST /api/auth/callback/credentials` with
   `Content-Type: application/x-www-form-urlencoded`, the CSRF token, callback
   URL, email, password, and `X-Auth-Return-Redirect: 1`.
4. **Get current session** — `GET /api/auth/session`; the user object should
   contain public fields such as ID, name, and email, not `passwordHash`.

The `X-Auth-Return-Redirect` header makes Auth.js return redirect information as
JSON so Postman does not need to follow the browser redirect. A failed
Credentials attempt is reported in the returned URL; use the generic
“Credentials were accepted” test result rather than relying on a distinct
message for whether an email exists.

To sign out, first fetch a fresh CSRF token, then send **Sign out**. Follow with
`GET /api/auth/session`; it should return `null`. The cookie remains managed by
Postman and is cleared by Auth.js.

An Auth.js session has an eight-hour maximum age. The collection cannot safely
fast-forward that clock. To test natural expiry, use a dedicated account and
wait until after its session expires, then confirm a task request returns 401.
Changing that account's password invalidates sessions immediately; that is a
useful revocation test, but it is not the same as waiting for natural expiry.

## Perform task CRUD

Run **GET - List my tasks** while authenticated. It returns an array containing
only the current user's tasks.

**GET - Search, filter, and paginate tasks** demonstrates the session-auth
`GET /api/tasks` query contract. Set any combination of `search`, `status`,
`priority`, `assignee`, and date bounds `dueAfter`/`dueBefore`; set `page` and
`limit` to request a paginated envelope with `tasks`, `page`, `limit`, `total`,
and `totalPages`. Search is case-insensitive across title and description.
Date bounds are inclusive. The versioned `/api/v1/tasks` endpoint accepts the
same query parameters with a Bearer token. Without `page` or `limit`, list
endpoints keep the legacy array response.

For the CRUD exercise, use only a dedicated classroom account:

1. Send **POST - Create disposable task**. The collection saves the returned
   UUID `id` into `taskId`.
2. Send **GET - Retrieve task by ID**.
3. Send **PATCH - Update disposable task**. The title and status should change.
4. Confirm the change in TaskFlow after refreshing its dashboard.
5. Send **DELETE - Delete disposable task** only if you intend to permanently
   remove that task. It is explicitly labeled **DESTRUCTIVE**.

The task API accepts `title` (required; trimmed, 1–200 characters),
`description` (up to 5,000 characters), `assignee` (up to 120), `category` (up
to 100), `priority` (`Low`, `Medium`, `High`), `status` (`Pending`, `In
Progress`, `Completed`), and `dueDate` (empty or ISO `YYYY-MM-DD`). Unspecified
fields use the API's defaults. `ownerId` and unknown properties are rejected.

## Security exercises

### Unauthenticated request

Send **Sign out**, then **GET - Tasks without a session (401)**. Expected:
`401 UNAUTHENTICATED`. Sign in again before later authenticated tests.

### Cross-user ownership

1. Sign in as Account A and create a disposable task; retain its `taskId`.
2. Sign out, change to Account B's local-only environment credentials, fetch a
   fresh CSRF token, and sign in as Account B.
3. Run Account B's GET, PATCH, and DELETE checks against Account A's
   `taskId`. Each should return `404 NOT_FOUND`. The delete check is labeled
   destructive because it would remove the record if ownership enforcement
   regressed; use only the disposable record.

### Validation and Origin checks

- **POST - Invalid task body (400)** includes an empty title and a forbidden
  `ownerId`; it should return `400 VALIDATION_ERROR` and create nothing.
- **Auth.js - Invalid credentials are rejected** uses an intentionally
  nonexistent placeholder email and consumes a login rate-limit attempt. Run
  it only against local/preview or with instructor approval; the response
  should not reveal whether an account exists.
- **GET - Malformed task ID (400)** and **GET - Nonexistent task ID (404)**
  require a signed-in session.
- **PATCH - Untrusted Origin rejected (403)** uses an invalid empty patch. The
  origin check runs first; expected `403 INVALID_ORIGIN`.
- **POST - Missing Origin rejected (403)** deliberately omits `Origin`; expected
  `403 INVALID_ORIGIN`.

For ordinary Postman write requests, the collection sets `Origin` to the actual
API origin. Postman is an explicit HTTP client and does not enforce browser
CORS; this header does not make an unauthenticated request valid. Do not copy
this technique into browser code or rewrite a browser's `Origin`.

## Response codes and troubleshooting

| Status | Meaning here | First checks |
| --- | --- | --- |
| `400` | Invalid task JSON, UUID, or task input | Check JSON syntax, required title, enums, and dates. |
| `401` | Missing/expired session | Sign in again; confirm the cookie jar is enabled for the API host. |
| `403` | Missing or untrusted Origin | Use the actual API origin for Postman writes; do not remove server checks. |
| `404` | Unknown task, task owned by someone else, or API disabled in mock mode | Check the UUID, account, and server mode. A foreign task is intentionally hidden. |
| `405` | Method is not supported on that path | Use the method documented for the endpoint. |
| `429` | Rate limit reached | Wait for the limit window; do not repeatedly retry credentials. |
| `500` | Server-side failure | Give the instructor the request ID/time, not credentials, cookies, or response secrets. |

Postman and browser Fetch differ: browsers enforce CORS and restrict JavaScript
access to HTTP-only cookies; Postman does not enforce CORS and maintains its own
cookie jar. The API still checks authentication, CSRF, Origin, validation, and
ownership on the server.

Auth.js CSRF failures may be encoded as an error query parameter in the JSON
`url` returned when `X-Auth-Return-Redirect: 1` is used. Without that header,
Auth.js may return a redirect instead. Check the redirect error, not only the
HTTP status, when testing a missing or invalid Auth.js CSRF token.

## Exercises

1. List your tasks and identify the response status and JSON shape.
2. Create and retrieve a disposable task.
3. Change only its status with PATCH.
4. Compare a `400` validation response with a `401` authentication response.
5. Repeat the ownership exercise with Account B and explain why it receives 404
   instead of the task data.
6. Refresh the TaskFlow dashboard after a Postman update and explain why this
   is refetch-based synchronization, not realtime synchronization.
