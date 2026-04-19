import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { PetCreate, PetPublic, PetUpdate } from "@/client"
import { PetsService } from "@/client"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { PawPrint, Pencil, Plus, Trash2 } from "@/lib/icons"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  species: z.string().optional(),
  breed: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  name: "",
  species: "",
  breed: "",
  notes: "",
}

function toPayload(data: FormData) {
  return {
    name: data.name,
    species: data.species || null,
    breed: data.breed || null,
    notes: data.notes || null,
  }
}

function PetFormFields({
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
              <Input placeholder="Biscuit" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="species"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Species</FormLabel>
              <FormControl>
                <Input placeholder="Dog" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="breed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Breed</FormLabel>
              <FormControl>
                <Input placeholder="Collie" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
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
  )
}

function AddPetDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: PetCreate) =>
      PetsService.createPetRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Pet added")
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["pets", contactId] })
    },
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Failed to add pet"),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({ ...toPayload(data), contact_id: contactId } as PetCreate)
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
          <DialogTitle>Add pet</DialogTitle>
          <DialogDescription>
            Track a pet belonging to this contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <PetFormFields form={form} />
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

function EditPetDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: PetPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: pet.name,
      species: pet.species ?? "",
      breed: pet.breed ?? "",
      notes: pet.notes ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: pet.name,
        species: pet.species ?? "",
        breed: pet.breed ?? "",
        notes: pet.notes ?? "",
      })
    }
  }, [open, pet, form])

  const mutation = useMutation({
    mutationFn: (data: PetUpdate) =>
      PetsService.updatePet({ petId: pet.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Pet updated")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["pets", pet.contact_id] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update pet",
      ),
  })

  const onSubmit = (data: FormData) =>
    mutation.mutate(toPayload(data) as PetUpdate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit pet</DialogTitle>
          <DialogDescription>Update pet details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <PetFormFields form={form} />
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

function PetRow({ pet }: { pet: PetPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => PetsService.deletePet({ petId: pet.id }),
    onSuccess: () => {
      showSuccessToast("Pet deleted")
      queryClient.invalidateQueries({ queryKey: ["pets", pet.contact_id] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete pet",
      ),
  })

  return (
    <>
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          <span className="font-medium">{pet.name}</span>
          {(pet.species || pet.breed) && (
            <span className="text-muted-foreground">
              {" "}
              &mdash; {[pet.species, pet.breed].filter(Boolean).join(", ")}
            </span>
          )}
          {pet.notes && (
            <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">
              {pet.notes}
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
                if (window.confirm("Delete this pet?")) deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditPetDialog pet={pet} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

export function PetsCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["pets", contactId],
    queryFn: () => PetsService.listPets({ contactId }),
  })
  const pets = (data as { data?: PetPublic[] } | undefined)?.data ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <PawPrint className="size-4" /> Pets
        </CardTitle>
        <AddPetDialog contactId={contactId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : pets.length > 0 ? (
          <div className="space-y-2">
            {pets.map((p) => (
              <PetRow key={p.id} pet={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PawPrint}
            title="No pets"
            description="Track furry, feathered, or scaly companions for this contact."
          />
        )}
      </CardContent>
    </Card>
  )
}
