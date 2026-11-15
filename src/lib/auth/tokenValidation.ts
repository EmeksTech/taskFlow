import { z } from "zod";

export const personalAccessTokenScopes = [
  "tasks:read",
  "tasks:write",
  "profile:read",
] as const;

export const personalAccessTokenScopeSchema = z.enum(
  personalAccessTokenScopes,
);

export const createPersonalAccessTokenSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100),
    scopes: z
      .array(personalAccessTokenScopeSchema)
      .min(1)
      .max(personalAccessTokenScopes.length),
    expiresInDays: z.number().int().min(1).max(365),
  })
  .refine((value) => new Set(value.scopes).size === value.scopes.length, {
    path: ["scopes"],
    message: "Scopes must not contain duplicates.",
  });

export type PersonalAccessTokenScope =
  (typeof personalAccessTokenScopes)[number];
export type CreatePersonalAccessTokenData = z.infer<
  typeof createPersonalAccessTokenSchema
>;
