import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  CustomFieldDefinitionCreate,
  CustomFieldDefinitionPublic,
  CustomFieldDefinitionUpdate,
} from "@/client"
import { CustomFieldsService } from "@/client"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Plus } from "@/lib/icons"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  field_type: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  name: "",
  field_type: "text",
  description: "",
  icon: "",
}

function DefinitionFormFields({
  form,
}: {
  form: ReturnType<typeof useForm<FormData>>
}) {
  return (
    <div className="grid gap-4 py-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Coffee preference" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="field_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <Input placeholder="text" {...field} />
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
      <FormField
        control={form.control}
        name="icon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Icon</FormLabel>
            <FormControl>
              <Input placeholder="coffee" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function toCreatePayload(data: FormData): CustomFieldDefinitionCreate {
  return {
    name: data.name,
    field_type: data.field_type || "text",
    description: data.description || null,
    icon: data.icon || null,
  }
}

function AddDefinitionDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: CustomFieldDefinitionCreate) =>
      CustomFieldsService.createFieldDefinition({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Definition added")
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add definition",
      ),
  })

  const onSubmit = (data: FormData) => mutation.mutate(toCreatePayload(data))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 size-3.5" /> Add field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom field definition</DialogTitle>
          <DialogDescription>
            Definitions describe what custom fields can be attached to contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DefinitionFormFields form={form} />
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

function EditDefinitionDialog({
  def,
  open,
  onOpenChange,
}: {
  def: CustomFieldDefinitionPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: def.name,
      field_type: def.field_type ?? "text",
      description: def.description ?? "",
      icon: def.icon ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: def.name,
        field_type: def.field_type ?? "text",
        description: def.description ?? "",
        icon: def.icon ?? "",
      })
    }
  }, [open, def, form])

  const mutation = useMutation({
    mutationFn: (data: CustomFieldDefinitionUpdate) =>
      CustomFieldsService.updateFieldDefinition({
        defId: def.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Definition updated")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update definition",
      ),
  })

  const onSubmit = (data: FormData) =>
    mutation.mutate({
      name: data.name,
      field_type: data.field_type || "text",
      description: data.description || null,
      icon: data.icon || null,
    } as CustomFieldDefinitionUpdate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit definition</DialogTitle>
          <DialogDescription>
            Update the custom field definition.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DefinitionFormFields form={form} />
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

function DefinitionRow({ def }: { def: CustomFieldDefinitionPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () =>
      CustomFieldsService.deleteFieldDefinition({ defId: def.id }),
    onSuccess: () => {
      showSuccessToast("Definition deleted")
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete definition",
      ),
  })

  return (
    <>
      <div className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
        <div className="min-w-0">
          <div className="font-medium">{def.name}</div>
          <div className="text-xs text-muted-foreground">
            {def.field_type || "text"}
            {def.icon ? ` · ${def.icon}` : ""}
          </div>
          {def.description && (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
              {def.description}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this definition? Existing values for this field will also be removed.",
                  )
                )
                  deleteMutation.mutate()
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditDefinitionDialog
        def={def}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export default function CustomFieldDefinitions() {
  const { data, isLoading } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: () => CustomFieldsService.listFieldDefinitions(),
  })
  const definitions =
    (data as { data?: CustomFieldDefinitionPublic[] } | undefined)?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Custom field definitions</h2>
          <p className="text-sm text-muted-foreground">
            Define arbitrary fields you want to track on contacts (coffee
            preference, kid names, shirt size, ...).
          </p>
        </div>
        <AddDefinitionDialog />
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : definitions.length > 0 ? (
        <div className="grid gap-2">
          {definitions.map((d) => (
            <DefinitionRow key={d.id} def={d} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No definitions yet. Add one to start attaching custom fields to
          contacts.
        </p>
      )}
    </div>
  )
}
