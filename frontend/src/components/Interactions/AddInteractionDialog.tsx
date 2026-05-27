import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { ContactPublic, InteractionCreate } from "@/client"
import { ContactsService, InteractionsService } from "@/client"
import { MentionTextarea } from "@/components/Mentions/MentionTextarea"
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
  DialogTrigger,
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
import useCustomToast from "@/hooks/useCustomToast"
import { Plus, X } from "@/lib/icons"

const toLocalDateTimeInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const channels = [
  { value: "call", label: "Call" },
  { value: "in_person", label: "In Person" },
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "video", label: "Video" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
]

const interactionCreateSchema = z.object({
  attendee_ids: z.array(z.string().uuid()).min(1, "Pick at least one attendee"),
  channel: z.string().min(1, "Select a channel"),
  occurred_at: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  duration_minutes: z.string().optional(),
  location_label: z.string().max(500).optional(),
})
type InteractionCreateFormData = z.infer<typeof interactionCreateSchema>

interface OsmResult {
  lat: string
  lon: string
  display_name: string
}

type OsmStatus = "idle" | "searching" | "found" | "not_found"

interface AddInteractionDialogProps {
  seedContact?: ContactPublic
}

function contactLabel(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  )
}

export const AddInteractionDialog = ({
  seedContact,
}: AddInteractionDialogProps) => {
  const [open, setOpen] = useState(false)
  const [osmStatus, setOsmStatus] = useState<OsmStatus>("idle")
  const [_resolvedLat, setResolvedLat] = useState<number | null>(null)
  const [_resolvedLng, setResolvedLng] = useState<number | null>(null)
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const osmAbortRef = useRef<AbortController | null>(null)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<InteractionCreateFormData>({
    resolver: zodResolver(interactionCreateSchema),
    defaultValues: {
      attendee_ids: seedContact ? [seedContact.id] : [],
      channel: "",
      occurred_at: toLocalDateTimeInput(new Date()),
      notes: "",
      duration_minutes: "",
    },
  })

  const resetOsm = () => {
    setOsmStatus("idle")
    setResolvedLat(null)
    setResolvedLng(null)
    setResolvedName(null)
  }

  const handleLocationBlur = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      resetOsm()
      return
    }
    osmAbortRef.current?.abort()
    const controller = new AbortController()
    osmAbortRef.current = controller
    setOsmStatus("searching")
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
        {
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
            "User-Agent": "Kindred-PersonalCRM/1.0 (personal use)",
          },
        },
      )
      const results: OsmResult[] = await res.json()
      if (results.length > 0) {
        setResolvedLat(parseFloat(results[0].lat))
        setResolvedLng(parseFloat(results[0].lon))
        setResolvedName(results[0].display_name)
        setOsmStatus("found")
      } else {
        resetOsm()
        setOsmStatus("not_found")
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        resetOsm()
        setOsmStatus("not_found")
      }
    }
  }

  const addMutation = useMutation({
    mutationFn: (data: InteractionCreate) =>
      InteractionsService.createInteractionRoute({ requestBody: data }),
    onSuccess: (_, variables) => {
      showSuccessToast("Interaction logged")
      form.reset()
      resetOsm()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      for (const attendeeId of variables.attendee_ids) {
        queryClient.invalidateQueries({
          queryKey: ["interactions", attendeeId],
        })
        queryClient.invalidateQueries({ queryKey: ["contacts", attendeeId] })
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to log interaction")
    },
  })

  const onSubmit = (data: InteractionCreateFormData) => {
    addMutation.mutate({
      attendee_ids: data.attendee_ids,
      channel: data.channel as InteractionCreate["channel"],
      occurred_at: new Date(data.occurred_at).toISOString(),
      notes: data.notes || null,
      mood: null,
      duration_minutes: data.duration_minutes
        ? parseInt(data.duration_minutes, 10)
        : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Log Interaction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
          <DialogDescription>
            Record a conversation or meeting with one or more contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AttendeePicker control={form.control} seedContact={seedContact} />
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
                        data-state={
                          field.value === ch.value ? "active" : undefined
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
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <MentionTextarea
                      placeholder="What did you talk about? (type @ to mention)"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location_label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Starbucks on 5th, their home, the park..."
                      {...field}
                      onBlur={(e) => {
                        field.onBlur()
                        handleLocationBlur(e.target.value)
                      }}
                      onChange={(e) => {
                        field.onChange(e)
                        if (osmStatus !== "idle") resetOsm()
                      }}
                    />
                  </FormControl>
                  {osmStatus === "searching" && (
                    <p className="text-xs text-muted-foreground">
                      Searching...
                    </p>
                  )}
                  {osmStatus === "found" && resolvedName && (
                    <p className="truncate text-xs text-green-600 dark:text-green-400">
                      Found: {resolvedName}
                    </p>
                  )}
                  {osmStatus === "not_found" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Location not found — saved as text, won't appear on map
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addMutation.isPending}
              className="w-full"
            >
              {addMutation.isPending ? "Saving..." : "Log Interaction"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function AttendeePicker({
  control,
  seedContact,
}: {
  control: ReturnType<typeof useForm<InteractionCreateFormData>>["control"]
  seedContact?: ContactPublic
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })
  const contacts = useMemo(() => data?.data ?? [], [data])
  const contactById = useMemo(() => {
    const m = new Map<string, ContactPublic>()
    if (seedContact) m.set(seedContact.id, seedContact)
    for (const c of contacts) m.set(c.id, c)
    return m
  }, [contacts, seedContact])

  return (
    <FormField
      control={control}
      name="attendee_ids"
      render={({ field }) => {
        const selected = field.value ?? []
        const available = contacts.filter((c) => !selected.includes(c.id))
        const toggle = (contact: ContactPublic) => {
          if (selected.includes(contact.id)) {
            field.onChange(selected.filter((id) => id !== contact.id))
          } else {
            field.onChange([...selected, contact.id])
          }
        }
        return (
          <FormItem>
            <FormLabel>Attendees *</FormLabel>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2 min-h-[42px]">
              {selected.map((id) => {
                const c = contactById.get(id)
                return (
                  <Badge key={id} variant="secondary" className="gap-1 pr-1">
                    {c ? contactLabel(c) : "Unknown"}
                    <button
                      type="button"
                      className="ml-1 rounded hover:bg-background/60"
                      onClick={() =>
                        field.onChange(selected.filter((i) => i !== id))
                      }
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
                    <CommandInput placeholder="Search contacts..." />
                    <CommandList>
                      <CommandEmpty>No matches.</CommandEmpty>
                      <CommandGroup>
                        {available.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${contactLabel(c)} ${c.company ?? ""}`}
                            onSelect={() => {
                              toggle(c)
                            }}
                          >
                            <span className="truncate">{contactLabel(c)}</span>
                            {c.company && (
                              <span className="ml-auto truncate text-xs text-muted-foreground">
                                {c.company}
                              </span>
                            )}
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
        )
      }}
    />
  )
}
