import { authenticateBearerToken } from "@/lib/auth/personalAccessTokens";
import { updateTaskSchema } from "@/lib/tasks/validation";
import {
  deleteOwnedTask,
  getOwnedTask,
  updateOwnedTask,
} from "@/lib/tasks/service";
import {
  externalApiOptions,
  externalApiUnavailable,
  scopeFailure,
  withExternalApiCors,
} from "@/lib/tasks/externalApi";
import {
  isUuid,
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  validationError,
} from "@/lib/tasks/http";

export const runtime = "nodejs";

interface TaskRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: TaskRouteContext) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "tasks:read");
  if (denied) return withExternalApiCors(denied);

  const { id } = await params;
  if (!isUuid(id)) {
    return withExternalApiCors(
      jsonError(400, "INVALID_ID", "Task ID must be a UUID."),
    );
  }

  try {
    const task = await getOwnedTask(principal.userId, id);
    if (!task) {
      return withExternalApiCors(
        jsonError(404, "NOT_FOUND", "Task was not found."),
      );
    }
    return withExternalApiCors(Response.json(task));
  } catch (error) {
    logDatabaseFailure("GET /api/v1/tasks/[id]", error);
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to retrieve the task."),
    );
  }
}

export async function PATCH(request: Request, { params }: TaskRouteContext) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "tasks:write");
  if (denied) return withExternalApiCors(denied);

  const { id } = await params;
  if (!isUuid(id)) {
    return withExternalApiCors(
      jsonError(400, "INVALID_ID", "Task ID must be a UUID."),
    );
  }

  const parsedBody = await readJsonBody(request);
  if (!("body" in parsedBody)) {
    return withExternalApiCors(parsedBody.response);
  }

  const parsedTask = updateTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) {
    return withExternalApiCors(validationError(parsedTask.error));
  }

  try {
    const task = await updateOwnedTask(
      principal.userId,
      id,
      parsedTask.data,
    );
    if (!task) {
      return withExternalApiCors(
        jsonError(404, "NOT_FOUND", "Task was not found."),
      );
    }
    return withExternalApiCors(Response.json(task));
  } catch (error) {
    logDatabaseFailure("PATCH /api/v1/tasks/[id]", error);
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to update the task."),
    );
  }
}

export async function DELETE(request: Request, { params }: TaskRouteContext) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "tasks:write");
  if (denied) return withExternalApiCors(denied);

  const { id } = await params;
  if (!isUuid(id)) {
    return withExternalApiCors(
      jsonError(400, "INVALID_ID", "Task ID must be a UUID."),
    );
  }

  try {
    const deleted = await deleteOwnedTask(principal.userId, id);
    if (!deleted) {
      return withExternalApiCors(
        jsonError(404, "NOT_FOUND", "Task was not found."),
      );
    }
    return withExternalApiCors(new Response(null, { status: 204 }));
  } catch (error) {
    logDatabaseFailure("DELETE /api/v1/tasks/[id]", error);
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to delete the task."),
    );
  }
}

export function OPTIONS() {
  const unavailable = externalApiUnavailable();
  return unavailable
    ? withExternalApiCors(unavailable)
    : externalApiOptions();
}
