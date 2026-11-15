import { redirect } from "next/navigation";
import { AuthFrame, AuthModeNotice } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";
import { isDatabaseMode } from "@/lib/auth/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; passwordChanged?: string }>;
}) {
  if (!isDatabaseMode()) return <AuthModeNotice />;

  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.user?.id) redirect("/");

  const params = await searchParams;
  return (
    <AuthFrame
      title="Welcome back"
      description="Sign in to manage your personal TaskFlow workspace."
    >
      {params.passwordChanged === "1" && (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          Your password has changed. Sign in with your new password.
        </p>
      )}
      <LoginForm registered={params.registered === "1"} />
      <p className="mt-5 text-center text-xs text-slate-400">
        By signing in, you agree to use TaskFlow responsibly.
      </p>
    </AuthFrame>
  );
}
