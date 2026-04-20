import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { InteractionCreate } from "@/client"
import { ContactsService, InteractionsService } from "@/client"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"

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
  contact_id: z.string().uuid("Select a contact"),
  channel: z.string().min(1, "Select a channel"),
  occurred_at: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  mood: z.string().optional(),
  duration_minutes: z.string().optional(),
})

type InteractionCreateFormData = z.infer<typeof interactionCreateSchema>

interface AddInteractionDialogProps {
  contactId?: string
}

export const AddInteractionDialog = ({
  contactId,
}: AddInteractionDialogProps) => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<InteractionCreateFormData>({
    resolver: zodResolver(interactionCreateSchema),
    defaultValues: {
      contact_id: contactId || "",
      channel: "",
      occurred_at: toLocalDateTimeInput(new Date()),
      notes: "",
      mood: "",
      duration_minutes: "",
    },
  })

  const addMutation = useMutation({
    mutationFn: (data: InteractionCreate) =>
      InteractionsService.createInteractionRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Interaction logged")
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      if (contactId) {
        queryClient.invalidateQueries({
          queryKey: ["contact-interactions", contactId],
        })
      }
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to log interaction")
    },
  })

  const onSubmit = (data: InteractionCreateFormData) => {
    addMutation.mutate({
      contact_id: data.contact_id,
      channel: data.channel as any,
      occurred_at: new Date(data.occurred_at).toISOString(),
      notes: data.notes || null,
      mood: data.mood || null,
      duration_minutes: data.duration_minutes
        ? parseInt(data.duration_minutes, 10)
        : null,
    } as unknown as InteractionCreate)
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
            Record a conversation or meeting with a contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!contactId && <ContactSelector control={form.control} />}
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
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <FormControl>
                    <Input placeholder="How did it go?" {...field} />
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
                    <Textarea
                      placeholder="What did you talk about?"
                      {...field}
                    />
                  </FormControl>
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

function ContactSelector({
  control,
}: {
  control: ReturnType<typeof useForm<InteractionCreateFormData>>["control"]
}) {
  const { data } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })

  return (
    <FormField
      control={control}
      name="contact_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Contact *</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(data?.data || []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
