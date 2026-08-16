import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import type { InteractionPublic, InteractionUpdate } from "@/client"
import { InteractionsService } from "@/client"
import {
  AttendeePicker,
  channels,
  type InteractionCreateFormData,
  interactionCreateSchema,
  toLocalDateTimeInput,
} from "@/components/Interactions/AddInteractionDialog"
import { MentionTextarea } from "@/components/Mentions/MentionTextarea"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"

interface EditInteractionDialogProps {
  interaction: InteractionPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}

function interactionToDefaults(
  ix: InteractionPublic,
): InteractionCreateFormData {
  return {
    attendee_ids: (ix.attendees ?? []).map((a) => a.id),
    channel: ix.channel,
    occurred_at: toLocalDateTimeInput(new Date(ix.occurred_at)),
    notes: ix.notes ?? "",
    duration_minutes:
      ix.duration_minutes != null ? String(ix.duration_minutes) : "",
    location_label: ix.location_label ?? "",
  }
}

export function EditInteractionDialog({
  interaction,
  open,
  onOpenChange,
}: EditInteractionDialogProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<InteractionCreateFormData>({
    resolver: zodResolver(interactionCreateSchema),
    defaultValues: interactionToDefaults(interaction),
  })

  useEffect(() => {
    if (open) form.reset(interactionToDefaults(interaction))
  }, [open, interaction, form])

  const mutation = useMutation({
    mutationFn: (data: InteractionUpdate) =>
      InteractionsService.updateInteraction({
        interactionId: interaction.id,
        requestBody: data,
      }),
    onSuccess: (_, _vars) => {
      showSuccessToast("Interaction updated")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      for (const a of interaction.attendees ?? []) {
        queryClient.invalidateQueries({ queryKey: ["interactions", a.id] })
        queryClient.invalidateQueries({ queryKey: ["contacts", a.id] })
      }
    },
    onError: (error: Error) =>
      showErrorToast(error.message || "Failed to update interaction"),
  })

  const onSubmit = (data: InteractionCreateFormData) => {
    mutation.mutate({
      attendee_ids: data.attendee_ids,
      channel: data.channel as InteractionUpdate["channel"],
      occurred_at: new Date(data.occurred_at).toISOString(),
      notes: data.notes || null,
      duration_minutes: data.duration_minutes
        ? parseInt(data.duration_minutes, 10)
        : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Interaction</DialogTitle>
          <DialogDescription>
            Update this logged conversation or meeting.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AttendeePicker control={form.control} />
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
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
