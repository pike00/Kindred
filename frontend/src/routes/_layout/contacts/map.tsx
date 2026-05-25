import { createFileRoute } from "@tanstack/react-router"
import { ContactsMap } from "@/components/Contacts/ContactsMap"

export const Route = createFileRoute("/_layout/contacts/map")({
  component: ContactsMapPage,
  head: () => ({
    meta: [{ title: "Map · Contacts · Kindred" }],
  }),
})

function ContactsMapPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Contacts Map</h1>
        <p className="text-muted-foreground">
          View your contacts on a map by their address locations.
        </p>
      </div>
      <ContactsMap />
    </div>
  )
}
