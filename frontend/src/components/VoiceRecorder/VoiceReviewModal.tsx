import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { Loader2, Plus, RotateCcw, Sparkles, X } from "@/lib/icons"
import { parseVoiceTranscription } from "./parseVoiceTranscription"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [showingRawNotes, setShowingRawNotes] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts({ limit: 200 }),
  })

  const contacts = useMemo(() => contactsData?.data ?? [], [contactsData])

  const parsed = useMemo(
    () => parseVoiceTranscription(transcribedText, contacts),
    [transcribedText, contacts],
  )

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      notes: parsed.cleanedNotes,
      channel: parsed.detectedChannel,
      attendee_ids: parsed.matchedAttendeeIds,
      occurred_at: new Date().toISOString().slice(0, 16),
      duration_minutes: "",
    },
  })

  // When contacts load or parse updates, auto-fill form if user hasn't typed custom edits
  useEffect(() => {
    if (contacts.length > 0 && !form.formState.isDirty) {
      form.reset({
        notes: parsed.cleanedNotes,
        channel: parsed.detectedChannel,
        attendee_ids: parsed.matchedAttendeeIds,
        occurred_at:
          form.getValues("occurred_at") ||
          new Date().toISOString().slice(0, 16),
        duration_minutes: form.getValues("duration_minutes") || "",
      })
    }
  }, [parsed, contacts.length, form])

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
      duration_minutes: data.duration_minutes
        ? parseInt(data.duration_minutes, 10)
        : null,
    })
  }

  const selectedAttendeeIds = form.watch("attendee_ids") ?? []
  const availableContacts = useMemo(
    () => contacts.filter((c) => !selectedAttendeeIds.includes(c.id)),
    [contacts, selectedAttendeeIds],
  )

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return availableContacts.slice(0, 8)
    return availableContacts
      .filter((c) => contactLabel(c).toLowerCase().includes(query))
      .slice(0, 8)
  }, [availableContacts, searchQuery])

  const toggleAttendee = (contactId: string) => {
    const current = form.getValues("attendee_ids") ?? []
    if (current.includes(contactId)) {
      form.setValue(
        "attendee_ids",
        current.filter((id) => id !== contactId),
        { shouldDirty: true, shouldValidate: true },
      )
    } else {
      form.setValue("attendee_ids", [...current, contactId], {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const handleToggleRawNotes = () => {
    if (showingRawNotes) {
      form.setValue("notes", parsed.cleanedNotes, {
        shouldDirty: true,
        shouldValidate: true,
      })
      setShowingRawNotes(false)
    } else {
      form.setValue("notes", transcribedText, {
        shouldDirty: true,
        shouldValidate: true,
      })
      setShowingRawNotes(true)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Review Voice Note</DialogTitle>
            <Badge
              variant="secondary"
              className="gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            >
              <Sparkles className="size-3" />
              Auto-extracted
            </Badge>
          </div>
          <DialogDescription>
            Review and edit the extracted details before saving as an
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Attendees *</FormLabel>
                    {parsed.matchedAttendeeIds.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="size-3 text-emerald-500" />
                        Identified from voice
                      </span>
                    )}
                  </div>
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

                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground"
                        >
                          <Plus className="size-3.5" />
                          Add attendee
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No contacts found.</CommandEmpty>
                            <CommandGroup>
                              {filteredContacts.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={contactLabel(c)}
                                  onSelect={() => {
                                    toggleAttendee(c.id)
                                    setSearchQuery("")
                                    setPickerOpen(false)
                                  }}
                                >
                                  {contactLabel(c)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Notes *</FormLabel>
                    <button
                      type="button"
                      onClick={handleToggleRawNotes}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="size-3" />
                      {showingRawNotes
                        ? "Use cleaned text"
                        : "Show original transcription"}
                    </button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="What did you talk about?"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  {showingRawNotes && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Displaying raw audio transcription.
                    </p>
                  )}
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
