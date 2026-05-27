import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import type { ReminderWithContactPublic } from "@/client"
import { RemindersService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import useCustomToast from "@/hooks/useCustomToast"
import { Bell, Check, Clock } from "@/lib/icons"

const REFETCH_INTERVAL_MS = 60_000
const POPOVER_DISPLAY_LIMIT = 8

type SnoozeOption = {
  label: string
  /** Minutes from now. */
  minutes: number
}

const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "15 minutes", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 4 * 60 },
  { label: "Tomorrow", minutes: 24 * 60 },
  { label: "1 week", minutes: 7 * 24 * 60 },
]

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

function contactDisplayName(r: ReminderWithContactPublic): string | null {
  return r.contact_name || null
}

export function ReminderBell() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data } = useQuery({
    queryKey: ["reminders", "due"],
    queryFn: () => RemindersService.listDueReminders({}),
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })

  const dueReminders = data?.data ?? []
  const dueCount = data?.count ?? 0

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["reminders"] })
  }

  const snoozeMutation = useMutation({
    mutationFn: ({
      reminderId,
      minutes,
    }: {
      reminderId: string
      minutes: number
      label: string
    }) => RemindersService.snoozeReminder({ reminderId, minutes }),
    onSuccess: (_data, variables) => {
      showSuccessToast(`Snoozed for ${variables.label.toLowerCase()}`)
      invalidate()
    },
    onError: () => showErrorToast("Failed to snooze reminder"),
  })

  const dismissMutation = useMutation({
    mutationFn: (reminderId: string) =>
      RemindersService.dismissReminder({ reminderId }),
    onSuccess: () => {
      showSuccessToast("Reminder dismissed")
      invalidate()
    },
    onError: () => showErrorToast("Failed to dismiss reminder"),
  })

  const buttonLabel = `Reminders, ${dueCount} due`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative size-11 sm:size-9"
          aria-label={buttonLabel}
        >
          <Bell className="size-4" />
          <span className="sr-only" aria-live="polite">
            {dueCount > 0
              ? `${dueCount} reminder${dueCount === 1 ? "" : "s"} due`
              : "No reminders due"}
          </span>
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
      <PopoverContent align="end" className="w-96 p-0">
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
          <ul className="max-h-96 divide-y overflow-y-auto">
            {dueReminders.slice(0, POPOVER_DISPLAY_LIMIT).map((r) => {
              const name = contactDisplayName(r)
              return (
                <li key={r.id} className="min-h-[44px] px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {name ? (
                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {name}
                        </p>
                      ) : null}
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      {r.description ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelative(r.remind_at, Date.now())}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-11 sm:size-9"
                            aria-label={`Snooze reminder: ${r.title}`}
                            title="Snooze"
                            disabled={snoozeMutation.isPending}
                          >
                            <Clock className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {SNOOZE_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt.label}
                              onSelect={() =>
                                snoozeMutation.mutate({
                                  reminderId: r.id,
                                  minutes: opt.minutes,
                                  label: opt.label,
                                })
                              }
                            >
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-11 sm:size-9"
                        aria-label={`Dismiss reminder: ${r.title}`}
                        title="Dismiss"
                        onClick={() => dismissMutation.mutate(r.id)}
                        disabled={dismissMutation.isPending}
                      >
                        <Check className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {/* TODO: "Log as interaction" — open the FAB pre-populated
                      with this contact_id. Deferred per project spec to keep
                      this PR focused on the badge surface. */}
                </li>
              )
            })}
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
