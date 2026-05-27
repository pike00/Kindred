import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { TagPublic } from "@/client"
import { TagsService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Share2, Trash2 } from "@/lib/icons"

interface TagActionsMenuProps {
  tag: TagPublic
  onShare: (tag: TagPublic) => void
}

export const TagActionsMenu = ({ tag, onShare }: TagActionsMenuProps) => {
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
          label: "Share",
          icon: Share2,
          onSelect: () => onShare(tag),
        },
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
