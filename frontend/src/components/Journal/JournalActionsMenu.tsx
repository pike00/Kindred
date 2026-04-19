import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import type { JournalEntryPublic } from "@/client"
import { JournalService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"

interface JournalActionsMenuProps {
  entry: JournalEntryPublic
}

export const JournalActionsMenu = ({ entry }: JournalActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

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
          onClick={() => deleteEntryMutation.mutate()}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
