import { createFileRoute } from "@tanstack/react-router"

import { ContactsList } from "@/components/Contacts/ContactsList"

export const Route = createFileRoute("/_layout/contacts/")({
  component: ContactsList,
  head: () => ({
    meta: [{ title: "Contacts · Kindred" }],
  }),
})
