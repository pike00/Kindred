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
  Activity,
  Bell,
  CalendarHeart,
  Gift,
  Home,
  MessagesSquare,
  Tag,
  Users,
} from "@/lib/icons"
import { type Item, Main } from "./Main"
import { SidebarVersion } from "./SidebarVersion"
import { SmartLists } from "./SmartLists"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Users, title: "Contacts", path: "/contacts" },
  { icon: MessagesSquare, title: "Interactions", path: "/interactions" },
  { icon: Tag, title: "Tags", path: "/tags" },
  { icon: Users, title: "Graph", path: "/graph" },
  { icon: Bell, title: "Reminders", path: "/reminders" },
  { icon: CalendarHeart, title: "Calendar", path: "/calendar" },
  { icon: Gift, title: "Gift Kanban", path: "/gifts/kanban" },
  { icon: Activity, title: "Activity", path: "/activity" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  // Admin moved to the user popout (see Sidebar/User.tsx).
  const items = baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
        <SmartLists />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
        <SidebarVersion />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
