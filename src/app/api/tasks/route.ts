import {
  databaseApiDisabled,
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  sameOriginFailure,
  validationError,
} from "@/lib/tasks/http";
import { requireApiUser } from "@/lib/auth/server";
import {
  createTaskSchema,
} from "@/lib/tasks/validation";
import {
  createOwnedTask,
  listOwnedTasks,
  listOwnedTasksPage,
} from "@/lib/tasks/service";
import { hasTaskPagination, parseTaskQuery } from "@/lib/tasks/query";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("GET /api/tasks");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const searchParams = new URL(request.url).searchParams;
  const paginated = hasTaskPagination(searchParams);
  const parsedQuery = parseTaskQuery(searchParams);
  if (!parsedQuery.success) return validationError(parsedQuery.error);

  const { data: query } = parsedQuery;
  try {
    if (paginated) {
      return Response.json(await listOwnedTasksPage(userId, query));
    }

    return Response.json(await listOwnedTasks(userId, query));
  } catch (error) {
    logDatabaseFailure("GET /api/tasks", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to retrieve tasks.");
  }
}

export async function POST(request: Request) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("POST /api/tasks");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedTask = createTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) return validationError(parsedTask.error);

  try {
    const task = await createOwnedTask(userId, parsedTask.data);
    return Response.json(task, { status: 201 });
  } catch (error) {
    logDatabaseFailure("POST /api/tasks", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to create the task.");
  }
}
