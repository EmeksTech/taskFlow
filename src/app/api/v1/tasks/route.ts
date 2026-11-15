import { authenticateBearerToken } from "@/lib/auth/personalAccessTokens";
import {
  createTaskSchema,
} from "@/lib/tasks/validation";
import {
  createOwnedTask,
  listOwnedTasks,
  listOwnedTasksPage,
} from "@/lib/tasks/service";
import { hasTaskPagination, parseTaskQuery } from "@/lib/tasks/query";
import {
  externalApiOptions,
  externalApiUnavailable,
  scopeFailure,
  withExternalApiCors,
} from "@/lib/tasks/externalApi";
import {
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  validationError,
} from "@/lib/tasks/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "tasks:read");
  if (denied) return withExternalApiCors(denied);

  const searchParams = new URL(request.url).searchParams;
  const paginated = hasTaskPagination(searchParams);
  const parsedQuery = parseTaskQuery(searchParams);
  if (!parsedQuery.success) {
    return withExternalApiCors(validationError(parsedQuery.error));
  }

  try {
    if (paginated) {
      const result = await listOwnedTasksPage(
        principal.userId,
        parsedQuery.data,
      );
      return withExternalApiCors(Response.json(result));
    }

    const tasks = await listOwnedTasks(principal.userId, parsedQuery.data);
    return withExternalApiCors(Response.json(tasks));
  } catch (error) {
    logDatabaseFailure("GET /api/v1/tasks", error);
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to retrieve tasks."),
    );
  }
}

export async function POST(request: Request) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "tasks:write");
  if (denied) return withExternalApiCors(denied);

  const parsedBody = await readJsonBody(request);
  if (!("body" in parsedBody)) {
    return withExternalApiCors(parsedBody.response);
  }

  const parsedTask = createTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) {
    return withExternalApiCors(validationError(parsedTask.error));
  }

  try {
    const task = await createOwnedTask(
      principal.userId,
      parsedTask.data,
    );
    return withExternalApiCors(Response.json(task, { status: 201 }));
  } catch (error) {
    logDatabaseFailure("POST /api/v1/tasks", error);
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to create the task."),
    );
  }
}

export function OPTIONS() {
  const unavailable = externalApiUnavailable();
  return unavailable
    ? withExternalApiCors(unavailable)
    : externalApiOptions();
}
