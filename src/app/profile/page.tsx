import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AuthModeNotice } from "@/components/auth/AuthFrame";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { requirePageUser } from "@/lib/auth/page";
import { isDatabaseMode } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  if (!isDatabaseMode()) return <AuthModeNotice />;

  const sessionUser = await requirePageUser();
  if (!sessionUser?.id) redirect("/login");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const createdAt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(user.createdAt);

  return (
    <DashboardShell activePage="overview">
      <div className="mb-7">
        <p className="text-sm font-medium text-emerald-700">Your account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Update your account details and personal information.
        </p>
      </div>
      <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <ProfileForm name={user.name} email={user.email} />
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Member since
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">{createdAt}</p>
        </div>
      </section>
    </DashboardShell>
  );
}
