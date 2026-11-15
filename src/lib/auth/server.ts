import "server-only";

import { jsonError } from "@/lib/tasks/http";

export function isDatabaseMode() {
  return process.env.NEXT_PUBLIC_API_MODE === "database";
}

export function authModeDisabled() {
  if (!isDatabaseMode()) {
    return jsonError(
      404,
      "NOT_FOUND",
      "Authentication is unavailable while mock mode is enabled.",
    );
  }

  return null;
}

export async function getAuthenticatedUserId() {
  if (!isDatabaseMode()) return null;

  const { auth } = await import("@/auth");
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function requireApiUser(route: string) {
  try {
    const userId = await getAuthenticatedUserId();
    return userId
      ? { userId }
      : {
          response: jsonError(
            401,
            "UNAUTHENTICATED",
            "Sign in to continue.",
          ),
        };
  } catch (error) {
    logAuthFailure(route, error);
    return {
      response: jsonError(
        500,
        "AUTHENTICATION_FAILED",
        "Unable to verify your session.",
      ),
    };
  }
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "P2002"
  );
}

export function logAuthFailure(route: string, error: unknown) {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? ` (${error.code})`
      : "";

  console.error(
    `[${route}] Authentication operation failed: ${errorType}${errorCode}.`,
  );
}
