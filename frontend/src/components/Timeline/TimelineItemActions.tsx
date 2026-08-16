import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  DebtsService,
  GiftsService,
  InteractionsService,
  LifeEventsService,
  NotesService,
} from "@/client"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import { EditLifeEventDialog } from "@/components/Contacts/LifeEventsCard"
import { EditDebtDialog } from "@/components/Debts/AddDebt"
import { EditGiftDialog } from "@/components/Gifts/AddGift"
import { EditInteractionDialog } from "@/components/Interactions/EditInteractionDialog"
import { EditNoteDialog } from "@/components/Notes/NotesCard"
import type {
  TimelineEvent,
  TimelineEventType,
} from "@/components/Timeline/UnifiedTimeline"
import useCustomToast from "@/hooks/useCustomToast"
import { Pencil, Trash2 } from "@/lib/icons"

const LABEL: Record<TimelineEventType, string> = {
  interaction: "Interaction",
  note: "Note",
  gift: "Gift",
  life_event: "Life event",
  debt: "Debt",
}

export function TimelineItemActions({
  event,
  contactId,
}: {
  event: TimelineEvent
  contactId: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const invalidate = () => {
    switch (event.type) {
      case "interaction":
        queryClient.invalidateQueries({ queryKey: ["interactions"] })
        queryClient.invalidateQueries({ queryKey: ["contacts"] })
        break
      case "note":
        queryClient.invalidateQueries({ queryKey: ["notes", contactId] })
        break
      case "gift":
        queryClient.invalidateQueries({ queryKey: ["gifts", contactId] })
        break
      case "life_event":
        queryClient.invalidateQueries({ queryKey: ["life-events", contactId] })
        break
      case "debt":
        queryClient.invalidateQueries({ queryKey: ["debts", contactId] })
        break
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => {
      switch (event.type) {
        case "interaction":
          return InteractionsService.deleteInteraction({
            interactionId: event.id,
          })
        case "note":
          return NotesService.deleteNote({ noteId: event.id })
        case "gift":
          return GiftsService.deleteGift({ giftId: event.id })
        case "life_event":
          return LifeEventsService.deleteLifeEvent({ eventId: event.id })
        case "debt":
          return DebtsService.deleteDebt({ debtId: event.id })
      }
    },
    onSuccess: () => {
      showSuccessToast(`${LABEL[event.type]} deleted`)
      invalidate()
    },
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Failed to delete"),
  })

  return (
    <>
      <RowActionsMenu
        ariaLabel={`${LABEL[event.type]} actions`}
        triggerClassName="shrink-0"
        items={[
          {
            label: "Edit",
            icon: Pencil,
            onSelect: () => setEditOpen(true),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "destructive",
            onSelect: () => {
              if (
                window.confirm(
                  `Delete this ${LABEL[event.type].toLowerCase()}?`,
                )
              )
                deleteMutation.mutate()
            },
          },
        ]}
      />
      {event.type === "interaction" && (
        <EditInteractionDialog
          interaction={event.payload}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {event.type === "note" && (
        <EditNoteDialog
          note={event.payload}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {event.type === "gift" && (
        <EditGiftDialog
          gift={event.payload}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {event.type === "life_event" && (
        <EditLifeEventDialog
          event={event.payload}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      {event.type === "debt" && (
        <EditDebtDialog
          debt={event.payload}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  )
}
