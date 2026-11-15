import { z } from "zod";
import { parseTrustedOrigins } from "../config/origins";

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Array<{ path: string; message: string }>,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function validationError(error: z.ZodError) {
  return jsonError(
    400,
    "VALIDATION_ERROR",
    "The request contains invalid data.",
    error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  );
}

export function databaseApiDisabled() {
  if (process.env.NEXT_PUBLIC_API_MODE !== "database") {
    return jsonError(
      404,
      "NOT_FOUND",
      "The database API is unavailable while mock mode is enabled.",
    );
  }

  return null;
}

export function sameOriginFailure(
  request: Request,
  trustedOriginsConfig = process.env.TASKFLOW_ALLOWED_ORIGINS,
) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return jsonError(403, "INVALID_ORIGIN", "A same-origin request is required.");
  }

  let trustedOrigins: Set<string>;
  try {
    trustedOrigins = parseTrustedOrigins(trustedOriginsConfig);
  } catch {
    console.error("[Origin] TASKFLOW_ALLOWED_ORIGINS is invalid.");
    return jsonError(
      500,
      "ORIGIN_CONFIGURATION_ERROR",
      "The request origin policy is misconfigured.",
    );
  }

  let requestOrigin: string;
  try {
    const parsedOrigin = new URL(origin);
    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error("Origin header must contain a bare HTTP or HTTPS origin.");
    }
    requestOrigin = parsedOrigin.origin;
  } catch {
    return jsonError(403, "INVALID_ORIGIN", "A same-origin request is required.");
  }

  if (requestOrigin !== new URL(request.url).origin && !trustedOrigins.has(requestOrigin)) {
    return jsonError(403, "INVALID_ORIGIN", "A same-origin request is required.");
  }

  return null;
}

export async function readJsonBody(request: Request) {
  try {
    return { body: await request.json() as unknown };
  } catch {
    return {
      response: jsonError(400, "INVALID_JSON", "The request body must be valid JSON."),
    };
  }
}

export function isUuid(id: string) {
  return z.uuid().safeParse(id).success;
}

export function logDatabaseFailure(route: string, error: unknown) {
  console.error(`[${route}] Database operation failed.`, {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
}
