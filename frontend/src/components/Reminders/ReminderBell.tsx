import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

import type { ReminderPublic } from "@/client"
import { RemindersService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useCustomToast from "@/hooks/useCustomToast"
import { Bell, Check, Clock } from "@/lib/icons"

const FETCH_LIMIT = 100
const REFETCH_INTERVAL_MS = 60_000
const POPOVER_DISPLAY_LIMIT = 8

function isReminderDue(reminder: ReminderPublic, now: number): boolean {
  if (reminder.is_active === false) return false
  const remindAt = new Date(reminder.remind_at).getTime()
  if (Number.isNaN(remindAt) || remindAt > now) return false
  if (reminder.snoozed_until) {
    const snoozedUntil = new Date(reminder.snoozed_until).getTime()
    if (!Number.isNaN(snoozedUntil) && snoozedUntil > now) return false
  }
  return true
}

function formatRelative(remindAt: string, now: number): string {
  const target = new Date(remindAt).getTime()
  if (Number.isNaN(target)) return ""
  const diffMin = Math.round((now - target) / 60_000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m overdue`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h overdue`
  const diffDay = Math.round(diffHour / 24)
  return `${diffDay}d overdue`
}

export function ReminderBell() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data } = useQuery({
    queryKey: ["reminders", { isActive: true, limit: FETCH_LIMIT }],
    queryFn: () =>
      RemindersService.listReminders({ isActive: true, limit: FETCH_LIMIT }),
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })

  const { dueReminders, dueCount } = useMemo(() => {
    const now = Date.now()
    const all = data?.data ?? []
    const due = all
      .filter((r) => isReminderDue(r, now))
      .sort(
        (a, b) =>
          new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
      )
    return { dueReminders: due, dueCount: due.length }
  }, [data])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reminders"] })
  }

  const snoozeMutation = useMutation({
    mutationFn: (reminderId: string) =>
      RemindersService.snoozeReminder({ reminderId, minutes: 60 }),
    onSuccess: () => {
      showSuccessToast("Reminder snoozed for 1 hour")
      invalidate()
    },
    onError: () => showErrorToast("Failed to snooze reminder"),
  })

  const dismissMutation = useMutation({
    mutationFn: (reminderId: string) =>
      RemindersService.updateReminder({
        reminderId,
        requestBody: { is_active: false },
      }),
    onSuccess: () => {
      showSuccessToast("Reminder dismissed")
      invalidate()
    },
    onError: () => showErrorToast("Failed to dismiss reminder"),
  })

  const buttonLabel =
    dueCount > 0 ? `Reminders (${dueCount} due)` : "Reminders (none due)"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={buttonLabel}
        >
          <Bell className="size-4" />
          {dueCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] leading-none"
              aria-hidden="true"
            >
              {dueCount > 99 ? "99+" : dueCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Due reminders</h2>
            <span className="text-xs text-muted-foreground">
              {dueCount} due
            </span>
          </div>
        </div>
        {dueCount === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {dueReminders.slice(0, POPOVER_DISPLAY_LIMIT).map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(r.remind_at, Date.now())}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Snooze 1 hour"
                      title="Snooze 1 hour"
                      onClick={() => snoozeMutation.mutate(r.id)}
                      disabled={snoozeMutation.isPending}
                    >
                      <Clock className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Dismiss reminder"
                      title="Dismiss"
                      onClick={() => dismissMutation.mutate(r.id)}
                      disabled={dismissMutation.isPending}
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-4 py-2 text-right">
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <Link to="/reminders">View all reminders</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
