import { createFileRoute } from "@tanstack/react-router"
import IcalImport from "@/components/UserSettings/IcalImport"
import ImportExport from "@/components/UserSettings/ImportExport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const Route = createFileRoute("/_layout/admin/import-export")({
  component: ImportExportPage,
})

function ImportExportPage() {
  return (
    <div className="flex flex-col gap-8">
      <Tabs defaultValue="vcard" className="w-full">
        <TabsList>
          <TabsTrigger value="vcard">vCard Import/Export</TabsTrigger>
          <TabsTrigger value="ical">iCal Import</TabsTrigger>
        </TabsList>
        <TabsContent value="vcard" className="mt-4">
          <ImportExport />
        </TabsContent>
        <TabsContent value="ical" className="mt-4">
          <IcalImport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
