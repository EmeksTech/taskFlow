# TaskFlow shared-data classroom demonstration

## Before class

- Use the already deployed TaskFlow application only after its additive PAT
  migration has been reviewed and applied through the approved, controlled
  migration process. The migration in this branch has not been applied.
- Give each student a dedicated TaskFlow account. Do not share passwords or
  tokens.
- Import `docs/postman/TaskFlow-REST-API.postman_collection.json` and
  `docs/postman/TaskFlow-REST-API.postman_environment.json`.
- For the React exercise, use the local Vite proxy and existing Auth.js login.
  Do not put a PAT in the React app.
- Keep each task created for the demonstration disposable.

## Demonstration

1. Student signs in to the TaskFlow website.
2. Student creates a disposable task in the dashboard and notes its title.
3. Student opens **Settings → Manage API tokens** and creates a short-lived
   token with `tasks:read`, `tasks:write`, and `profile:read`.
4. Student stores the raw token only in the local Postman environment's secret
   `accessToken` variable.
5. Student runs `GET /api/v1/me` and `GET /api/v1/tasks`; the task appears
   because the token resolves to the same TaskFlow user.
6. Student runs `PATCH /api/v1/tasks/{{taskId}}` to change the disposable
   task's title.
7. Student refreshes the TaskFlow dashboard and confirms the same change.
8. Student starts `classroom/taskflow-react-poc` in TaskFlow mode and signs in
   with the same TaskFlow account. The POC uses the Auth.js session proxy, not
   the PAT.
9. Student edits a task through React and refreshes the dashboard to see the
   persisted value.
10. Student revokes the Postman token and confirms subsequent Postman calls
    return `401`.
11. Student deletes only the disposable task, then verifies mock mode still
    loads independent JSON Server data.

The Next.js dashboard, Postman resource API, and React app call TaskFlow's
server-side Prisma services and the same Neon PostgreSQL database. The API
derives the owner from the authenticated session or validated token; it never
trusts a supplied `ownerId`. Updates become visible in another client after a
refetch/refresh; the system does not use realtime events.

## Teaching points

- A session cookie is not a bearer token. It is browser-managed and
  HTTP-only.
- A PAT is displayed once, stored as a digest, scoped, expiring, and revocable.
  Use it in Postman, not frontend code.
- OAuth access tokens for a browser public client require an authorization
  server and PKCE. TaskFlow's Auth.js Credentials provider does not issue them.
- CORS is a browser response-reading policy, not authentication.
- CSRF protects cookie-authenticated writes; do not remove it to fix an
  origin error.
- An authenticated user may access only their own tasks. A foreign task ID
  produces `404`.

## Troubleshooting

- `401`: confirm the correct account session or Postman environment/token.
- `403 INSUFFICIENT_SCOPE`: recreate the token with the necessary scope.
- `404` on `/api/v1/*`: confirm database mode and that the reviewed migration
  has been applied to the intended environment.
- `404` for a task: confirm the selected account owns that task.
- Local Vite write returns `403`: use the exact configured localhost port and
  do not disable the origin guard.
- Changes appear only after refresh: expected; clients refetch shared state.
