import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { PersonalAccessTokenScope as DatabaseScope } from "@/generated/prisma/client";
import { jsonError } from "@/lib/tasks/http";
import {
  isPersonalAccessTokenActive,
  parseBearerToken,
} from "@/lib/auth/tokenPrimitives";
import type {
  CreatePersonalAccessTokenData,
  PersonalAccessTokenScope,
} from "./tokenValidation";

export interface BearerPrincipal {
  userId: string;
  tokenId: string;
  scopes: PersonalAccessTokenScope[];
}

type BearerAuthentication =
  | { ok: true; principal: BearerPrincipal }
  | { ok: false; response: Response };

const tokenPrefix = "tf_pat_";
const scopeToDatabase = {
  "tasks:read": "TASKS_READ",
  "tasks:write": "TASKS_WRITE",
  "profile:read": "PROFILE_READ",
} as const satisfies Record<PersonalAccessTokenScope, DatabaseScope>;
const scopeFromDatabase: Record<DatabaseScope, PersonalAccessTokenScope> = {
  TASKS_READ: "tasks:read",
  TASKS_WRITE: "tasks:write",
  PROFILE_READ: "profile:read",
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toApiScopes(scopes: DatabaseScope[]) {
  return scopes.map((scope) => scopeFromDatabase[scope]);
}

export function invalidBearerResponse() {
  return jsonError(401, "UNAUTHORIZED", "A valid bearer token is required.");
}

export async function createPersonalAccessToken(
  userId: string,
  input: CreatePersonalAccessTokenData,
) {
  const { prisma } = await import("@/lib/prisma");
  const secret = randomBytes(32).toString("base64url");
  const rawToken = `${tokenPrefix}${secret}`;
  const expiresAt = new Date(
    Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
  );
  const token = await prisma.personalAccessToken.create({
    data: {
      userId,
      name: input.name,
      tokenHash: hashToken(rawToken),
      tokenPrefix: `${tokenPrefix}${secret.slice(0, 8)}`,
      scopes: input.scopes.map((scope) => scopeToDatabase[scope]),
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return {
    token: rawToken,
    accessToken: {
      ...token,
      scopes: toApiScopes(token.scopes),
    },
  };
}

export async function listPersonalAccessTokens(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const tokens = await prisma.personalAccessToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
    },
  });

  return tokens.map((token) => ({
    ...token,
    scopes: toApiScopes(token.scopes),
  }));
}

export async function revokePersonalAccessToken(userId: string, tokenId: string) {
  const { prisma } = await import("@/lib/prisma");
  const result = await prisma.personalAccessToken.updateMany({
    where: {
      id: tokenId,
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return result.count > 0;
}

export async function authenticateBearerToken(
  request: Request,
): Promise<BearerAuthentication> {
  const rawToken = parseBearerToken(request.headers.get("authorization"));
  if (!rawToken) return { ok: false, response: invalidBearerResponse() };

  try {
    const { prisma } = await import("@/lib/prisma");
    const now = new Date();
    const token = await prisma.personalAccessToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: {
        id: true,
        userId: true,
        scopes: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!token || !isPersonalAccessTokenActive(token, now)) {
      return { ok: false, response: invalidBearerResponse() };
    }

    const markedUsed = await prisma.personalAccessToken.updateMany({
      where: {
        id: token.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { lastUsedAt: now },
    });
    if (markedUsed.count !== 1) {
      return { ok: false, response: invalidBearerResponse() };
    }

    return {
      ok: true,
      principal: {
        userId: token.userId,
        tokenId: token.id,
        scopes: toApiScopes(token.scopes),
      },
    };
  } catch (error) {
    console.error("[Bearer] Token verification failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      ok: false,
      response: jsonError(500, "AUTHENTICATION_FAILED", "Unable to verify the access token."),
    };
  }
}
