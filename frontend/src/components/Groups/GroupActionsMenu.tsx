import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"

import type { GroupPublic } from "@/client"
import { GroupsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface GroupActionsMenuProps {
  group: GroupPublic
}

export const GroupActionsMenu = ({ group }: GroupActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteGroupMutation = useMutation({
    mutationFn: () => GroupsService.deleteGroup({ groupId: group.id }),
    onSuccess: () => {
      showSuccessToast("Group deleted")
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
    onError: () => {
      showErrorToast("Failed to delete group")
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
          onClick={() => deleteGroupMutation.mutate()}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
