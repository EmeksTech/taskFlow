import {
  databaseApiDisabled,
  isUuid,
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  sameOriginFailure,
  validationError,
} from "@/lib/tasks/http";
import { updateTaskSchema } from "@/lib/tasks/validation";
import { requireApiUser } from "@/lib/auth/server";
import {
  deleteOwnedTask,
  getOwnedTask,
  updateOwnedTask,
} from "@/lib/tasks/service";

export const runtime = "nodejs";

interface TaskRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("GET /api/tasks/[id]");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  try {
    const task = await getOwnedTask(userId, id);
    if (!task) return jsonError(404, "NOT_FOUND", "Task was not found.");
    return Response.json(task);
  } catch (error) {
    logDatabaseFailure("GET /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to retrieve the task.");
  }
}

export async function PATCH(request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("PATCH /api/tasks/[id]");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedTask = updateTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) return validationError(parsedTask.error);

  try {
    const task = await updateOwnedTask(userId, id, parsedTask.data);
    if (!task) return jsonError(404, "NOT_FOUND", "Task was not found.");
    return Response.json(task);
  } catch (error) {
    logDatabaseFailure("PATCH /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to update the task.");
  }
}

export async function DELETE(_request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("DELETE /api/tasks/[id]");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(_request);
  if (originError) return originError;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  try {
    const deleted = await deleteOwnedTask(userId, id);
    if (!deleted) {
      return jsonError(404, "NOT_FOUND", "Task was not found.");
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    logDatabaseFailure("DELETE /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to delete the task.");
  }
}
