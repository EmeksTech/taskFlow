# TaskFlow classroom architecture

## Shared backend and database

```text
TaskFlow Dashboard ───┐
Postman ──────────────┼── HTTPS + Auth.js session ──> Next.js API
React + Vite ─────────┘                                  │
                                                        │ owner-scoped Prisma
                                                        v
                                                 Neon PostgreSQL
```

The Next.js dashboard, Postman, and the Vite proof of concept use the same
`/api/tasks` endpoints and the same database. Students never connect to Neon
directly. The server derives user identity from Auth.js, and all task operations
are scoped to that user. A client-supplied `ownerId` is rejected.

## TaskFlow authentication

The existing site uses Auth.js v5 Credentials authentication and an encrypted
JWT session in an HTTP-only cookie. Its lifetime is eight hours. Auth.js exposes
`/api/auth/providers`, `/api/auth/csrf`,
`/api/auth/callback/credentials`, `/api/auth/session`, and
`/api/auth/signout`. The login is a CSRF-protected URL-encoded POST; it is not a
custom `/api/login` endpoint.

The website's Server Action is not callable by a standalone Vite application.
The isolated POC uses the verified Auth.js HTTP flow through a Vite development
proxy. It fetches CSRF, posts Credentials to the callback, then fetches the
session. The browser manages the HTTP-only cookie; React neither reads nor
persists it. Sign-out obtains a CSRF token and calls Auth.js sign-out.

Logging into the Vercel-hosted TaskFlow site does not automatically sign in a
different local Vite origin. The student signs in in the Vite app using the
same TaskFlow account. The same account has the same server-side user ID, so
both frontends read the same owner-scoped task records.

## Vite API modes

### Mock mode

`VITE_API_MODE=mock` uses the existing root JSON Server at
`http://localhost:3001/tasks`. JSON Server is a teaching mock, not the shared
Neon database. Authentication is intentionally absent in this mode.

### TaskFlow mode

`VITE_API_MODE=taskflow` uses relative `/api/*` URLs. During local development,
Vite proxies those paths to `TASKFLOW_BACKEND_URL`, including both Auth.js and
task routes. The proxy uses `changeOrigin` for the upstream host but does not
rewrite the browser's Origin. Because the browser calls its own Vite origin,
CORS is not involved.

TaskFlow's mutation Origin check will reject a local Vite origin unless that
exact origin is explicitly present in the server-only
`TASKFLOW_ALLOWED_ORIGINS`. The variable is optional and empty by default;
production does not trust development origins by default. An instructor must
approve and set it in the chosen preview environment before running TaskFlow
mode. Do not add a wildcard, disable Auth.js CSRF, or change cookies to
`SameSite=None`.

The Auth.js production cookie is Secure, HTTP-only, host-only, and
`SameSite=Lax`. The Vite proxy makes the browser talk to localhost and returns
the cookie on that local host; the browser then sends it back through the
proxy. Verify the Secure cookie behavior on the browsers used in class before
relying on it. Browser cookies are not isolated by port: local processes on
different ports of `localhost` share the cookie scope. Run only trusted local
development servers while using this approach.

## CORS and separately hosted frontends

Direct browser requests from an unrelated Vite domain to Vercel are not the
recommended path. The current API has no CORS policy, and a cross-site Fetch
does not reliably send the host-only `SameSite=Lax` session cookie; browser
third-party cookie restrictions can block it even with `credentials: "include"`.
Adding wildcard CORS does not solve authentication and would be unsafe.

For a deployed teaching app, the lowest-risk option is to serve it under the
TaskFlow origin, for example through a Vercel path rewrite. If a standalone
public origin is required, design a real OAuth/OIDC Authorization Code + PKCE
or another explicitly scoped token exchange. Do not expose `AUTH_SECRET`,
database URLs, Auth.js's internal encrypted cookie, or long-lived client JWTs.

## Persistence and synchronization

Both clients call the same API. A Task created by Account A has
`Task.ownerId = User.id` for Account A. Signing into either client as that same
account causes the API to query the same rows. Account B gets only B's tasks;
an attempt to read or mutate A's task returns 404.

Changes persist in PostgreSQL, but persistence is not realtime synchronization.
After Postman or React changes a task, refresh or refetch in the other client to
see it. No WebSocket or push event system is implemented.
