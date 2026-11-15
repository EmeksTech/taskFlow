import { redirect } from "next/navigation";
import { isDatabaseMode } from "@/lib/auth/server";

export async function requirePageUser() {
  if (!isDatabaseMode()) return null;

  const { auth } = await import("@/auth");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}
