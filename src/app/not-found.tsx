import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <p className="text-sm font-medium text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This page may have moved or the address may be incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Go to TaskFlow
        </Link>
      </section>
    </main>
  );
}
