import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { GroupPublic } from "@/client"
import { GroupsService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Trash2 } from "@/lib/icons"

interface GroupActionsMenuProps {
  group: GroupPublic
}

export const GroupActionsMenu = ({ group }: GroupActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

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
    <RowActionsMenu
      items={[
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onSelect: () => deleteGroupMutation.mutate(),
        },
      ]}
    />
  )
}
