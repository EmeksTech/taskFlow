import { authenticateBearerToken } from "@/lib/auth/personalAccessTokens";
import {
  externalApiOptions,
  externalApiUnavailable,
  scopeFailure,
  withExternalApiCors,
} from "@/lib/tasks/externalApi";
import { jsonError } from "@/lib/tasks/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unavailable = externalApiUnavailable();
  if (unavailable) return withExternalApiCors(unavailable);

  const authenticated = await authenticateBearerToken(request);
  if (!authenticated.ok) {
    return withExternalApiCors(authenticated.response);
  }

  const { principal } = authenticated;
  const denied = scopeFailure(principal, "profile:read");
  if (denied) return withExternalApiCors(denied);

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: principal.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) {
      return withExternalApiCors(
        jsonError(401, "UNAUTHORIZED", "The token owner is no longer available."),
      );
    }

    return withExternalApiCors(Response.json(user));
  } catch (error) {
    console.error("[GET /api/v1/me] User lookup failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return withExternalApiCors(
      jsonError(500, "DATABASE_ERROR", "Unable to retrieve the current user."),
    );
  }
}

export function OPTIONS() {
  const unavailable = externalApiUnavailable();
  return unavailable
    ? withExternalApiCors(unavailable)
    : externalApiOptions();
}
