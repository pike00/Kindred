import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  ContactPublic,
  RelationshipCreate,
  RelationshipPublic,
  RelationshipUpdate,
} from "@/client"
import { ContactsService, RelationshipsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { HouseholdCard } from "@/components/Contacts/HouseholdCard"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import {
  ChevronsUpDown,
  HeartHandshake,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "@/lib/icons"

const updateSchema = z.object({
  relationship_type: z.string().min(1, "Relationship type is required"),
  notes: z.string().optional(),
})
type UpdateFormData = z.infer<typeof updateSchema>

function formatContactName(c: ContactPublic) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "(unnamed)"
}

function AddRelationshipInline({
  contactId,
  contactName,
}: {
  contactId: string
  contactName: string
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selected, setSelected] = useState<ContactPublic | null>(null)
  const [relationshipType, setRelationshipType] = useState("")
  const [inverseType, setInverseType] = useState("")
  const [inverseTouched, setInverseTouched] = useState(false)
  const typeInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: contactsResp } = useQuery({
    queryKey: ["contacts", "picker"],
    queryFn: () => ContactsService.listContacts({ limit: 500 }),
  })

  const pickerContacts = useMemo(
    () => (contactsResp?.data ?? []).filter((c) => c.id !== contactId),
    [contactsResp, contactId],
  )

  const trimmedType = relationshipType.trim()
  const inverseQuery = useQuery({
    queryKey: ["relationship-inverse", trimmedType.toLowerCase()],
    queryFn: () => RelationshipsService.lookupInverse({ type: trimmedType }),
    enabled: trimmedType.length > 0,
    staleTime: 5 * 60 * 1000,
  })
  const inferredInverse =
    (inverseQuery.data as { inverse?: string | null } | undefined)?.inverse ??
    null
  const lookupSettled = inverseQuery.isFetched && !inverseQuery.isFetching
  const needsManualInverse =
    lookupSettled && trimmedType.length > 0 && inferredInverse === null
  const effectiveInverse = inferredInverse ?? inverseType.trim()

  const mutation = useMutation({
    mutationFn: (data: RelationshipCreate) =>
      RelationshipsService.createRelationshipRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Relationship added")
      setSelected(null)
      setRelationshipType("")
      setInverseType("")
      setInverseTouched(false)
      queryClient.invalidateQueries({ queryKey: ["relationships", contactId] })
      queryClient.invalidateQueries({ queryKey: ["contacts", "picker"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add relationship",
      ),
  })

  useEffect(() => {
    if (selected) typeInputRef.current?.focus()
  }, [selected])

  useEffect(() => {
    if (!inverseTouched) setInverseType(trimmedType)
  }, [trimmedType, inverseTouched])

  const reset = () => {
    setSelected(null)
    setRelationshipType("")
    setInverseType("")
    setInverseTouched(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !trimmedType || !effectiveInverse) return
    mutation.mutate({
      contact_id: contactId,
      related_contact_id: selected.id,
      relationship_type: trimmedType,
      inverse_relationship_type: effectiveInverse,
      notes: null,
    } as RelationshipCreate)
  }

  if (!selected) {
    return (
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={pickerOpen}
            className="w-full justify-between text-muted-foreground font-normal"
          >
            <span className="flex items-center">
              <Plus className="mr-1 size-3.5" /> Add relationship
            </span>
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandList>
              {pickerContacts.length === 0 ? (
                <CommandEmpty>No other contacts yet.</CommandEmpty>
              ) : (
                <>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {pickerContacts.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={formatContactName(c)}
                        onSelect={() => {
                          setSelected(c)
                          setPickerOpen(false)
                        }}
                      >
                        {formatContactName(c)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="shrink-0">
          {formatContactName(selected)}
        </Badge>
        <span className="text-muted-foreground text-sm">
          is {contactName ? `${contactName}'s` : "their"}
        </span>
        <button
          type="button"
          onClick={reset}
          className="ml-auto text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          ref={typeInputRef}
          placeholder="spouse, brother, colleague..."
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              reset()
            }
          }}
          className="h-8"
        />
        <LoadingButton
          type="submit"
          size="sm"
          loading={mutation.isPending}
          disabled={!trimmedType || !effectiveInverse}
        >
          Save
        </LoadingButton>
      </div>
      {inferredInverse && (
        <p className="text-muted-foreground text-xs">
          {contactName || "this contact"} will appear as{" "}
          {formatContactName(selected)}'s{" "}
          <span className="font-medium">{inferredInverse}</span>.
        </p>
      )}
      {needsManualInverse && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            And {contactName || "this contact"} is {formatContactName(selected)}
            's…
          </p>
          <Input
            placeholder="reverse relationship"
            value={inverseType}
            onChange={(e) => {
              setInverseType(e.target.value)
              setInverseTouched(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                reset()
              }
            }}
            className="h-8"
          />
        </div>
      )}
    </form>
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
      notes: rel.notes ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        relationship_type: rel.relationship_type,
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

export function RelationshipsCard({
  contactId,
  contactName,
}: {
  contactId: string
  contactName: string
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["relationships", contactId],
    queryFn: () => RelationshipsService.listRelationships({ contactId }),
  })
  const relationships =
    (data as { data?: RelationshipPublic[] } | undefined)?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" /> People
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <HouseholdCard
          contactId={contactId}
          contactName={contactName}
          embedded
        />
        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <HeartHandshake className="size-4" /> Relationships
          </div>
          <AddRelationshipInline
            contactId={contactId}
            contactName={contactName}
          />
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
        </div>
      </CardContent>
    </Card>
  )
}
