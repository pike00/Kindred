import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  type DebtCreate,
  type DebtPublic,
  DebtsService,
  type DebtUpdate,
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
import useCustomToast from "@/hooks/useCustomToast"
import { Plus } from "@/lib/icons"

const schema = z.object({
  direction: z.enum(["i_owe", "they_owe"]),
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  currency: z.string().length(3).default("USD"),
  reason: z.string().optional(),
  is_settled: z.boolean().optional(),
  settled_at: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function today() {
  return new Date().toISOString().slice(0, 10)
}

function debtToDefaults(d: DebtPublic): FormData {
  return {
    direction: d.direction,
    amount: d.amount,
    currency: d.currency ?? "USD",
    reason: d.reason ?? "",
    is_settled: !!d.settled_at,
    settled_at: d.settled_at ? d.settled_at.slice(0, 10) : "",
  }
}

function DebtFormFields({
  form,
  showSettled = false,
}: {
  form: ReturnType<typeof useForm<FormData>>
  showSettled?: boolean
}) {
  const isSettled = form.watch("is_settled") ?? false
  return (
    <div className="grid gap-4 py-4">
      <FormField
        control={form.control}
        name="direction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Direction</FormLabel>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "i_owe", label: "I owe them" },
                { value: "they_owe", label: "They owe me" },
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
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Amount <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="USD" maxLength={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reason</FormLabel>
            <FormControl>
              <Input placeholder="What for?" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showSettled && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-input"
              checked={isSettled}
              onChange={(e) => {
                const checked = e.target.checked
                form.setValue("is_settled", checked)
                if (checked) {
                  if (!form.getValues("settled_at"))
                    form.setValue("settled_at", today())
                } else {
                  form.setValue("settled_at", "")
                }
              }}
            />
            <span>Settled</span>
          </label>
          {isSettled && (
            <FormField
              control={form.control}
              name="settled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settled on</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface AddDebtProps {
  contactId: string
}

export function AddDebt({ contactId }: AddDebtProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      direction: "i_owe",
      amount: 0,
      currency: "USD",
      reason: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: DebtCreate) =>
      DebtsService.createDebtRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Debt tracked")
      form.reset()
      setIsOpen(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to add debt",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["debts", contactId] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      contact_id: contactId,
      direction: data.direction,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason,
    } as DebtCreate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-3.5" /> Add Debt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Track Debt</DialogTitle>
          <DialogDescription>
            Track money owed to or from this contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DebtFormFields form={form} />
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

export function EditDebtDialog({
  debt,
  open,
  onOpenChange,
}: {
  debt: DebtPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: debtToDefaults(debt),
  })

  useEffect(() => {
    if (open) form.reset(debtToDefaults(debt))
  }, [open, debt, form])

  const mutation = useMutation({
    mutationFn: (data: DebtUpdate) =>
      DebtsService.updateDebt({ debtId: debt.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Debt updated")
      onOpenChange(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to update debt",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["debts", debt.contact_id] })
    },
  })

  const onSubmit = (data: FormData) => {
    const settled = data.is_settled ?? false
    mutation.mutate({
      direction: data.direction,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason || null,
      is_settled: settled,
      settled_at: settled ? data.settled_at || today() : null,
    } as DebtUpdate)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Debt</DialogTitle>
          <DialogDescription>
            Update this debt or mark it settled.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DebtFormFields form={form} showSettled />
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
