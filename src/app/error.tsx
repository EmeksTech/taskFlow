"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <p className="text-sm font-medium text-rose-700">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          We couldn&apos;t load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Please try again. If the problem continues, try again later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
