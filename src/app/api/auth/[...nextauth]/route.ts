import type { NextRequest } from "next/server";
import { authModeDisabled } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const { handlers } = await import("@/auth");
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const disabled = authModeDisabled();
  if (disabled) return disabled;

  const { handlers } = await import("@/auth");
  return handlers.POST(request);
}
