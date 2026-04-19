import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import type { ContactPublic } from "@/client"
import { ContactsService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Pencil, Trash2 } from "@/lib/icons"

interface ContactActionsMenuProps {
  contact: ContactPublic
}

export const ContactActionsMenu = ({ contact }: ContactActionsMenuProps) => {
  const navigate = useNavigate()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

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

  const goToContact = () =>
    navigate({
      to: "/contacts/$contactId" as "/contacts/$contactId",
      params: { contactId: contact.id } as any,
    })

  return (
    <RowActionsMenu
      items={[
        { label: "View", icon: Pencil, onSelect: goToContact },
        { label: "Edit", icon: Pencil, onSelect: goToContact },
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onSelect: () => deleteContactMutation.mutate(),
        },
      ]}
    />
  )
}
