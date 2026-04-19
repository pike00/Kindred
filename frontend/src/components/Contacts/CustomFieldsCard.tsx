import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  CustomFieldDefinitionPublic,
  CustomFieldValueCreate,
  CustomFieldValuePublic,
  CustomFieldValueUpdate,
} from "@/client"
import { CustomFieldsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { ListPlus, Pencil, Plus, Trash2 } from "@/lib/icons"

const createSchema = z.object({
  field_definition_id: z.string().min(1, "Field is required"),
  value: z.string().min(1, "Value is required"),
})
type CreateFormData = z.infer<typeof createSchema>

const updateSchema = z.object({
  value: z.string().min(1, "Value is required"),
})
type UpdateFormData = z.infer<typeof updateSchema>

function AddCustomFieldValueDialog({
  contactId,
  existingDefIds,
}: {
  contactId: string
  existingDefIds: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: defsResp } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: () => CustomFieldsService.listFieldDefinitions(),
    enabled: open,
  })
  const definitions =
    (defsResp as { data?: CustomFieldDefinitionPublic[] } | undefined)?.data ??
    []

  const availableDefs = useMemo(
    () => definitions.filter((d) => !existingDefIds.has(d.id)),
    [definitions, existingDefIds],
  )

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: { field_definition_id: "", value: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: CustomFieldValueCreate) =>
      CustomFieldsService.createFieldValue({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Custom field set")
      form.reset({ field_definition_id: "", value: "" })
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", contactId],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to save value",
      ),
  })

  const onSubmit = (data: CreateFormData) => {
    mutation.mutate({
      contact_id: contactId,
      field_definition_id: data.field_definition_id,
      value: data.value,
    } as CustomFieldValueCreate)
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
          <DialogTitle>Add custom field</DialogTitle>
          <DialogDescription>
            Set a value for one of your custom field definitions. Manage
            definitions in Settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-2">
              <FormField
                control={form.control}
                name="field_definition_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Field <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              availableDefs.length === 0
                                ? "No definitions available"
                                : "Choose a field"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableDefs.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Value <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
                disabled={availableDefs.length === 0}
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EditCustomFieldValueDialog({
  value: cfv,
  open,
  onOpenChange,
}: {
  value: CustomFieldValuePublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema) as any,
    defaultValues: { value: cfv.value },
  })

  useEffect(() => {
    if (open) form.reset({ value: cfv.value })
  }, [open, cfv, form])

  const mutation = useMutation({
    mutationFn: (data: CustomFieldValueUpdate) =>
      CustomFieldsService.updateFieldValue({
        valueId: cfv.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Custom field updated")
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", cfv.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update value",
      ),
  })

  const onSubmit = (data: UpdateFormData) =>
    mutation.mutate({ value: data.value })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {cfv.field_name ?? "custom field"}</DialogTitle>
          <DialogDescription>Update the value.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-2">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

function ValueRow({ value: cfv }: { value: CustomFieldValuePublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => CustomFieldsService.deleteFieldValue({ valueId: cfv.id }),
    onSuccess: () => {
      showSuccessToast("Custom field cleared")
      queryClient.invalidateQueries({
        queryKey: ["custom-field-values", cfv.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete value",
      ),
  })

  return (
    <>
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="min-w-0">
          <span className="text-muted-foreground">
            {cfv.field_name ?? "—"}:
          </span>{" "}
          <span className="truncate">{cfv.value}</span>
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
                if (window.confirm("Delete this custom field value?"))
                  deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditCustomFieldValueDialog
        value={cfv}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export function CustomFieldsCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["custom-field-values", contactId],
    queryFn: () => CustomFieldsService.listFieldValues({ contactId }),
  })
  const values =
    (data as { data?: CustomFieldValuePublic[] } | undefined)?.data ?? []
  const existingDefIds = new Set(values.map((v) => v.field_definition_id))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListPlus className="size-4" /> Custom fields
        </CardTitle>
        <AddCustomFieldValueDialog
          contactId={contactId}
          existingDefIds={existingDefIds}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : values.length > 0 ? (
          <div className="space-y-2">
            {values.map((v) => (
              <ValueRow key={v.id} value={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ListPlus}
            title="No custom fields"
            description="Define custom fields in Settings, then set values per contact here."
          />
        )}
      </CardContent>
    </Card>
  )
}
