import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function getClientAddress(headers: Headers) {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for rate limiting.");

  const key = createHmac("sha256", secret).update(bucket).digest("hex");
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "windowStartedAt")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE
    SET
      "attempts" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN 1
        ELSE "AuthRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN ${now}
        ELSE "AuthRateLimit"."windowStartedAt"
      END
    RETURNING "attempts"
  `;

  return rows.length === 1 && rows[0].attempts <= limit;
}
