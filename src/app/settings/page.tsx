import { AuthModeNotice } from "@/components/auth/AuthFrame";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requirePageUser } from "@/lib/auth/page";
import { isDatabaseMode } from "@/lib/auth/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  if (!isDatabaseMode()) return <AuthModeNotice />;

  const user = await requirePageUser();
  if (!user?.id) redirect("/login");

  return (
    <DashboardShell activePage="overview">
      <div className="mb-7">
        <p className="text-sm font-medium text-emerald-700">Your account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage your account security.
        </p>
      </div>
      <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          Change password
        </h2>
        <p className="mb-6 text-sm leading-6 text-slate-500">
          Verify your current password before choosing a new one. You will need
          to sign in again after changing it.
        </p>
        <PasswordForm />
      </section>
      <section className="mt-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-slate-900">API access</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Create and revoke scoped personal access tokens for trusted clients.
        </p>
        <Link
          href="/settings/api-tokens"
          className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Manage API tokens
        </Link>
      </section>
    </DashboardShell>
  );
}
