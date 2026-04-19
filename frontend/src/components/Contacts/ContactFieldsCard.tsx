import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  ContactFieldCreate,
  ContactFieldPublic,
  ContactFieldType,
  ContactFieldUpdate,
} from "@/client"
import { ContactFieldsService } from "@/client"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import {
  AtSign,
  Link as LinkIcon,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "@/lib/icons"

const FIELD_TYPES: ContactFieldType[] = [
  "email",
  "phone",
  "url",
  "social",
  "im",
  "custom",
]

const fieldTypeIcon: Record<ContactFieldType, React.ReactNode> = {
  email: <Mail className="size-4" />,
  phone: <Phone className="size-4" />,
  url: <LinkIcon className="size-4" />,
  social: <AtSign className="size-4" />,
  im: <MessageSquareText className="size-4" />,
  custom: null,
}

const schema = z.object({
  field_type: z.enum(["email", "phone", "url", "social", "im", "custom"]),
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
  is_primary: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  field_type: "email",
  label: "",
  value: "",
  is_primary: false,
}

interface FieldFormProps {
  form: ReturnType<typeof useForm<FormData>>
}

function FieldFormFields({ form }: FieldFormProps) {
  return (
    <div className="grid gap-4 py-2">
      <FormField
        control={form.control}
        name="field_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Type <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
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
        name="label"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Label <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Home, Work, Mobile, ..." {...field} />
            </FormControl>
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
              <Input placeholder="example@host.com / +1 555..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="rounded border-gray-300"
          {...form.register("is_primary")}
        />
        <span>Primary</span>
      </label>
    </div>
  )
}

function AddContactFieldDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: ContactFieldCreate) =>
      ContactFieldsService.createContactFieldRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Field added")
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["contact-fields", contactId] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add field",
      ),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      contact_id: contactId,
      field_type: data.field_type,
      label: data.label,
      value: data.value,
      is_primary: data.is_primary ?? false,
    } as ContactFieldCreate)
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
          <DialogTitle>Add contact field</DialogTitle>
          <DialogDescription>Email, phone, URL, or other.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldFormFields form={form} />
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

function EditContactFieldDialog({
  field: cf,
  open,
  onOpenChange,
}: {
  field: ContactFieldPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      field_type: cf.field_type,
      label: cf.label,
      value: cf.value,
      is_primary: cf.is_primary ?? false,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        field_type: cf.field_type,
        label: cf.label,
        value: cf.value,
        is_primary: cf.is_primary ?? false,
      })
    }
  }, [open, cf, form])

  const mutation = useMutation({
    mutationFn: (data: ContactFieldUpdate) =>
      ContactFieldsService.updateContactField({
        fieldId: cf.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Field updated")
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["contact-fields", cf.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update field",
      ),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      field_type: data.field_type,
      label: data.label,
      value: data.value,
      is_primary: data.is_primary ?? false,
    } as ContactFieldUpdate)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit contact field</DialogTitle>
          <DialogDescription>Update the field details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldFormFields form={form} />
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

function FieldRow({ field: cf }: { field: ContactFieldPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () =>
      ContactFieldsService.deleteContactField({ fieldId: cf.id }),
    onSuccess: () => {
      showSuccessToast("Field deleted")
      queryClient.invalidateQueries({
        queryKey: ["contact-fields", cf.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete field",
      ),
  })

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        {fieldTypeIcon[cf.field_type]}
        <span className="text-muted-foreground">{cf.label}:</span>
        <span className="truncate">
          {cf.field_type === "email" ? (
            <a href={`mailto:${cf.value}`} className="underline">
              {cf.value}
            </a>
          ) : cf.field_type === "phone" ? (
            <a href={`tel:${cf.value}`} className="underline">
              {cf.value}
            </a>
          ) : cf.field_type === "url" ? (
            <a
              href={cf.value}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {cf.value}
            </a>
          ) : (
            cf.value
          )}
        </span>
        {cf.is_primary && (
          <Badge variant="secondary" className="text-[10px]">
            primary
          </Badge>
        )}
        <div className="ml-auto">
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
                  if (window.confirm("Delete this field?"))
                    deleteMutation.mutate()
                },
              },
            ]}
          />
        </div>
      </div>
      <EditContactFieldDialog
        field={cf}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export function ContactFieldsCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["contact-fields", contactId],
    queryFn: () => ContactFieldsService.listContactFields({ contactId }),
  })
  const fields =
    (data as { data?: ContactFieldPublic[] } | undefined)?.data ?? []

  const byType: Record<string, ContactFieldPublic[]> = {}
  for (const f of fields) {
    if (!byType[f.field_type]) byType[f.field_type] = []
    byType[f.field_type].push(f)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Contact Information</CardTitle>
        <AddContactFieldDialog contactId={contactId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : fields.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(byType).map(([type, typeFields]) => (
              <div key={type}>
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  {type}
                </h4>
                <div className="space-y-1">
                  {typeFields.map((f) => (
                    <FieldRow key={f.id} field={f} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Mail}
            title="No contact info"
            description="Add an email, phone, or social handle to reach this contact."
          />
        )}
      </CardContent>
    </Card>
  )
}
