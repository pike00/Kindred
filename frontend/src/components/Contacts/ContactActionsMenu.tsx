import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import type { ContactPublic } from "@/client"
import { ContactsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface ContactActionsMenuProps {
  contact: ContactPublic
}

export const ContactActionsMenu = ({ contact }: ContactActionsMenuProps) => {
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteContactMutation = useMutation({
    mutationFn: () => ContactsService.deleteContact({ contactId: contact.id }),
    onSuccess: () => {
      showSuccessToast("Contact deleted")
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
    onError: () => {
      showErrorToast("Failed to delete contact")
    },
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: "/contacts/$contactId" as "/contacts/$contactId",
              params: { contactId: contact.id } as any,
            })
            setOpen(false)
          }}
        >
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: "/contacts/$contactId" as "/contacts/$contactId",
              params: { contactId: contact.id } as any,
            })
            setOpen(false)
          }}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deleteContactMutation.mutate()}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
