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
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_API_MODE !== "database"
  ) {
    return jsonError(
      404,
      "NOT_FOUND",
      "The database API is available only in development database mode.",
    );
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
