import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router"

import { UsersService } from "@/client"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_layout/admin")({
  component: AdminLayout,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Admin · Kindred" }],
  }),
})

const tabs = [
  { to: "/admin", label: "Users", exact: true },
  { to: "/admin/webhooks", label: "Webhooks", exact: false },
  { to: "/admin/import-export", label: "Import / export", exact: false },
  { to: "/admin/vcard-conflicts", label: "vCard Conflicts", exact: false },
] as const

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Admin
        </h1>
        <p className="text-muted-foreground">
          User management and workspace-wide settings
        </p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to)
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}
