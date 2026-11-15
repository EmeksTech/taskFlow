import { isDatabaseMode } from "@/lib/auth/server";
import { logDatabaseFailure } from "@/lib/tasks/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseMode()) {
    return Response.json({ status: "ok" });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    logDatabaseFailure("GET /api/health", error);
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
