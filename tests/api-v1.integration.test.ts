import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { loadEnvConfig } from "@next/env";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import WebSocket from "ws";

const configuredBaseUrl = process.env.TASKFLOW_TEST_BASE_URL;
let baseUrl: URL | null = null;
let skipReason: string | false = false;

if (!configuredBaseUrl) {
  skipReason = "Set TASKFLOW_TEST_BASE_URL to a local database-mode test server.";
} else {
  try {
    const parsedUrl = new URL(configuredBaseUrl);
    if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsedUrl.hostname)) {
      skipReason = "Integration tests only run against a loopback test server.";
    } else {
      baseUrl = parsedUrl;
    }
  } catch {
    skipReason = "TASKFLOW_TEST_BASE_URL must be a valid loopback URL.";
  }
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
}

interface ApiToken {
  token: string;
  accessToken: {
    id: string;
    tokenPrefix: string;
  };
}

interface TaskRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: string;
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  absorb(response: Response) {
    const headers = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies = headers.getSetCookie?.() ?? [
      response.headers.get("set-cookie") ?? "",
    ];

    for (const setCookie of setCookies) {
      const pair = setCookie.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;

      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (!value || /max-age=0/i.test(setCookie)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

const runId = randomUUID();
const testAddress = `2001:db8:${runId.replaceAll("-", "").slice(0, 4)}:${runId.replaceAll("-", "").slice(4, 8)}::1`;
const marker = `tf-integration-${runId}`;
const passwordA = `TaskFlow!${runId}A`;
const passwordB = `TaskFlow!${runId}B`;
const emailA = `${marker}-a@example.com`;
const emailB = `${marker}-b@example.com`;
const accountIds = new Set<string>();
let prisma: PrismaClient | undefined;
let secret: string | undefined;
let userA: PublicUser | undefined;
let userB: PublicUser | undefined;
let sessionA: CookieJar | undefined;
let sessionB: CookieJar | undefined;
let readWriteToken: ApiToken | undefined;
let readOnlyToken: ApiToken | undefined;
let profileOnlyToken: ApiToken | undefined;
let expiredToken: ApiToken | undefined;
let revokedToken: ApiToken | undefined;
let readWriteTokenB: ApiToken | undefined;

function endpoint(path: string) {
  if (!baseUrl) throw new Error("A local TASKFLOW_TEST_BASE_URL is required.");
  return new URL(path, baseUrl);
}

function requestHeaders(cookieJar?: CookieJar) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Real-IP": testAddress,
  };
  if (cookieJar?.header()) headers.Cookie = cookieJar.header();
  return headers;
}

async function registerAccount(email: string, password: string) {
  const response = await fetch(endpoint("/api/register"), {
    method: "POST",
    headers: {
      ...requestHeaders(),
      Origin: baseUrl!.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "TaskFlow Integration Student",
      email,
      password,
      confirmPassword: password,
    }),
  });
  return response;
}

async function signIn(email: string, password: string) {
  const jar = new CookieJar();
  const providersResponse = await fetch(endpoint("/api/auth/providers"), {
    headers: requestHeaders(),
  });
  assert.equal(providersResponse.status, 200);
  assert.ok((await providersResponse.json()).credentials);

  const csrfResponse = await fetch(endpoint("/api/auth/csrf"), {
    headers: requestHeaders(jar),
  });
  assert.equal(csrfResponse.status, 200);
  jar.absorb(csrfResponse);
  const csrf = (await csrfResponse.json()) as { csrfToken: string };

  const callbackResponse = await fetch(
    endpoint("/api/auth/callback/credentials"),
    {
      method: "POST",
      headers: {
        ...requestHeaders(jar),
        Origin: baseUrl!.origin,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        callbackUrl: `${baseUrl!.origin}/`,
        email,
        password,
      }),
    },
  );
  assert.equal(callbackResponse.status, 200);
  jar.absorb(callbackResponse);
  const callback = (await callbackResponse.json()) as { url: string };
  assert.equal(new URL(callback.url, baseUrl!.origin).searchParams.has("error"), false);

  const sessionResponse = await fetch(endpoint("/api/auth/session"), {
    headers: requestHeaders(jar),
  });
  assert.equal(sessionResponse.status, 200);
  const session = await sessionResponse.json();
  assert.ok(session.user?.id);
  assert.equal(session.user.email, email);
  assert.equal("passwordHash" in session.user, false);
  return jar;
}

