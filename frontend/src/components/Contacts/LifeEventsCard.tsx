import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  LifeEventCreate,
  LifeEventPublic,
  LifeEventUpdate,
} from "@/client"
import { LifeEventsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { LoadingButton } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { CalendarHeart, Pencil, Plus, Trash2 } from "@/lib/icons"

const EVENT_TYPES = [
  "anniversary",
  "wedding",
  "graduation",
  "new_job",
  "moved",
  "other",
] as const

const schema = z.object({
  event_type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  occurred_at: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  create_annual_reminder: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  event_type: "anniversary",
  title: "",
  occurred_at: "",
  description: "",
  create_annual_reminder: false,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function LifeEventFormFields({
  form,
}: {
  form: ReturnType<typeof useForm<FormData>>
}) {
  return (
    <div className="grid gap-4 py-2">
      <FormField
        control={form.control}
        name="event_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Type <span className="text-destructive">*</span>
            </FormLabel>
            <div className="flex flex-wrap gap-1">
              {EVENT_TYPES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={field.value === t ? "default" : "outline"}
                  onClick={() => field.onChange(t)}
                  aria-pressed={field.value === t}
                  className="capitalize"
                >
                  {t.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Title <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Turned 30" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="occurred_at"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Date <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input type="date" {...field} />
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
              <Textarea rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="rounded border-input"
          {...form.register("create_annual_reminder")}
        />
        <span>Create an annual reminder</span>
      </label>
    </div>
  )
}

function AddLifeEventDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: LifeEventCreate) =>
      LifeEventsService.createLifeEventRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Life event added")
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["life-events", contactId] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add event",
      ),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      contact_id: contactId,
      event_type: data.event_type,
      title: data.title,
      occurred_at: data.occurred_at,
      description: data.description || null,
      create_annual_reminder: data.create_annual_reminder ?? false,
    } as LifeEventCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-3.5" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add life event</DialogTitle>
          <DialogDescription>
            Anniversaries, graduations, milestones, etc.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <LifeEventFormFields form={form} />
            <DialogFooter className="mt-4">
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

function EditLifeEventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: LifeEventPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      event_type: event.event_type,
      title: event.title,
      occurred_at: event.occurred_at.slice(0, 10),
      description: event.description ?? "",
      create_annual_reminder: event.create_annual_reminder ?? false,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        event_type: event.event_type,
        title: event.title,
        occurred_at: event.occurred_at.slice(0, 10),
        description: event.description ?? "",
        create_annual_reminder: event.create_annual_reminder ?? false,
      })
    }
  }, [open, event, form])

  const mutation = useMutation({
    mutationFn: (data: LifeEventUpdate) =>
      LifeEventsService.updateLifeEvent({
        eventId: event.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Life event updated")
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["life-events", event.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update event",
      ),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      event_type: data.event_type,
      title: data.title,
      occurred_at: data.occurred_at,
      description: data.description || null,
      create_annual_reminder: data.create_annual_reminder ?? false,
    } as LifeEventUpdate)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit life event</DialogTitle>
          <DialogDescription>Update the event.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <LifeEventFormFields form={form} />
            <DialogFooter className="mt-4">
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

function LifeEventRow({ event }: { event: LifeEventPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => LifeEventsService.deleteLifeEvent({ eventId: event.id }),
    onSuccess: () => {
      showSuccessToast("Life event deleted")
      queryClient.invalidateQueries({
        queryKey: ["life-events", event.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete event",
      ),
  })

  return (
    <>
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{event.title}</span>
            <Badge variant="secondary" className="text-[10px]">
              {event.event_type}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {formatDate(event.occurred_at)}
            {event.create_annual_reminder && " · annual reminder"}
          </p>
          {event.description && (
            <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">
              {event.description}
            </p>
          )}
        </div>
        <RowActionsMenu
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
                if (window.confirm("Delete this event?"))
                  deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditLifeEventDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export function LifeEventsCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["life-events", contactId],
    queryFn: () => LifeEventsService.listLifeEvents({ contactId }),
  })
  const events = data?.data ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarHeart className="size-4" /> Life events
        </CardTitle>
        <AddLifeEventDialog contactId={contactId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events.map((e) => (
              <LifeEventRow key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarHeart}
            title="No life events"
            description="Track anniversaries, graduations, and milestones for this contact."
          />
        )}
      </CardContent>
    </Card>
  )
}
