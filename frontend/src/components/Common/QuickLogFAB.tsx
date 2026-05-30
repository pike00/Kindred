import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  type ContactPublic,
  ContactsService,
  type InteractionCreate,
  InteractionsService,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { MessageSquarePlus, Send, X } from "@/lib/icons"
import { cn } from "@/lib/utils"

const channels = [
  { value: "call", label: "Call" },
  { value: "in_person", label: "In Person" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "video", label: "Video" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
]

const schema = z.object({
  contact_id: z.string().min(1, "Select a contact"),
  channel: z.string().min(1, "Select a channel"),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function contactLabel(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  )
}

function rankContacts(
  contacts: ContactPublic[],
  query: string,
): ContactPublic[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return contacts.slice(0, 6)
  return contacts
    .filter((c) => {
      const label = contactLabel(c).toLowerCase()
      return (
        label.includes(needle) ||
        (c.company ?? "").toLowerCase().includes(needle)
      )
    })
    .slice(0, 6)
}

export function QuickLogFAB() {
  const [open, setOpen] = useState(false)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const noteInputRef = useRef<HTMLInputElement>(null)

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts({ limit: 100 }),
  })
  const contacts = useMemo(() => contactsData?.data ?? [], [contactsData])

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) =>
        contactLabel(a).localeCompare(contactLabel(b)),
      ),
    [contacts],
  )

  const filteredContacts = useMemo(
    () => rankContacts(sortedContacts, contactQuery),
    [sortedContacts, contactQuery],
  )

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact_id: "",
      channel: "call",
      notes: "",
    },
  })

  const selectedContactId = form.watch("contact_id")
  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId),
    [contacts, selectedContactId],
  )

  const mutation = useMutation({
    mutationFn: (data: InteractionCreate) =>
      InteractionsService.createInteractionRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Interaction logged")
      form.reset({ contact_id: "", channel: "call", notes: "" })
      setOpen(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to log interaction",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      if (selectedContactId) {
        queryClient.invalidateQueries({
          queryKey: ["interactions", selectedContactId],
        })
        queryClient.invalidateQueries({
          queryKey: ["contact", selectedContactId],
        })
      }
    },
  })

  const onSubmit = useCallback(
    (data: FormData) => {
      mutation.mutate({
        attendee_ids: [data.contact_id],
        channel: data.channel as InteractionCreate["channel"],
        notes: data.notes || undefined,
        occurred_at: new Date().toISOString(),
      })
    },
    [mutation],
  )

  // Handle Cmd+Enter or Ctrl+Enter to submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        form.handleSubmit(onSubmit)()
      }
    },
    [form, onSubmit],
  )

  // Reset form when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset({ contact_id: "", channel: "call", notes: "" })
      setContactPickerOpen(false)
      setContactQuery("")
    }
  }

  // Focus note input when contact is selected
  useEffect(() => {
    if (selectedContactId && noteInputRef.current) {
      setTimeout(() => noteInputRef.current?.focus(), 100)
    }
  }, [selectedContactId])

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  return (
    // Stack above the larger hold-to-record FAB (bottom-6 right-6, h-16) so the
    // two don't overlap into one blob in the corner.
    <div
      className="fixed right-4 z-50 md:right-6"
      style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Quick log interaction"
          >
            <MessageSquarePlus className="size-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-80 p-3"
          sideOffset={12}
        >
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Quick Log</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={handleKeyDown}
              className="space-y-2"
            >
              {/* Contact Picker */}
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <Popover
                      open={contactPickerOpen}
                      onOpenChange={setContactPickerOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          data-testid="contact-picker-button"
                          className={cn(
                            "w-full justify-between text-sm",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {selectedContact
                            ? contactLabel(selectedContact)
                            : "Select contact..."}
                          <MessageSquarePlus className="ml-2 size-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-72 p-0"
                        align="start"
                        sideOffset={4}
                      >
                        <Command>
                          <CommandInput
                            placeholder="Search contacts..."
                            value={contactQuery}
                            onValueChange={setContactQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No contacts found.</CommandEmpty>
                            <CommandGroup>
                              {filteredContacts.map((contact) => (
                                <CommandItem
                                  key={contact.id}
                                  value={contactLabel(contact)}
                                  onSelect={() => {
                                    field.onChange(contact.id)
                                    setContactPickerOpen(false)
                                    setContactQuery("")
                                  }}
                                >
                                  <span className="truncate">
                                    {contactLabel(contact)}
                                  </span>
                                  {contact.company && (
                                    <span className="ml-auto truncate text-xs text-muted-foreground">
                                      {contact.company}
                                    </span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              {/* Channel Picker */}
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {channels.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value}>
                            {ch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Note Input */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        ref={noteInputRef}
                        placeholder="Quick note (optional)"
                        className="text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={mutation.isPending || !selectedContactId}
              >
                <Send className="mr-1.5 size-3.5" />
                {mutation.isPending ? "Saving..." : "Log Interaction"}
              </Button>

              {/* Keyboard shortcut hint */}
              <p className="text-center text-xs text-muted-foreground">
                {isMac ? "⌘" : "Ctrl"}+Enter to submit
              </p>
            </form>
          </Form>
        </PopoverContent>
      </Popover>
    </div>
  )
}
