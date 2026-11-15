# Postman REST API guide

Import `TaskFlow-REST-API.postman_collection.json` and
`TaskFlow-REST-API.postman_environment.json` from `docs/postman/`. They contain
no credentials and default to the local backend at `http://localhost:3100`.
Start the local Next.js app on that port before running requests. Change the
environment URL only when you have approval to use another backend.

## Prepare access

1. Sign in to the local TaskFlow app with a dedicated classroom account.
2. Open **Settings → API tokens** and create a short-lived token with only
   the scopes needed for the exercise.
3. Paste the token once into the Postman environment's `accessToken` secret
   variable. For scope checks, create a separate read-only token and set
   `readOnlyAccessToken`. Do not export the environment with real values.
4. For ownership checks, create a second disposable account and a separate
   token for it; set `accountBAccessToken` as a secret. Use Account B's token
   only for the request that creates its disposable task and the cleanup
   request.

The versioned API collection uses only the PAT in the
`Authorization: Bearer {{accessToken}}` header. Token issuance and revocation
happen in the authenticated dashboard, not in Postman.

## Exercises

1. **Verify identity:** run `GET /api/v1/me` with `profile:read`.
2. **Search, filter, and paginate:** set the environment values `search`,
   `status`, `priority`, `assignee`, `dueAfter`, `dueBefore`, `page`, and
   `limit`, then run the Bearer task-list request. Its response is an envelope
   containing `tasks`, `page`, `limit`, `total`, and `totalPages`.
3. **CRUD:** run the task `POST`, `GET`, and `PATCH`; the POST test stores the
   ID in `taskId`. Run its `DELETE` request only after the other checks.
4. **Check scopes and invalid input:** use the read-only token for the
   insufficient-scope request, and the read/write token for the invalid-body
   request. Expected statuses are `403` and `400`.
5. **Check authentication and CORS:** run the missing-token, invalid-token,
   and `OPTIONS` preflight requests. The preflight must not enable
   credentialed CORS.
6. **Check ownership:** create Account B's disposable task, then run Account
   A's GET/PATCH/DELETE checks. Each must return `404`; finish with Account B's
   cleanup request.

The owner cleanup/delete requests are destructive. Run them only for
disposable tasks created for this exercise; Account A's foreign-task DELETE
should return 404 and must not delete Account B's task. Revoke the PATs in
TaskFlow afterward.

## Task payload

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

Do not include `ownerId`; TaskFlow always derives ownership from the token.
Valid priorities are `Low`, `Medium`, `High`; statuses are `Pending`,
`In Progress`, `Completed`. A due date is `YYYY-MM-DD` or an empty string.

## Common failures

- `401`: token missing, malformed, expired, revoked, or not recognized. Confirm
  the environment is selected and the token was pasted correctly.
- `403 INSUFFICIENT_SCOPE`: create a token with the required scope.
- `404 NOT_FOUND`: the task may not belong to the current token owner.
- `400 VALIDATION_ERROR`: check task field names and allowed enum values.
- `404` for all API routes: database mode or the token migration may not be
  enabled on that deployment.

Never paste passwords, Auth.js cookies, or access tokens into shared requests,
screenshots, source control, or chat.
