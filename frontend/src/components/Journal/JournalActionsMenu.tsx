import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { JournalEntryPublic } from "@/client"
import { JournalService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Trash2 } from "@/lib/icons"

interface JournalActionsMenuProps {
  entry: JournalEntryPublic
}

export const JournalActionsMenu = ({ entry }: JournalActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const deleteEntryMutation = useMutation({
    mutationFn: () => JournalService.deleteJournalEntry({ entryId: entry.id }),
    onSuccess: () => {
      showSuccessToast("Entry deleted")
      queryClient.invalidateQueries({ queryKey: ["journal"] })
    },
    onError: () => {
      showErrorToast("Failed to delete entry")
    },
  })

  return (
    <RowActionsMenu
      items={[
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onSelect: () => deleteEntryMutation.mutate(),
        },
      ]}
    />
  )
}
