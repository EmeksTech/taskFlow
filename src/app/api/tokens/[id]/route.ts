import { authModeDisabled, logAuthFailure, requireApiUser } from "@/lib/auth/server";
import { consumeRateLimit } from "@/lib/auth/rateLimit";
import {
  isUuid,
  jsonError,
  sameOriginFailure,
} from "@/lib/tasks/http";
import { revokePersonalAccessToken } from "@/lib/auth/personalAccessTokens";

export const runtime = "nodejs";

interface TokenRouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: TokenRouteContext) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("DELETE /api/tokens/[id]");
  if ("response" in authenticated) return authenticated.response;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const { id } = await params;
  if (!isUuid(id)) return jsonError(400, "INVALID_ID", "Token ID must be a UUID.");

  try {
    const allowed = await consumeRateLimit(
      `personal-token-revoke:${authenticated.userId}`,
      30,
      60 * 60 * 1000,
    );
    if (!allowed) {
      return jsonError(429, "RATE_LIMITED", "Too many token revocation attempts.");
    }

    const revoked = await revokePersonalAccessToken(authenticated.userId, id);
    if (!revoked) {
      return jsonError(404, "NOT_FOUND", "API token was not found.");
    }

    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logAuthFailure("DELETE /api/tokens/[id]", error);
    return jsonError(500, "TOKEN_REVOKE_FAILED", "Unable to revoke the API token.");
  }
}
