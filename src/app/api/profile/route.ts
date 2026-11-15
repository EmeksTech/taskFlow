import {
  authModeDisabled,
  isUniqueConstraintError,
  logAuthFailure,
  requireApiUser,
} from "@/lib/auth/server";
import { profileUpdateSchema } from "@/lib/auth/validation";
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

  const authenticated = await requireApiUser("GET /api/profile");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    if (!user) {
      return jsonError(401, "UNAUTHENTICATED", "Sign in to view your profile.");
    }

    return Response.json(user);
  } catch (error) {
    logAuthFailure("GET /api/profile", error);
    return jsonError(500, "PROFILE_FAILED", "Unable to load your profile.");
  }
}

export async function PATCH(request: Request) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("PATCH /api/profile");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedProfile = profileUpdateSchema.safeParse(parsedBody.body);
  if (!parsedProfile.success) return validationError(parsedProfile.error);

  try {
    const { prisma } = await import("@/lib/prisma");
    if (parsedProfile.data.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: parsedProfile.data.email },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== userId) {
        return jsonError(
          409,
          "EMAIL_ALREADY_REGISTERED",
          "An account with this email address already exists.",
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: parsedProfile.data,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    return Response.json(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email address already exists.",
      );
    }

    logAuthFailure("PATCH /api/profile", error);
    return jsonError(500, "PROFILE_FAILED", "Unable to update your profile.");
  }
}
