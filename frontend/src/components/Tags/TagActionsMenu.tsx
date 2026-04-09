import { MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"

import type { TagPublic } from "@/client"
import { TagsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"
import { useMutation, useQueryClient } from "@tanstack/react-query"

interface TagActionsMenuProps {
  tag: TagPublic
}

export const TagActionsMenu = ({ tag }: TagActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const deleteTagMutation = useMutation({
    mutationFn: () => TagsService.deleteTag({ tagId: tag.id }),
    onSuccess: () => {
      showSuccessToast("Tag deleted")
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
    onError: () => {
      showErrorToast("Failed to delete tag")
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
          onClick={() => deleteTagMutation.mutate()}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
