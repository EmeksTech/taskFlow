import { z } from "zod";

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

export function sameOriginFailure(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return jsonError(403, "INVALID_ORIGIN", "A same-origin request is required.");
  }

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return jsonError(403, "INVALID_ORIGIN", "A same-origin request is required.");
    }
  } catch {
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
