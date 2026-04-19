import { useSuspenseQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { type ContactPublic, ContactsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { AddContactDialog } from "./AddContactDialog"
import { columns } from "./columns"

export const ContactsList = () => {
  const navigate = useNavigate()
  const { data } = useSuspenseQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <AddContactDialog />
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        onRowClick={(contact: ContactPublic) =>
          navigate({
            to: "/contacts/$contactId",
            params: { contactId: contact.id },
          })
        }
      />
    </div>
  )
}
