import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  type GiftCreate,
  type GiftPublic,
  GiftsService,
  type GiftUpdate,
} from "@/client"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { Plus } from "@/lib/icons"

const schema = z.object({
  name: z.string().min(1, { message: "Gift name is required" }),
  description: z.string().optional(),
  status: z.enum(["idea", "given", "received"]),
  occasion: z.string().optional(),
  date: z.string().optional(),
  value_amount: z.coerce.number().min(0).optional().nullable(),
  url: z.string().url().optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  name: "",
  status: "idea",
  description: "",
  occasion: "",
  date: "",
  value_amount: null,
  url: "",
}

function giftToDefaults(g: GiftPublic): FormData {
  return {
    name: g.name,
    status: (g.status ?? "idea") as FormData["status"],
    description: g.description ?? "",
    occasion: g.occasion ?? "",
    date: g.gift_date ? g.gift_date.slice(0, 10) : "",
    value_amount: g.value_amount ?? null,
    url: g.url ?? "",
  }
}

function GiftFormFields({
  form,
}: {
  form: ReturnType<typeof useForm<FormData>>
}) {
  return (
    <div className="grid gap-4 py-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Gift name" {...field} required />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "idea", label: "Idea" },
                { value: "given", label: "Given" },
                { value: "received", label: "Received" },
              ].map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={field.value === o.value ? "default" : "outline"}
                  onClick={() => field.onChange(o.value)}
                  aria-pressed={field.value === o.value}
                >
                  {o.label}
                </Button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="occasion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Occasion</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Birthday, Christmas" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="value_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Details or notes" rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL</FormLabel>
            <FormControl>
              <Input placeholder="https://..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

interface AddGiftProps {
  contactId: string
  /** Controlled-open mode (e.g. from a dropdown). Omit to render the default trigger button. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddGift({
  contactId,
  open: openProp,
  onOpenChange,
}: AddGiftProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled = openProp !== undefined
  const isOpen = controlled ? openProp : internalOpen
  const setIsOpen = (o: boolean) => {
    if (controlled) onOpenChange?.(o)
    else setInternalOpen(o)
  }
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: GiftCreate) =>
      GiftsService.createGiftRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Gift added")
      form.reset()
      setIsOpen(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to add gift",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts", contactId] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      contact_id: contactId,
      name: data.name,
      description: data.description || undefined,
      status: data.status,
      occasion: data.occasion || undefined,
      date: data.date || undefined,
      value_amount: data.value_amount || undefined,
      url: data.url || undefined,
    } as GiftCreate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 size-3.5" /> Add Gift
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Gift</DialogTitle>
          <DialogDescription>
            Track a gift idea, given, or received.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <GiftFormFields form={form} />
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

export function EditGiftDialog({
  gift,
  open,
  onOpenChange,
}: {
  gift: GiftPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: giftToDefaults(gift),
  })

  useEffect(() => {
    if (open) form.reset(giftToDefaults(gift))
  }, [open, gift, form])

  const mutation = useMutation({
    mutationFn: (data: GiftUpdate) =>
      GiftsService.updateGift({ giftId: gift.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Gift updated")
      onOpenChange(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to update gift",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts", gift.contact_id] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      name: data.name,
      description: data.description || null,
      status: data.status,
      occasion: data.occasion || null,
      gift_date: data.date || null,
      value_amount: data.value_amount ?? null,
      url: data.url || null,
    } as GiftUpdate)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Gift</DialogTitle>
          <DialogDescription>Update this gift.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <GiftFormFields form={form} />
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
