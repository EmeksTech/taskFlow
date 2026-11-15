import { taskQuerySchema } from "@/lib/tasks/validation";

export function hasTaskPagination(searchParams: URLSearchParams) {
  return searchParams.has("page") || searchParams.has("limit");
}

export function parseTaskQuery(searchParams: URLSearchParams) {
  return taskQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    assignee: searchParams.get("assignee") ?? undefined,
    dueBefore: searchParams.get("dueBefore") ?? undefined,
    dueAfter: searchParams.get("dueAfter") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });
}
