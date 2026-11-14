import Link from "next/link";

const navigation = [
  { label: "Overview", href: "/", page: "overview", icon: "overview" },
  { label: "Tasks", href: "/tasks", page: "tasks", icon: "tasks" },
] as const;

type DashboardPage = (typeof navigation)[number]["page"];

function NavigationLinks({
  activePage,
  mobile = false,
}: {
  activePage: DashboardPage;
  mobile?: boolean;
}) {
  return (
    <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
      <ul className={mobile ? "flex items-center justify-around" : "space-y-1"}>
        {navigation.map((item) => {
          const isActive = item.page === activePage;

          return (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={
                mobile
                  ? `flex min-w-20 flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-medium ${
                      isActive
                        ? "text-emerald-700"
                        : "text-slate-500 hover:text-slate-900"
                    }`
                  : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`
              }
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon === "overview" ? (
                  <>
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="3.5" width="7" height="4" rx="1.5" />
                    <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                  </>
                ) : (
                  <>
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path d="m8 12 2.5 2.5L16.5 9" />
                  </>
                )}
              </svg>
              <span>{item.label}</span>
            </Link>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ activePage }: { activePage: DashboardPage }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
        <Link
          href="/"
          className="mb-10 flex items-center gap-3 px-2"
          aria-label="TaskFlow home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 4 4L19 6" />
              <path d="M19 12v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            task<span className="text-emerald-700">flow</span>
          </span>
        </Link>

        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        <NavigationLinks activePage={activePage} />

        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Team capacity</span>
            <span className="font-semibold text-slate-900">72%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Team capacity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={72}
          >
            <div className="h-full w-[72%] rounded-full bg-emerald-600" />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Your team is making great progress this week.
          </p>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
        <NavigationLinks activePage={activePage} mobile />
      </div>
    </>
  );
}
