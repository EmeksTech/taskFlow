# TaskFlow instructor demonstration guide

Use two dedicated classroom accounts and disposable tasks. Start with a local
or preview backend. The Vercel deployment and shared Neon data are not safe
targets for broad experiments. Never ask students to share passwords, cookies,
database URLs, or Auth.js secrets.

## Preparation

### Start TaskFlow and JSON Server locally

Use a `.env.local` configured by the instructor. For mock mode, it should
contain:

```dotenv
NEXT_PUBLIC_API_MODE=mock
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

From the repository root, open two PowerShell terminals:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open `http://localhost:3000`. If a separate local database-mode backend is
available for Auth.js/API teaching, use its confirmed environment and test
accounts; do not run migrations as part of this workshop.

### Start the Vite proof of concept in mock mode

In another terminal:

```powershell
Set-Location .\classroom\taskflow-react-poc
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the Vite address shown by the terminal (`http://localhost:5173`). Its mock
mode uses the same JSON Server endpoint but does not use authentication or Neon.

### Enable TaskFlow API mode only after approval

For a controlled preview, configure its server-side
`TASKFLOW_ALLOWED_ORIGINS` with the exact Vite origin, for example
`http://localhost:5173`. The server's default remains same-origin only. Do not
change production variables or deploy as part of this guide.

Set the POC `.env.local`:

```dotenv
VITE_API_MODE=taskflow
TASKFLOW_BACKEND_URL=https://task-flow-six-rouge.vercel.app
VITE_TASKFLOW_CALLBACK_URL=https://task-flow-six-rouge.vercel.app/
```

Restart Vite after changing environment values. This proxy approach is for
trusted local development. Use only instructor-approved test accounts and
disposable records. Direct cross-origin Fetch is not supported by this plan.

## Demo 1 — REST with Postman

Import the collection and environment from `docs/postman/`. Explain that
`GET /api/tasks` reads a resource, `POST` creates, `PATCH` partially updates,
and `DELETE` removes. Open **Get authentication providers**, then **Get CSRF
token**, and point out the JSON response and cookie jar.

## Demo 2 — JSON Server mock

With JSON Server and Vite running in mock mode:

1. Refresh the React page and observe the mock tasks.
2. Edit a task title and save.
3. Refresh the Vite page and confirm the mock record persists.
4. Explain that this mock endpoint is not the Neon database.

Expected: API calls use `http://localhost:3001/tasks`; no TaskFlow login is
required.

## Demo 3 — Postman Auth.js login

1. Select the approved `baseUrl` and enter a test user's credentials in local
   Postman environment secrets.
2. Send **Get authentication providers**.
3. Send **Get CSRF token**. Explain that the token value and cookie work as a
   pair.
4. Send **Sign in with Credentials**. Its request is URL-encoded and includes
   `X-Auth-Return-Redirect: 1`; Auth.js returns JSON redirect data rather than
   requiring Postman to browse a page.
5. Send **Get current session** and inspect the public user fields.
6. Do not copy the session cookie into a header or share it.

## Demo 4 — Postman CRUD and shared persistence

Create a disposable task with **POST - Create disposable task**. The test saves
its UUID to `taskId`. Use GET by ID, PATCH, then check the dashboard after a
refresh. Explain that refreshing refetches persisted data; it is not realtime.
Use **DELETE - Delete disposable task** only when ready to permanently remove
that one test record.

## Demo 5 — React TaskFlow integration

With TaskFlow mode configured and the exact local origin explicitly approved in
the preview environment:

1. Set `VITE_API_MODE=taskflow` and restart Vite.
2. Sign in with the same test user's TaskFlow credentials.
3. Confirm the session-backed task list matches the Postman and dashboard data.
4. Edit a task title in React.
5. Refresh TaskFlow and confirm the update.
6. Sign out in React; refresh the page and confirm it returns to sign-in.

Network requests should go to the Vite origin and be proxied to TaskFlow.
The React app must never contact PostgreSQL or receive database credentials.

## Demo 6 — Two-user authorization

1. Sign in as Account A, create a clearly named disposable task, and retain its
   UUID.
2. Sign out and sign in as Account B, using a separate browser profile or
   Postman cookie session.
3. List B's tasks and confirm A's task is absent.
4. Try GET, PATCH, and DELETE by A's UUID. Expect `404` for each.
5. Verify the task remains unchanged under Account A.

The delete test is potentially destructive if ownership enforcement is broken;
use only the disposable record. Do not test against another student's task.

## Demo 7 — Security and common errors

Run the Security tests folder with the documented setup:

- `401`: sign out first; request has no authenticated session.
- `403`: missing or untrusted `Origin` on a mutation.
- `400`: invalid task input.
- `404`: unknown task or task not owned by the current user.
- `429`: rate limit; wait rather than retrying repeatedly.

Show **PATCH - Untrusted Origin rejected** with an empty body. The API checks
Origin before parsing that body, so the expected `403` cannot mutate data.

Postman is not a browser: it does not enforce CORS and lets an explicit client
set request headers, while browser JavaScript cannot forge `Origin` and cannot
read HTTP-only cookies. Server authentication, CSRF, Origin, and ownership
checks still run in either case.

## Student exercises

1. Use GET to compare mock and TaskFlow task JSON.
2. Create a mock task, refresh, then edit it.
3. Sign in through Postman and explain the role of CSRF.
4. Update a disposable TaskFlow task from Postman, then refetch in React.
5. Use Account B to test ownership and explain why the response hides the
   foreign task as 404.
6. Explain why adding `Access-Control-Allow-Origin: *` would not provide
   authenticated cross-origin access.

## Short assignments

- Add a task filter to the React app using the existing GET query contract.
- Add a loading and error state for a failed API request.
- Capture a request/response pair in Postman with secrets and cookies removed.
- Write a short explanation of authentication versus authorization.

Do not run automatic cleanup or test scripts against real user records.
