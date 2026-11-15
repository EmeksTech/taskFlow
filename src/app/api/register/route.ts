import {
  authModeDisabled,
  isUniqueConstraintError,
  logAuthFailure,
} from "@/lib/auth/server";
import { registrationSchema } from "@/lib/auth/validation";
import { hashPassword } from "@/lib/auth/password";
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

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  try {
    const [{ prisma }, { getClientAddress, consumeRateLimit }] =
      await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth/rateLimit"),
      ]);
    const address = getClientAddress(request.headers);
    const allowed = await consumeRateLimit(
      `register:${address}`,
      8,
      60 * 60 * 1000,
    );
    if (!allowed) {
      return jsonError(429, "RATE_LIMITED", "Too many registration attempts.");
    }

    const parsedBody = await readJsonBody(request);
    if ("response" in parsedBody) return parsedBody.response;

    const parsedRegistration = registrationSchema.safeParse(parsedBody.body);
    if (!parsedRegistration.success) {
      return validationError(parsedRegistration.error);
    }

    const { name, email, password } = parsedRegistration.data;
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return jsonError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email address already exists.",
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return Response.json(user, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return jsonError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email address already exists.",
      );
    }

    logAuthFailure("POST /api/register", error);
    return jsonError(
      500,
      "REGISTRATION_FAILED",
      "Unable to create the account right now.",
    );
  }
}
