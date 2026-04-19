import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { TagPublic } from "@/client"
import { TagsService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Trash2 } from "@/lib/icons"

interface TagActionsMenuProps {
  tag: TagPublic
}

export const TagActionsMenu = ({ tag }: TagActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

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
    <RowActionsMenu
      items={[
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onSelect: () => deleteTagMutation.mutate(),
        },
      ]}
    />
  )
}
