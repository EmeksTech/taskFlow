import { authModeDisabled, logAuthFailure, requireApiUser } from "@/lib/auth/server";
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
} from "@/lib/auth/personalAccessTokens";
import { createPersonalAccessTokenSchema } from "@/lib/auth/tokenValidation";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import {
  jsonError,
  readJsonBody,
  sameOriginFailure,
  validationError,
} from "@/lib/tasks/http";

export const runtime = "nodejs";

export async function GET() {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("GET /api/tokens");
  if ("response" in authenticated) return authenticated.response;

  try {
    const tokens = await listPersonalAccessTokens(authenticated.userId);
    return Response.json(tokens, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logAuthFailure("GET /api/tokens", error);
    return jsonError(500, "TOKEN_LIST_FAILED", "Unable to load API tokens.");
  }
}

export async function POST(request: Request) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("POST /api/tokens");
  if ("response" in authenticated) return authenticated.response;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedToken = createPersonalAccessTokenSchema.safeParse(parsedBody.body);
  if (!parsedToken.success) return validationError(parsedToken.error);

  try {
    const allowed = await consumeRateLimit(
      `personal-token-create:${authenticated.userId}`,
      10,
      60 * 60 * 1000,
    );
    if (!allowed) {
      return jsonError(429, "RATE_LIMITED", "Too many token creation attempts.");
    }

    return Response.json(
      await createPersonalAccessToken(authenticated.userId, parsedToken.data),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logAuthFailure("POST /api/tokens", error);
    return jsonError(500, "TOKEN_CREATE_FAILED", "Unable to create the API token.");
  }
}
