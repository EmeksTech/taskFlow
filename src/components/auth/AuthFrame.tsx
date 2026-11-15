import Link from "next/link";
import type { ReactNode } from "react";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-7 flex items-center justify-center gap-2 text-xl font-bold tracking-tight text-slate-900"
        >
          task<span className="text-emerald-700">flow</span>
        </Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function AuthModeNotice() {
  return (
    <AuthFrame
      title="Authentication is off"
      description="Classroom mock mode uses JSON Server without user accounts."
    >
      <p className="text-sm leading-6 text-slate-600">
        To use registration and sign-in, switch{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          NEXT_PUBLIC_API_MODE
        </code>{" "}
        to <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">database</code>.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Return to dashboard
      </Link>
    </AuthFrame>
  );
}
