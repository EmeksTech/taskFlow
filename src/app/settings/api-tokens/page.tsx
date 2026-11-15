import {
  ApiTokensManager,
  type ApiToken,
} from "@/components/settings/ApiTokensManager";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requirePageUser } from "@/lib/auth/page";
import {
  isDatabaseMode,
  logAuthFailure,
} from "@/lib/auth/server";
import { AuthModeNotice } from "@/components/auth/AuthFrame";
import { listPersonalAccessTokens } from "@/lib/auth/personalAccessTokens";
import { redirect } from "next/navigation";

export default async function ApiTokensPage() {
  if (!isDatabaseMode()) return <AuthModeNotice />;

  const user = await requirePageUser();
  if (!user?.id) redirect("/login");

  let initialTokens: ApiToken[] = [];
  let initialError: string | null = null;
  try {
    const tokens = await listPersonalAccessTokens(user.id);
    initialTokens = tokens.map((token) => ({
      ...token,
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt.toISOString(),
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    }));
  } catch (error) {
    logAuthFailure("GET /settings/api-tokens", error);
    initialError = "Unable to load API tokens. Try refreshing the list.";
  }

  return (
    <DashboardShell activePage="overview">
      <div className="mb-7">
        <p className="text-sm font-medium text-emerald-700">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          API tokens
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create scoped credentials for trusted clients and revoke them at any time.
        </p>
      </div>
      <ApiTokensManager
        initialTokens={initialTokens}
        initialError={initialError}
      />
    </DashboardShell>
  );
}
