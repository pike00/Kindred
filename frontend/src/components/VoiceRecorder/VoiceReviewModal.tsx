import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  ContactPublic,
  InteractionCreate,
  InteractionPublic,
} from "@/client"
import { ContactsService, InteractionsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { Loader2, Plus, X } from "@/lib/icons"

const channels = [
  { value: "call", label: "Call" },
  { value: "in_person", label: "In Person" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "video", label: "Video" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
]

const reviewSchema = z.object({
  notes: z.string().min(1, "Notes cannot be empty"),
  channel: z.string().min(1, "Select a channel"),
  attendee_ids: z.array(z.string().uuid()).min(1, "Pick at least one attendee"),
  occurred_at: z.string().min(1, "Date is required"),
  mood: z.string().optional(),
  duration_minutes: z.string().optional(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface VoiceReviewModalProps {
  transcribedText: string
  onComplete: (interaction: InteractionPublic) => void
  onCancel: () => void
}

function contactLabel(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  )
}

export function VoiceReviewModal({
  transcribedText,
  onComplete,
  onCancel,
}: VoiceReviewModalProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })

  const contacts = contactsData?.data ?? []

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      notes: transcribedText,
      channel: "in_person", // Default for voice recordings
      attendee_ids: [],
      occurred_at: new Date().toISOString().slice(0, 16), // Current datetime-local format
      mood: "",
      duration_minutes: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: InteractionCreate) =>
      InteractionsService.createInteractionRoute({ requestBody: data }),
    onSuccess: (interaction) => {
      showSuccessToast("Interaction logged from voice!")
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      onComplete(interaction)
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to save interaction")
    },
  })

  const onSubmit = (data: ReviewFormData) => {
    createMutation.mutate({
      attendee_ids: data.attendee_ids,
      channel: data.channel as InteractionCreate["channel"],
      occurred_at: new Date(data.occurred_at).toISOString(),
      notes: data.notes,
      mood: data.mood || null,
      duration_minutes: data.duration_minutes
        ? parseInt(data.duration_minutes, 10)
        : null,
    })
  }

  const selectedAttendeeIds = form.watch("attendee_ids") ?? []
  const availableContacts = contacts.filter(
    (c) => !selectedAttendeeIds.includes(c.id),
  )

  const toggleAttendee = (contactId: string) => {
    const current = form.getValues("attendee_ids") ?? []
    if (current.includes(contactId)) {
      form.setValue(
        "attendee_ids",
        current.filter((id) => id !== contactId),
      )
    } else {
      form.setValue("attendee_ids", [...current, contactId])
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Voice Note</DialogTitle>
          <DialogDescription>
            Review and edit the transcribed text before saving as an
            interaction.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Attendees */}
            <FormField
              control={form.control}
              name="attendee_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Attendees *</FormLabel>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2 min-h-[42px]">
                    {selectedAttendeeIds.map((id) => {
                      const contact = contacts.find((c) => c.id === id)
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {contact ? contactLabel(contact) : "Unknown"}
                          <button
                            type="button"
                            className="ml-1 rounded hover:bg-background/60"
                            onClick={() => toggleAttendee(id)}
                            aria-label="Remove attendee"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      )
                    })}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => setPickerOpen(!pickerOpen)}
                    >
                      <Plus className="size-3.5" />
                      Add attendee
                    </Button>

                    {/* Simple attendee picker dropdown */}
                    {pickerOpen && (
                      <div className="absolute mt-10 w-72 rounded-md border bg-popover p-1 shadow-md">
                        {availableContacts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No more contacts to add
                          </div>
                        ) : (
                          availableContacts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                              onClick={() => {
                                toggleAttendee(c.id)
                                if (availableContacts.length === 1) {
                                  setPickerOpen(false)
                                }
                              }}
                            >
                              {contactLabel(c)}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Channel */}
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel *</FormLabel>
                  <div className="flex flex-wrap gap-1">
                    {channels.map((ch) => (
                      <Button
                        key={ch.value}
                        type="button"
                        size="sm"
                        variant={
                          field.value === ch.value ? "default" : "outline"
                        }
                        onClick={() => field.onChange(ch.value)}
                      >
                        {ch.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date/Time */}
            <FormField
              control={form.control}
              name="occurred_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transcribed Text / Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you talk about?"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mood</FormLabel>
                    <FormControl>
                      <Input placeholder="😊 How did it go?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Interaction"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
