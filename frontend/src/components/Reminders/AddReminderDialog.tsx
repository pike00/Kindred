import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { ReminderCreate } from "@/client"
import { RemindersService } from "@/client"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"

const reminderCreateSchema = z.object({
  title: z.string().min(1, "Title is required").refine(
    (val) => val.trim().length > 0,
    "Title is required"
  ),
  description: z.string().optional(),
  remind_at: z.string().min(1, "Date and time is required"),
})

type ReminderCreateFormData = z.infer<typeof reminderCreateSchema>

export const AddReminderDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<ReminderCreateFormData>({
    resolver: zodResolver(reminderCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      remind_at: "",
    },
  })

  const addReminderMutation = useMutation({
    mutationFn: (data: ReminderCreate) =>
      RemindersService.createReminderRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Reminder created successfully")
      form.reset()
      setOpen(false)
      // Refetch reminders list to show newly created reminder
      queryClient.refetchQueries({ queryKey: ["reminders"] })
    },
    onError: () => {
      showErrorToast("Failed to create reminder")
    },
  })

  const onSubmit = (data: ReminderCreateFormData) => {
    addReminderMutation.mutate({
      ...data,
      remind_at: new Date(data.remind_at).toISOString(),
    } as unknown as ReminderCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Reminder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Reminder</DialogTitle>
          <DialogDescription>
            Create a reminder to stay on top of your relationships.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Call John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What should you discuss?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remind_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addReminderMutation.isPending}
              className="w-full"
            >
              {addReminderMutation.isPending
                ? "Creating..."
                : "Create Reminder"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
