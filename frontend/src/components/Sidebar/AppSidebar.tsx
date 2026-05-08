import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import {
  Bell,
  CalendarHeart,
  Gift,
  Home,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  Tag,
  Users,
} from "@/lib/icons"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Users, title: "Contacts", path: "/contacts" },
  { icon: MessagesSquare, title: "Interactions", path: "/interactions" },
  { icon: Tag, title: "Tags", path: "/tags" },
  { icon: Bell, title: "Reminders", path: "/reminders" },
  { icon: CalendarHeart, title: "Calendar", path: "/calendar" },
  { icon: Gift, title: "Gift Kanban", path: "/gifts/kanban" },
  { icon: NotebookPen, title: "Journal", path: "/journal" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: ShieldCheck, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