async function createToken(
  jar: CookieJar,
  name: string,
  scopes: string[],
): Promise<ApiToken> {
  const response = await fetch(endpoint("/api/tokens"), {
    method: "POST",
    headers: {
      ...requestHeaders(jar),
      Origin: baseUrl!.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, scopes, expiresInDays: 30 }),
  });
  if (response.status !== 201) {
    assert.equal(response.status, 201, await response.text());
  }
  const token = (await response.json()) as ApiToken;
  assert.match(token.token, /^tf_pat_[A-Za-z0-9_-]{43}$/);
  assert.equal("tokenHash" in token.accessToken, false);
  return token;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function createBearerTask(token: string, task: Omit<TaskRecord, "id">) {
  const response = await fetch(endpoint("/api/v1/tasks"), {
    method: "POST",
    headers: {
      ...bearer(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
  assert.equal(response.status, 201);
  return (await response.json()) as TaskRecord;
}

async function createCookieTask(jar: CookieJar) {
  const response = await fetch(endpoint("/api/tasks"), {
    method: "POST",
    headers: {
      ...requestHeaders(jar),
      Origin: baseUrl!.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `${marker} foreign-owned`,
      description: "Owned by the second integration account",
      assignee: "Student B",
      category: "Integration",
      priority: "Low",
      status: "Pending",
      dueDate: "2027-01-15",
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()) as TaskRecord;
}

async function signOut(jar: CookieJar) {
  const csrfResponse = await fetch(endpoint("/api/auth/csrf"), {
    headers: requestHeaders(jar),
  });
  assert.equal(csrfResponse.status, 200);
  jar.absorb(csrfResponse);
  const csrf = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(endpoint("/api/auth/signout"), {
    method: "POST",
    headers: {
      ...requestHeaders(jar),
      Origin: baseUrl!.origin,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      callbackUrl: `${baseUrl!.origin}/`,
    }),
  });
  assert.equal(response.status, 200);
  jar.absorb(response);
}

function rateLimitHash(bucket: string) {
  if (!secret) throw new Error("AUTH_SECRET must be configured for tests.");
  return createHmac("sha256", secret).update(bucket).digest("hex");
}

before(async () => {
  if (skipReason) return;

  loadEnvConfig(process.cwd());
  if (process.env.NEXT_PUBLIC_API_MODE !== "database") {
    throw new Error("Integration tests require database mode.");
  }
  secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET must be set for integration tests.");

  const runtimeUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  if (!runtimeUrl || !directUrl) {
    throw new Error("Both database URLs must be configured.");
  }
  const runtimeTarget = new URL(runtimeUrl);
  const directTarget = new URL(directUrl);
  const normalizedHost = (host: string) =>
    host.replace(/-pooler(?=\.|$)/, "").toLowerCase();
  if (
    !runtimeTarget.hostname.endsWith(".neon.tech") ||
    !directTarget.hostname.endsWith(".neon.tech") ||
    normalizedHost(runtimeTarget.hostname) !== normalizedHost(directTarget.hostname) ||
    runtimeTarget.pathname !== directTarget.pathname
  ) {
    throw new Error("Integration test URLs do not identify the same Neon database.");
  }

  const health = await fetch(endpoint("/api/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  neonConfig.webSocketConstructor = WebSocket;
  prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: runtimeUrl }),
  });
  await prisma.$connect();
});

after(async () => {
  const ids = [...accountIds];
  if (prisma && ids.length > 0) {
    const ownedTasks = await prisma.task.findMany({
      where: { ownerId: { in: ids } },
      select: { id: true },
    });
    await prisma.task.deleteMany({
      where: { id: { in: ownedTasks.map((task) => task.id) } },
    });
    await prisma.personalAccessToken.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });

    const buckets = [
      `register:${testAddress}`,
      `login-ip:${testAddress}`,
      `login-account:${testAddress}:${emailA}`,
      `login-account:${testAddress}:${emailB}`,
      ...ids.map((id) => `personal-token-create:${id}`),
      ...ids.map((id) => `personal-token-revoke:${id}`),
    ];
    await prisma.authRateLimit.deleteMany({
      where: { key: { in: buckets.map(rateLimitHash) } },
    });
  }

  await prisma?.$disconnect();
});

test("registration creates disposable accounts and rejects invalid or duplicate input", {
  skip: skipReason,
}, async () => {
  const invalid = await fetch(endpoint("/api/register"), {
    method: "POST",
    headers: {
      ...requestHeaders(),
      Origin: baseUrl!.origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Bad", email: "not-an-email", password: "short" }),
  });
  assert.equal(invalid.status, 400);

  const responseA = await registerAccount(emailA, passwordA);
  assert.equal(responseA.status, 201);
  userA = (await responseA.json()) as PublicUser;
  accountIds.add(userA.id);
  assert.equal("passwordHash" in userA, false);

  const duplicate = await registerAccount(emailA, passwordA);
  assert.equal(duplicate.status, 409);

  const responseB = await registerAccount(emailB, passwordB);
  assert.equal(responseB.status, 201);
  userB = (await responseB.json()) as PublicUser;
  accountIds.add(userB.id);
  assert.equal("passwordHash" in userB, false);
});

test("Auth.js credentials establish isolated sessions and tokens can be created", {
  skip: skipReason,
}, async () => {
  assert.ok(userA);
  assert.ok(userB);
  sessionA = await signIn(emailA, passwordA);
  sessionB = await signIn(emailB, passwordB);

  const ownerA = (await (await fetch(endpoint("/api/auth/session"), {
    headers: requestHeaders(sessionA),
  })).json()).user;
  const ownerB = (await (await fetch(endpoint("/api/auth/session"), {
    headers: requestHeaders(sessionB),
  })).json()).user;
  assert.equal(ownerA.id, userA.id);
  assert.equal(ownerB.id, userB.id);
  assert.notEqual(ownerA.id, ownerB.id);

  readWriteToken = await createToken(sessionA, `${marker}-rw`, [
    "tasks:read",
    "tasks:write",
    "profile:read",
  ]);
  readOnlyToken = await createToken(sessionA, `${marker}-read`, ["tasks:read"]);
  profileOnlyToken = await createToken(sessionA, `${marker}-profile`, ["profile:read"]);
  expiredToken = await createToken(sessionA, `${marker}-expired`, ["tasks:read"]);
  revokedToken = await createToken(sessionA, `${marker}-revoked`, ["tasks:read"]);
  readWriteTokenB = await createToken(sessionB, `${marker}-owner-b`, [
    "tasks:read",
    "tasks:write",
  ]);

  assert.ok(prisma);
  await prisma.personalAccessToken.update({
    where: { id: expiredToken.accessToken.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });

  const revokeResponse = await fetch(
    endpoint(`/api/tokens/${encodeURIComponent(revokedToken.accessToken.id)}`),
    {
      method: "DELETE",
      headers: {
        ...requestHeaders(sessionA),
        Origin: baseUrl!.origin,
      },
    },
  );
  assert.equal(revokeResponse.status, 204);
});

test("unauthorized tokens, expiry, revocation, scopes, and CORS are enforced", {
  skip: skipReason,
}, async () => {
  assert.ok(readWriteToken);
  assert.ok(readOnlyToken);
  assert.ok(profileOnlyToken);
  assert.ok(expiredToken);
  assert.ok(revokedToken);

  const missing = await fetch(endpoint("/api/v1/tasks"));
  assert.equal(missing.status, 401);
  const invalid = await fetch(endpoint("/api/v1/tasks"), {
    headers: bearer(`tf_pat_${"a".repeat(43)}`),
  });
  assert.equal(invalid.status, 401);

  for (const token of [expiredToken.token, revokedToken.token]) {
    const response = await fetch(endpoint("/api/v1/tasks"), {
      headers: bearer(token),
    });
    assert.equal(response.status, 401);
  }

  const deniedWrite = await fetch(endpoint("/api/v1/tasks"), {
    method: "POST",
    headers: {
      ...bearer(readOnlyToken.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: `${marker} blocked write` }),
  });
  assert.equal(deniedWrite.status, 403);
  assert.equal((await deniedWrite.json()).error.code, "INSUFFICIENT_SCOPE");

  const deniedProfile = await fetch(endpoint("/api/v1/me"), {
    headers: bearer(readOnlyToken.token),
  });
  assert.equal(deniedProfile.status, 403);

  const deniedTaskList = await fetch(endpoint("/api/v1/tasks"), {
    headers: bearer(profileOnlyToken.token),
  });
  assert.equal(deniedTaskList.status, 403);

  const preflight = await fetch(endpoint("/api/v1/tasks"), {
    method: "OPTIONS",
    headers: {
      Origin: "http://localhost:5174",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(preflight.headers.get("Access-Control-Allow-Credentials"), null);
});

test("GET /api/v1/me returns only the authenticated user's public profile", {
  skip: skipReason,
}, async () => {
  assert.ok(readWriteToken);
  assert.ok(userA);
  const response = await fetch(endpoint("/api/v1/me"), {
    headers: bearer(readWriteToken.token),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, userA.id);
  assert.equal(body.email, emailA);
  assert.equal("passwordHash" in body, false);
});

test("task CRUD, ownership, validation, search, filters, and pagination work", {
  skip: skipReason,
}, async () => {
  assert.ok(readWriteToken);
  assert.ok(readWriteTokenB);
  assert.ok(sessionB);

  const foreignTask = await createCookieTask(sessionB);

  const alpha = await createBearerTask(readWriteToken.token, {
    title: `${marker} Alpha`,
    description: `Description lighthouse-${runId}`,
    status: "Pending",
    priority: "High",
    assignee: "Student Alice",
    category: "Integration",
    dueDate: "2027-01-15",
  });
  const beta = await createBearerTask(readWriteToken.token, {
    title: `${marker} Beta`,
    description: "Second integration record",
    status: "Completed",
    priority: "Low",
    assignee: "Student Bob",
    category: "Integration",
    dueDate: "2027-01-25",
  });
  const gamma = await createBearerTask(readWriteToken.token, {
    title: `${marker} Gamma`,
    description: "Third integration record",
    status: "In Progress",
    priority: "Medium",
    assignee: "Student Alice",
    category: "Integration",
    dueDate: "2027-02-01",
  });

  const list = await fetch(endpoint("/api/v1/tasks"), {
    headers: bearer(readWriteToken.token),
  });
  assert.equal(list.status, 200);
  const ownedTasks = (await list.json()) as TaskRecord[];
  assert.deepEqual(
    new Set(ownedTasks.map((task) => task.id)),
    new Set([alpha.id, beta.id, gamma.id]),
  );

  const titleSearch = await fetch(
    endpoint(`/api/v1/tasks?search=${encodeURIComponent(marker)}`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(titleSearch.status, 200);
  assert.equal(((await titleSearch.json()) as TaskRecord[]).length, 3);

  const descriptionSearch = await fetch(
    endpoint(`/api/v1/tasks?search=${encodeURIComponent(`lighthouse-${runId}`)}`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(descriptionSearch.status, 200);
  assert.deepEqual(
    ((await descriptionSearch.json()) as TaskRecord[]).map((task) => task.id),
    [alpha.id],
  );

  const filters: Array<[string, string[]]> = [
    ["status=Pending", [alpha.id]],
    ["priority=High", [alpha.id]],
    ["assignee=alice", [alpha.id, gamma.id]],
    ["dueAfter=2027-01-20&dueBefore=2027-02-01", [beta.id, gamma.id]],
  ];
  for (const [filter, expectedIds] of filters) {
    const filteredResponse: Response = await fetch(
      endpoint(`/api/v1/tasks?search=${encodeURIComponent(marker)}&${filter}`),
      { headers: bearer(readWriteToken.token) },
    );
    assert.equal(filteredResponse.status, 200, filter);
    const result = (await filteredResponse.json()) as TaskRecord[];
    assert.deepEqual(new Set(result.map((task) => task.id)), new Set(expectedIds), filter);
  }

  const firstPageResponse = await fetch(
    endpoint(`/api/v1/tasks?search=${encodeURIComponent(marker)}&page=1&limit=2`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(firstPageResponse.status, 200);
  const firstPage = await firstPageResponse.json();
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.limit, 2);
  assert.equal(firstPage.total, 3);
  assert.equal(firstPage.totalPages, 2);
  assert.equal(firstPage.tasks.length, 2);

  const secondPageResponse = await fetch(
    endpoint(`/api/v1/tasks?search=${encodeURIComponent(marker)}&page=2&limit=2`),
    { headers: bearer(readWriteToken.token) },
  );
  const secondPage = await secondPageResponse.json();
  assert.equal(secondPageResponse.status, 200);
  assert.equal(secondPage.page, 2);
  assert.equal(secondPage.tasks.length, 1);

  const combined = await fetch(
    endpoint(
      `/api/v1/tasks?search=${encodeURIComponent(marker)}&status=Pending&priority=High&assignee=Alice&dueAfter=2027-01-01&dueBefore=2027-01-31&page=1&limit=1`,
    ),
    { headers: bearer(readWriteToken.token) },
  );
  const combinedPage = await combined.json();
  assert.equal(combined.status, 200);
  assert.equal(combinedPage.total, 1);
  assert.deepEqual(combinedPage.tasks.map((task: TaskRecord) => task.id), [alpha.id]);

  const readTask = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(alpha.id)}`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(readTask.status, 200);
  assert.equal((await readTask.json()).id, alpha.id);

  const invalidBody = await fetch(endpoint("/api/v1/tasks"), {
    method: "POST",
    headers: {
      ...bearer(readWriteToken.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: `${marker} invalid`, ownerId: userB?.id }),
  });
  assert.equal(invalidBody.status, 400);

  const malformedJson = await fetch(endpoint("/api/v1/tasks"), {
    method: "POST",
    headers: {
      ...bearer(readWriteToken.token),
      "Content-Type": "application/json",
    },
    body: "{",
  });
  assert.equal(malformedJson.status, 400);

  const invalidId = await fetch(endpoint("/api/v1/tasks/not-a-uuid"), {
    headers: bearer(readWriteToken.token),
  });
  assert.equal(invalidId.status, 400);

  const foreignRead = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(foreignTask.id)}`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(foreignRead.status, 404);
  const foreignUpdate = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(foreignTask.id)}`),
    {
      method: "PATCH",
      headers: {
        ...bearer(readWriteToken.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: `${marker} must remain foreign` }),
    },
  );
  assert.equal(foreignUpdate.status, 404);
  const foreignDelete = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(foreignTask.id)}`),
    { method: "DELETE", headers: bearer(readWriteToken.token) },
  );
  assert.equal(foreignDelete.status, 404);
  const ownerCanStillRead = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(foreignTask.id)}`),
    { headers: bearer(readWriteTokenB.token) },
  );
  assert.equal(ownerCanStillRead.status, 200);

  const updated = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(alpha.id)}`),
    {
      method: "PATCH",
      headers: {
        ...bearer(readWriteToken.token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `${marker} Alpha updated`,
        description: "Updated through the Bearer API",
        status: "Completed",
      }),
    },
  );
  assert.equal(updated.status, 200);
  const updatedTask = (await updated.json()) as TaskRecord;
  assert.equal(updatedTask.title, `${marker} Alpha updated`);
  assert.equal(updatedTask.description, "Updated through the Bearer API");
  assert.equal(updatedTask.status, "Completed");

  const deleted = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(beta.id)}`),
    { method: "DELETE", headers: bearer(readWriteToken.token) },
  );
  assert.equal(deleted.status, 204);
  const deletedRead = await fetch(
    endpoint(`/api/v1/tasks/${encodeURIComponent(beta.id)}`),
    { headers: bearer(readWriteToken.token) },
  );
  assert.equal(deletedRead.status, 404);
});

test("Auth.js logout invalidates the cookie session without affecting PAT auth", {
  skip: skipReason,
}, async () => {
  assert.ok(sessionA);
  assert.ok(readWriteToken);
  await signOut(sessionA);

  const sessionResponse = await fetch(endpoint("/api/auth/session"), {
    headers: requestHeaders(sessionA),
  });
  assert.equal(sessionResponse.status, 200);
  const session = await sessionResponse.json();
  assert.equal(session?.user?.id ?? null, null);

  const cookieApi = await fetch(endpoint("/api/tasks"), {
    headers: requestHeaders(sessionA),
  });
  assert.equal(cookieApi.status, 401);

  const bearerApi = await fetch(endpoint("/api/v1/me"), {
    headers: bearer(readWriteToken.token),
  });
  assert.equal(bearerApi.status, 200);
});
