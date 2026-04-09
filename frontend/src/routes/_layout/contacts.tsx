import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/contacts")({
  component: ContactsLayout,
})

function ContactsLayout() {
  return <Outlet />
}
