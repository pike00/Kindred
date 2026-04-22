import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { ContactsList } from "@/components/Contacts/ContactsList"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_layout/contacts/")({
  component: ContactsList,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Contacts · Kindred" }],
  }),
})
