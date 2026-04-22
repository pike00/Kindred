import { createFileRoute } from "@tanstack/react-router"

import ImportExport from "@/components/UserSettings/ImportExport"

export const Route = createFileRoute("/_layout/admin/import-export")({
  component: ImportExport,
})
