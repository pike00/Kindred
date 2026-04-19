import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  ContactPublic,
  RelationshipCreate,
  RelationshipGroup,
  RelationshipPublic,
  RelationshipUpdate,
} from "@/client"
import { ContactsService, RelationshipsService } from "@/client"
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
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { HeartHandshake, Pencil, Plus, Trash2 } from "@/lib/icons"

const RELATIONSHIP_GROUPS: RelationshipGroup[] = [
  "family",
  "romantic",
  "friend",
  "work",
  "other",
]

const createSchema = z.object({
  relationship_type: z.string().min(1, "Relationship type is required"),
  relationship_group: z.enum(["family", "romantic", "friend", "work", "other"]),
  related_contact_id: z.string().min(1, "Related contact is required"),
  notes: z.string().optional(),
})

type CreateFormData = z.infer<typeof createSchema>

const updateSchema = createSchema.omit({ related_contact_id: true })
type UpdateFormData = z.infer<typeof updateSchema>

function formatContactName(c: ContactPublic) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "(unnamed)"
}

function AddRelationshipDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: contactsResp } = useQuery({
    queryKey: ["contacts", "picker"],
    queryFn: () => ContactsService.listContacts({ limit: 500 }),
    enabled: open,
  })

  const pickerContacts = useMemo(
    () => (contactsResp?.data ?? []).filter((c) => c.id !== contactId),
    [contactsResp, contactId],
  )

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: {
      relationship_type: "",
      relationship_group: "friend",
      related_contact_id: "",
      notes: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: RelationshipCreate) =>
      RelationshipsService.createRelationshipRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Relationship added")
      form.reset({
        relationship_type: "",
        relationship_group: "friend",
        related_contact_id: "",
        notes: "",
      })
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["relationships", contactId] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add relationship",
      ),
  })

  const onSubmit = (data: CreateFormData) => {
    mutation.mutate({
      contact_id: contactId,
      related_contact_id: data.related_contact_id,
      relationship_type: data.relationship_type,
      relationship_group: data.relationship_group,
      notes: data.notes || null,
    } as RelationshipCreate)
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
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>
            Link this contact to another contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-2">
              <FormField
                control={form.control}
                name="related_contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Related contact{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pickerContacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {formatContactName(c)}
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
                name="relationship_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="spouse, brother, colleague, ..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relationship_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
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

function EditRelationshipDialog({
  rel,
  open,
  onOpenChange,
}: {
  rel: RelationshipPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema) as any,
    defaultValues: {
      relationship_type: rel.relationship_type,
      relationship_group: rel.relationship_group,
      notes: rel.notes ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        relationship_type: rel.relationship_type,
        relationship_group: rel.relationship_group,
        notes: rel.notes ?? "",
      })
    }
  }, [open, rel, form])

  const mutation = useMutation({
    mutationFn: (data: RelationshipUpdate) =>
      RelationshipsService.updateRelationship({
        relId: rel.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Relationship updated")
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["relationships", rel.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update relationship",
      ),
  })

  const onSubmit = (data: UpdateFormData) => {
    mutation.mutate({
      relationship_type: data.relationship_type,
      relationship_group: data.relationship_group,
      notes: data.notes || null,
    } as RelationshipUpdate)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit relationship</DialogTitle>
          <DialogDescription>Update relationship details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-2">
              <FormField
                control={form.control}
                name="relationship_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relationship_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
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

function RelationshipRow({ rel }: { rel: RelationshipPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () =>
      RelationshipsService.deleteRelationship({ relId: rel.id }),
    onSuccess: () => {
      showSuccessToast("Relationship deleted")
      queryClient.invalidateQueries({
        queryKey: ["relationships", rel.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete relationship",
      ),
  })

  // Fetch the related contact lazily so we can show its name.
  const { data: relatedContact } = useQuery({
    queryKey: ["contacts", rel.related_contact_id],
    queryFn: () =>
      ContactsService.getContact({ contactId: rel.related_contact_id }),
    staleTime: 30_000,
  })

  const relatedName = relatedContact
    ? formatContactName(relatedContact)
    : rel.related_contact_id.slice(0, 8)

  return (
    <>
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/contacts/$contactId"
              params={{ contactId: rel.related_contact_id }}
              className="underline font-medium"
            >
              {relatedName}
            </Link>
            <span className="text-muted-foreground">
              &mdash; {rel.relationship_type}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {rel.relationship_group}
            </Badge>
          </div>
          {rel.notes && (
            <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">
              {rel.notes}
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
                if (window.confirm("Delete this relationship?"))
                  deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditRelationshipDialog
        rel={rel}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export function RelationshipsCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["relationships", contactId],
    queryFn: () => RelationshipsService.listRelationships({ contactId }),
  })
  const relationships =
    (data as { data?: RelationshipPublic[] } | undefined)?.data ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="size-4" /> Relationships
        </CardTitle>
        <AddRelationshipDialog contactId={contactId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : relationships.length > 0 ? (
          <div className="space-y-2">
            {relationships.map((r) => (
              <RelationshipRow key={r.id} rel={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={HeartHandshake}
            title="No relationships"
            description="Link this contact to family members, partners, friends, or coworkers."
          />
        )}
      </CardContent>
    </Card>
  )
}
