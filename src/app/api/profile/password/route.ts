import {
  authModeDisabled,
  logAuthFailure,
  requireApiUser,
} from "@/lib/auth/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordChangeSchema } from "@/lib/auth/validation";
import {
  jsonError,
  readJsonBody,
  sameOriginFailure,
  validationError,
} from "@/lib/tasks/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("POST /api/profile/password");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedPassword = passwordChangeSchema.safeParse(parsedBody.body);
  if (!parsedPassword.success) {
    return validationError(parsedPassword.error);
  }

  try {
    const [{ prisma }, { consumeRateLimit, getClientAddress }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth/rateLimit"),
      ]);
    const address = getClientAddress(request.headers);
    const allowed = await consumeRateLimit(
      `password-change:${userId}:${address}`,
      5,
      15 * 60 * 1000,
    );
    if (!allowed) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many password change attempts. Try again later.",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return jsonError(
        400,
        "CURRENT_PASSWORD_INVALID",
        "The current password is incorrect.",
      );
    }

    const currentPasswordMatches = await verifyPassword(
      user.passwordHash,
      parsedPassword.data.currentPassword,
    );
    if (!currentPasswordMatches) {
      return jsonError(
        400,
        "CURRENT_PASSWORD_INVALID",
        "The current password is incorrect.",
      );
    }

    const passwordHash = await hashPassword(parsedPassword.data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
      select: { id: true },
    });

    return Response.json({
      message: "Password changed. Sign in again with your new password.",
    });
  } catch (error) {
    logAuthFailure("POST /api/profile/password", error);
    return jsonError(
      500,
      "PASSWORD_CHANGE_FAILED",
      "Unable to change your password right now.",
    );
  }
}
