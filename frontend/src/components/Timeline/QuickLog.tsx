import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { type InteractionCreate, InteractionsService } from "@/client"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { Send } from "@/lib/icons"

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
  channel: z.string().min(1),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface QuickLogProps {
  contactId: string
}

export function QuickLog({ contactId }: QuickLogProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { channel: "call", notes: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: InteractionCreate) =>
      InteractionsService.createInteractionRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Interaction logged")
      form.reset()
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to log interaction",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions", contactId] })
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] })
      queryClient.invalidateQueries({ queryKey: ["interactions-recent"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      attendee_ids: [contactId],
      channel: data.channel as InteractionCreate["channel"],
      notes: data.notes || undefined,
      occurred_at: new Date().toISOString(),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-center gap-2"
      >
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem className="w-32">
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger size="sm">
                    <SelectValue />
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
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input placeholder="Quick note (optional)" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          <Send className="size-4" />
        </Button>
      </form>
    </Form>
  )
}
