import assert from "node:assert/strict";
import test from "node:test";
import { getProductionConfigErrors } from "../src/lib/config/production";
import { registrationSchema, loginSchema } from "../src/lib/auth/validation";
import { createTaskSchema } from "../src/lib/tasks/validation";
import { ownedTaskWhere } from "../src/lib/tasks/authorization";

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

test("task access query always scopes a task ID to its owner", () => {
  assert.deepEqual(ownedTaskWhere("user-a"), { ownerId: "user-a" });
  assert.deepEqual(ownedTaskWhere("user-a", "task-1"), {
    ownerId: "user-a",
    id: "task-1",
  });
});
