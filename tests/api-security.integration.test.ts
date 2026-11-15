import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TASKFLOW_TEST_BASE_URL;
const skipReason = baseUrl
  ? false
  : "Set TASKFLOW_TEST_BASE_URL to a running database-mode TaskFlow server.";

test("unauthenticated task and profile APIs return 401", {
  skip: skipReason,
}, async () => {
  const taskId = "00000000-0000-4000-8000-000000000001";
  const requests: Array<[string, RequestInit?]> = [
    ["/api/tasks"],
    [`/api/tasks/${taskId}`],
    ["/api/profile"],
    ["/api/tasks", { method: "POST", body: JSON.stringify({ title: "Blocked" }) }],
    [
      `/api/tasks/${taskId}`,
      { method: "PATCH", body: JSON.stringify({ title: "Blocked" }) },
    ],
    [`/api/tasks/${taskId}`, { method: "DELETE" }],
  ];

  for (const [path, options] of requests) {
    const response = await fetch(new URL(path, baseUrl ?? "http://localhost"), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    assert.equal(response.status, 401, `${options?.method ?? "GET"} ${path}`);
  }
});
