import type { PersonalAccessTokenScope } from "./tokenValidation";

export function hasTokenScope(
  scopes: PersonalAccessTokenScope[],
  requiredScope: PersonalAccessTokenScope,
) {
  return scopes.includes(requiredScope);
}

export function parseBearerToken(authorization: string | null) {
  const match = authorization?.match(
    /^Bearer (tf_pat_[A-Za-z0-9_-]{43})$/i,
  );
  return match?.[1] ?? null;
}

export function isPersonalAccessTokenActive(
  token: { expiresAt: Date; revokedAt: Date | null },
  now: Date,
) {
  return token.revokedAt === null && token.expiresAt > now;
}
