import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { ReminderPublic } from "@/client"
import { RemindersService } from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import useCustomToast from "@/hooks/useCustomToast"
import { Clock, Trash2 } from "@/lib/icons"

interface ReminderActionsMenuProps {
  reminder: ReminderPublic
}

export const ReminderActionsMenu = ({ reminder }: ReminderActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const deleteReminderMutation = useMutation({
    mutationFn: () =>
      RemindersService.deleteReminder({ reminderId: reminder.id }),
    onSuccess: () => {
      showSuccessToast("Reminder deleted")
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
    },
    onError: () => {
      showErrorToast("Failed to delete reminder")
    },
  })

  const snoozeReminderMutation = useMutation({
    mutationFn: () =>
      RemindersService.snoozeReminder({
        reminderId: reminder.id,
        minutes: 60,
      }),
    onSuccess: () => {
      showSuccessToast("Reminder snoozed for 1 hour")
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
    },
    onError: () => {
      showErrorToast("Failed to snooze reminder")
    },
  })

  return (
    <RowActionsMenu
      items={[
        {
          label: "Snooze 1 hour",
          icon: Clock,
          onSelect: () => snoozeReminderMutation.mutate(),
        },
        {
          label: "Delete",
          icon: Trash2,
          variant: "destructive",
          onSelect: () => deleteReminderMutation.mutate(),
        },
      ]}
    />
  )
}
