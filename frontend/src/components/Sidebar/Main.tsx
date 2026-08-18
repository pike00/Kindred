import { Link as RouterLink, useRouterState } from "@tanstack/react-router"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Loader2, type LucideIcon } from "@/lib/icons"

export type Item = {
  icon: LucideIcon
  title: string
  path: string
}

interface MainProps {
  items: Item[]
}

export function Main({ items }: MainProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouterState()
  const isRouterPending = router.status === "pending"
  const currentPath = router.location.pathname
  const pendingPath = isRouterPending
    ? ((router as unknown as { pendingLocation?: { pathname: string } })
        .pendingLocation?.pathname ?? router.location.pathname)
    : null

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isPending = Boolean(
              pendingPath &&
                (pendingPath === item.path ||
                  (item.path !== "/" && pendingPath.startsWith(item.path)))
            )
            const isActive =
              currentPath === item.path ||
              (item.path !== "/" && currentPath.startsWith(item.path)) ||
              isPending
            const Icon = isPending ? Loader2 : item.icon

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  asChild
                >
                  <RouterLink to={item.path} onClick={handleMenuClick}>
                    <Icon className={isPending ? "animate-spin" : undefined} />
                    <span>{item.title}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}


