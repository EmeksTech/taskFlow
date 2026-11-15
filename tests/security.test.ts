import assert from "node:assert/strict";
import test from "node:test";
import { getProductionConfigErrors } from "../src/lib/config/production";
import { registrationSchema, loginSchema } from "../src/lib/auth/validation";
import {
  createTaskSchema,
  taskQuerySchema,
} from "../src/lib/tasks/validation";
import {
  hasTaskPagination,
  parseTaskQuery,
} from "../src/lib/tasks/query";
import { ownedTaskWhere } from "../src/lib/tasks/authorization";
import { sameOriginFailure } from "../src/lib/tasks/http";
import { createPersonalAccessTokenSchema } from "../src/lib/auth/tokenValidation";
import {
  hasTokenScope,
  isPersonalAccessTokenActive,
  parseBearerToken,
} from "../src/lib/auth/tokenPrimitives";
import {
  externalApiOptions,
  withExternalApiCors,
} from "../src/lib/tasks/cors";
import {
  isStateChangingRequest,
  isTrustedTaskFlowProxyRequest,
} from "../classroom/taskflow-react-poc/src/proxy/originPolicy";

test("production config rejects mock mode and missing secrets", () => {
  const errors = getProductionConfigErrors({
    NEXT_PUBLIC_API_MODE: "mock",
  });

  assert.ok(errors.some((error) => error.includes("NEXT_PUBLIC_API_MODE")));
  assert.ok(errors.some((error) => error.includes("DATABASE_URL")));
  assert.ok(errors.some((error) => error.includes("AUTH_SECRET")));
  assert.ok(errors.some((error) => error.includes("AUTH_TRUST_HOST")));
});

test("production config rejects example placeholder credentials", () => {
  const errors = getProductionConfigErrors({
    NEXT_PUBLIC_API_MODE: "database",
    DATABASE_URL: "postgresql://USER:PASSWORD@HOST/DB?sslmode=require",
    AUTH_SECRET: "replace-with-at-least-32-random-characters",
    AUTH_TRUST_HOST: "true",
  });

  assert.ok(errors.some((error) => error.includes("DATABASE_URL")));
  assert.ok(errors.some((error) => error.includes("AUTH_SECRET")));
});

test("production config accepts database mode with required server configuration", () => {
  const errors = getProductionConfigErrors({
    NEXT_PUBLIC_API_MODE: "database",
    DATABASE_URL: "postgresql://runtime",
    AUTH_SECRET: "a".repeat(32),
    AUTH_TRUST_HOST: "true",
  });

  assert.deepEqual(errors, []);
});

test("registration validation rejects mismatched passwords and mass-assigned fields", () => {
  const mismatch = registrationSchema.safeParse({
    name: "TaskFlow User",
    email: "user@example.com",
    password: "A-long-password-123",
    confirmPassword: "different-password",
  });
  assert.equal(mismatch.success, false);

  const massAssignment = registrationSchema.safeParse({
    name: "TaskFlow User",
    email: "user@example.com",
    password: "A-long-password-123",
    confirmPassword: "A-long-password-123",
    role: "admin",
  });
  assert.equal(massAssignment.success, false);
});

test("login validation rejects malformed credentials and normalizes email", () => {
  assert.equal(
    loginSchema.safeParse({ email: "not-an-email", password: "secret" }).success,
    false,
  );
  assert.equal(
    loginSchema.safeParse({ email: "user@example.com", password: "" }).success,
    false,
  );
  assert.equal(
    loginSchema.parse({
      email: " USER@Example.COM ",
      password: "valid-password",
    }).email,
    "user@example.com",
  );
});

test("task validation rejects client-supplied ownership", () => {
  const result = createTaskSchema.safeParse({
    title: "Test task",
    ownerId: "another-user",
  });

  assert.equal(result.success, false);
});

test("task query validation supports search filters and bounded pagination", () => {
  const parsed = taskQuerySchema.safeParse({
    search: "  roadmap  ",
    status: "In Progress",
    priority: "High",
    assignee: "Student",
    dueAfter: "2026-11-01",
    dueBefore: "2026-11-30",
    page: "2",
    limit: "25",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.search, "roadmap");
    assert.equal(parsed.data.page, 2);
    assert.equal(parsed.data.limit, 25);
    assert.equal(parsed.data.status, "In Progress");
  }
  assert.equal(
    taskQuerySchema.safeParse({ status: "Finished" }).success,
    false,
  );
  assert.equal(taskQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(taskQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(
    taskQuerySchema.safeParse({ dueAfter: "not-a-date" }).success,
    false,
  );
});

test("task query parser preserves legacy arrays unless pagination is requested", () => {
  const filterOnly = new URLSearchParams("search=roadmap&status=Pending");
  const paginated = new URLSearchParams("search=roadmap&page=2&limit=5");
  assert.equal(hasTaskPagination(filterOnly), false);
  assert.equal(hasTaskPagination(paginated), true);

  const parsed = parseTaskQuery(paginated);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.search, "roadmap");
    assert.equal(parsed.data.page, 2);
    assert.equal(parsed.data.limit, 5);
  }
});

test("task access query always scopes a task ID to its owner", () => {
  assert.deepEqual(ownedTaskWhere("user-a"), { ownerId: "user-a" });
  assert.deepEqual(ownedTaskWhere("user-a", "task-1"), {
    ownerId: "user-a",
    id: "task-1",
  });
});

