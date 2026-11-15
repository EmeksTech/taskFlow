import {
  databaseApiDisabled,
  isUuid,
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  validationError,
} from "@/lib/tasks/http";
import { toApiTask, toUpdateTaskData } from "@/lib/tasks/database";
import { updateTaskSchema } from "@/lib/tasks/validation";

interface TaskRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  try {
    const { prisma } = await import("@/lib/prisma");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError(404, "NOT_FOUND", "Task was not found.");
    return Response.json(toApiTask(task));
  } catch (error) {
    logDatabaseFailure("GET /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to retrieve the task.");
  }
}

export async function PATCH(request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedTask = updateTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) return validationError(parsedTask.error);

  try {
    const { prisma } = await import("@/lib/prisma");
    const result = await prisma.task.updateMany({
      where: { id },
      data: toUpdateTaskData(parsedTask.data),
    });
    if (result.count === 0) {
      return jsonError(404, "NOT_FOUND", "Task was not found.");
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return jsonError(404, "NOT_FOUND", "Task was not found.");
    return Response.json(toApiTask(task));
  } catch (error) {
    logDatabaseFailure("PATCH /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to update the task.");
  }
}

export async function DELETE(_request: Request, { params }: TaskRouteContext) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Task ID must be a UUID.");

  try {
    const { prisma } = await import("@/lib/prisma");
    const result = await prisma.task.deleteMany({ where: { id } });
    if (result.count === 0) {
      return jsonError(404, "NOT_FOUND", "Task was not found.");
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    logDatabaseFailure("DELETE /api/tasks/[id]", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to delete the task.");
  }
}
