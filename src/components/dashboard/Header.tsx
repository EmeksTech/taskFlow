import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("") || "U";
}

export async function Header() {
  const databaseMode = process.env.NEXT_PUBLIC_API_MODE === "database";
  const session = databaseMode
    ? await (await import("@/auth")).auth()
    : null;
  const name = databaseMode
    ? session?.user?.name?.trim() || "Account"
    : "Alex Kim";

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
        <div>
          <p className="text-xs font-medium text-slate-400">Team workspace</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            {today}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden text-sm text-slate-500 sm:inline">
            Good morning, {name.split(/\s+/)[0]}
          </span>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
            <span className="sr-only">Notifications</span>
          </span>
          {databaseMode && session?.user ? (
            <details className="group relative">
              <summary
                aria-label="Open account menu"
                className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800 marker:hidden"
              >
                {getInitials(name)}
              </summary>
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="truncate px-3 py-2 text-sm font-semibold text-slate-800">
                  {name}
                </p>
                <Link
                  href="/profile"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Settings
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <div
              aria-label={databaseMode ? "Account" : "Alex Kim"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
            >
              {databaseMode ? getInitials(name) : "AK"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
