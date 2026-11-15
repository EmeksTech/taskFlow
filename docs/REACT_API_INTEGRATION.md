# React API integration

## Current classroom option: Auth.js through the local Vite proxy

The existing React + Vite POC continues to authenticate with the existing
TaskFlow Auth.js Credentials provider. It does not get a database connection
or a PAT. The browser sends login, CSRF, session, sign-out, and task requests
to its own Vite origin; Vite proxies them to TaskFlow over HTTPS.

Configure `classroom/taskflow-react-poc/.env.local`:

```dotenv
VITE_API_MODE=taskflow
TASKFLOW_BACKEND_URL=https://task-flow-six-rouge.vercel.app
VITE_TASKFLOW_CALLBACK_URL=https://task-flow-six-rouge.vercel.app/
TASKFLOW_DEV_PORT=5173
```

Run `npm run dev` from the POC directory and open
`http://localhost:5173`. On the same computer, another app can use a different
local port by setting `TASKFLOW_DEV_PORT=5174` and opening
`http://localhost:5174`.

Localhost cookies are scoped to the host, not the port. Different Vite ports
have separate Origin checks but do not isolate Auth.js sessions in the same
browser profile. Use separate browser profiles when testing different student
accounts simultaneously on one computer.

In TaskFlow mode, the Vite dev server is bound to localhost, uses strict port
selection, and disables its CORS middleware. Before proxying API requests, its
origin guard rejects a different browser origin and requires the exact local
origin for writes. Only after that check does the proxy forward state-changing
requests with TaskFlow's own origin. This keeps the server-side same-origin
check active at the proxy trust boundary; Auth.js CSRF token/cookie validation
is still required. Do not expose this development server to a LAN or use this
proxy design as a production deployment.

No `TASKFLOW_ALLOWED_ORIGINS` production setting is needed. The proxy config
does not add broad cookie CORS or accept requests from arbitrary localhost
ports. Its per-instance origin is derived from the local `TASKFLOW_DEV_PORT`.

The Auth.js session cookie is HTTP-only and never read by React code. Because
the browser sees localhost as the response host, the dev proxy is a local
development boundary, not a way to share the production-domain browser cookie.
Each student signs in separately through the proxy.

## Versioned API and bearer clients

`/api/v1/*` is a bearer-token resource API and has wildcard non-credentialed
CORS so browser origins such as `localhost:5173` and `localhost:5174` do not
need to be individually registered for token-only requests. This does not make
a PAT safe to place in a React application. A PAT in source, a `VITE_`
variable, localStorage, or the browser bundle is exposed to every user of that
application.

The current React POC therefore does not call `/api/v1/*` with a PAT. A
production independent SPA needs a separately approved OAuth 2.0 Authorization
Code + PKCE authorization server, or a production backend-for-frontend that
keeps secrets on the server. Auth.js Credentials is not itself an OAuth
authorization server, and no password-to-JWT endpoint should be added.

The React task API interface remains separate from auth. Its current
`taskflow` implementation uses the same session-protected `/api/tasks`
contract; a future approved OAuth client can replace only the transport/auth
adapter without exposing credentials in task UI components.

## Cross-origin and security concepts

- **CORS** controls whether browser JavaScript may read a cross-origin response.
  It does not authenticate the caller. The wildcard policy is limited to
  bearer-only `/api/v1/*`.
- **CSRF** protects cookie-authenticated state-changing requests from another
  site. The Vite proxy requires its exact local origin and Auth.js keeps its
  CSRF checks. Do not disable either to make a request work.
- **Auth.js session cookie** is a browser-managed, HTTP-only credential for the
  web session.
- **PAT** is a long-lived, revocable secret for trusted tools; it is displayed
  once and its digest is stored.
- **OAuth access token** would be short-lived and issued to a public client
  after PKCE. TaskFlow does not issue one yet.
- **Postman** is a trusted manual client and can keep a PAT in a local secret
  environment. A browser app cannot keep that same secret from its users.

For the API contract and Postman exercises, see
[`TASKFLOW_EXTERNAL_API.md`](./TASKFLOW_EXTERNAL_API.md) and
[`POSTMAN_REST_API_GUIDE.md`](./POSTMAN_REST_API_GUIDE.md).

## Verification checklist

Use a dedicated non-production account and disposable task:

1. Confirm Vite shows the TaskFlow mode badge and Auth.js sign-in form.
2. Sign in and verify the session is retrieved through the proxy.
3. Confirm only that account's tasks load.
4. Create/update/delete a disposable task; verify in the Next.js dashboard.
5. From a terminal, send a write to the Vite proxy with `Origin:
   http://localhost:5174` while the proxy runs on 5173; it must return `403`.
6. Repeat with no Origin; state-changing requests must return `403`.
7. Verify Auth.js logout invalidates the session.
8. Re-run in mock mode and confirm JSON Server still works.

Full production login and CRUD verification requires a disposable account and
an approved test plan. Do not use production task mutations as a smoke test.