test("origin policy preserves same-origin writes and allows an explicit classroom origin", () => {
  const sameOrigin = new Request("https://taskflow.example/api/tasks", {
    method: "POST",
    headers: { origin: "https://taskflow.example" },
  });
  const classroomOrigin = new Request("https://taskflow.example/api/tasks", {
    method: "POST",
    headers: { origin: "http://localhost:5173" },
  });

  assert.equal(sameOriginFailure(sameOrigin), null);
  assert.equal(
    sameOriginFailure(classroomOrigin, "http://localhost:5173"),
    null,
  );
});

test("origin policy rejects missing, untrusted, and malformed origins", async () => {
  const request = new Request("https://taskflow.example/api/tasks", {
    method: "POST",
    headers: { origin: "http://localhost:5174" },
  });
  const missingOrigin = new Request("https://taskflow.example/api/tasks", {
    method: "POST",
  });

  assert.equal(sameOriginFailure(request, "http://localhost:5173")?.status, 403);
  assert.equal(sameOriginFailure(missingOrigin)?.status, 403);

  const invalidConfiguration = sameOriginFailure(
    request,
    "https://example.com/path",
  );
  assert.equal(invalidConfiguration?.status, 500);
  assert.deepEqual(await invalidConfiguration?.json(), {
    error: {
      code: "ORIGIN_CONFIGURATION_ERROR",
      message: "The request origin policy is misconfigured.",
    },
  });
});

test("personal access token validation rejects duplicate, empty, and unknown scopes", () => {
  const valid = createPersonalAccessTokenSchema.safeParse({
    name: "Postman",
    scopes: ["tasks:read", "profile:read"],
    expiresInDays: 30,
  });
  assert.equal(valid.success, true);

  assert.equal(
    createPersonalAccessTokenSchema.safeParse({
      name: "Postman",
      scopes: ["tasks:read", "tasks:read"],
      expiresInDays: 30,
    }).success,
    false,
  );
  assert.equal(
    createPersonalAccessTokenSchema.safeParse({
      name: "Postman",
      scopes: ["admin"],
      expiresInDays: 30,
    }).success,
    false,
  );
  assert.equal(
    createPersonalAccessTokenSchema.safeParse({
      name: "Postman",
      scopes: ["tasks:read"],
      expiresInDays: 366,
    }).success,
    false,
  );
});

test("bearer parsing rejects missing and malformed tokens", () => {
  const rawToken = `tf_pat_${"a".repeat(43)}`;
  assert.equal(parseBearerToken(`Bearer ${rawToken}`), rawToken);
  assert.equal(parseBearerToken(`bearer ${rawToken}`), rawToken);
  assert.equal(parseBearerToken(null), null);
  assert.equal(parseBearerToken("Bearer not-a-token"), null);
  assert.equal(parseBearerToken(`Bearer ${rawToken} extra`), null);
});

test("token expiration, revocation, and scopes are enforced", () => {
  const now = new Date("2026-11-15T12:00:00.000Z");
  assert.equal(
    isPersonalAccessTokenActive(
      { expiresAt: new Date("2026-11-16T12:00:00.000Z"), revokedAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isPersonalAccessTokenActive(
      { expiresAt: now, revokedAt: null },
      now,
    ),
    false,
  );
  assert.equal(
    isPersonalAccessTokenActive(
      {
        expiresAt: new Date("2026-11-16T12:00:00.000Z"),
        revokedAt: now,
      },
      now,
    ),
    false,
  );
  assert.equal(hasTokenScope(["tasks:read"], "tasks:read"), true);
  assert.equal(hasTokenScope(["tasks:read"], "tasks:write"), false);
});

test("external API CORS allows bearer headers without credentialed CORS", async () => {
  const response = withExternalApiCors(Response.json({ ok: true }));
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(
    response.headers.get("Access-Control-Allow-Methods"),
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  assert.equal(
    response.headers.get("Access-Control-Allow-Headers"),
    "Authorization, Content-Type",
  );
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);

  const preflight = externalApiOptions();
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");
});

test("TaskFlow Vite proxy rejects untrusted or missing origins on writes", () => {
  assert.equal(
    isTrustedTaskFlowProxyRequest(
      "POST",
      "http://localhost:5173",
      "http://localhost:5173",
    ),
    true,
  );
  assert.equal(
    isTrustedTaskFlowProxyRequest(
      "POST",
      "http://localhost:5174",
      "http://localhost:5173",
    ),
    false,
  );
  assert.equal(
    isTrustedTaskFlowProxyRequest(
      "POST",
      "http://localhost:5174",
      "http://localhost:5174",
    ),
    true,
  );
  assert.equal(
    isTrustedTaskFlowProxyRequest("POST", null, "http://localhost:5173"),
    false,
  );
  assert.equal(
    isTrustedTaskFlowProxyRequest(
      "GET",
      "http://localhost:5174",
      "http://localhost:5173",
    ),
    false,
  );
  assert.equal(
    isTrustedTaskFlowProxyRequest("GET", null, "http://localhost:5173"),
    true,
  );
  assert.equal(isStateChangingRequest("PATCH"), true);
  assert.equal(isStateChangingRequest("OPTIONS"), false);
});
