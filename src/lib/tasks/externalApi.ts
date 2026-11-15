import "server-only";

import { jsonError } from "./http";
import { hasTokenScope } from "@/lib/auth/tokenPrimitives";
import type { PersonalAccessTokenScope } from "@/lib/auth/tokenValidation";
import {
  externalApiOptions,
  withExternalApiCors,
} from "@/lib/tasks/cors";

export { externalApiOptions, withExternalApiCors };

export function scopeFailure(
  principal: BearerPrincipal,
  requiredScope: PersonalAccessTokenScope,
) {
  return hasTokenScope(principal.scopes, requiredScope)
    ? null
    : jsonError(
        403,
        "INSUFFICIENT_SCOPE",
        `This operation requires the ${requiredScope} scope.`,
      );
}

export function externalApiUnavailable() {
  if (process.env.NEXT_PUBLIC_API_MODE === "database") return null;

  return jsonError(
    404,
    "NOT_FOUND",
    "The external API is unavailable while mock mode is enabled.",
  );
}

export interface BearerPrincipal {
  userId: string;
  tokenId: string;
  scopes: PersonalAccessTokenScope[];
}
