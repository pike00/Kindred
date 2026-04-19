import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import type { ReminderPublic } from "@/client"
import { RemindersService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"

interface ReminderActionsMenuProps {
  reminder: ReminderPublic
}

export const ReminderActionsMenu = ({ reminder }: ReminderActionsMenuProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

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
        <DropdownMenuItem onClick={() => snoozeReminderMutation.mutate()}>
          <Clock className="mr-2 h-4 w-4" />
          Snooze 1 hour
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deleteReminderMutation.mutate()}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
