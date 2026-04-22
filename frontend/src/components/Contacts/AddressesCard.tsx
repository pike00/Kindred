import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { AddressCreate, AddressPublic, AddressUpdate } from "@/client"
import { AddressesService } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { MapPin, Pencil, Plus, Trash2 } from "@/lib/icons"

const schema = z.object({
  label: z.string().optional(),
  street: z.string().optional(),
  extended: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  label: "",
  street: "",
  extended: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
}

function toPayload(data: FormData) {
  return {
    label: data.label || undefined,
    street: data.street || null,
    extended: data.extended || null,
    city: data.city || null,
    region: data.region || null,
    postal_code: data.postal_code || null,
    country: data.country || null,
  }
}

interface AddressFormFieldsProps {
  form: ReturnType<typeof useForm<FormData>>
}

const LABEL_PRESETS = ["Home", "Work"] as const

function isPresetMatch(value: string | undefined, preset: string) {
  return (value ?? "").trim().toLowerCase() === preset.toLowerCase()
}

function isOtherLabel(value: string | undefined) {
  const v = (value ?? "").trim()
  return v !== "" && !LABEL_PRESETS.some((p) => isPresetMatch(v, p))
}

function AddressFormFields({ form }: AddressFormFieldsProps) {
  return (
    <div className="grid gap-4 py-2">
      <FormField
        control={form.control}
        name="label"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Label</FormLabel>
            <div className="flex flex-wrap gap-1">
              {LABEL_PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={
                    isPresetMatch(field.value, p) ? "default" : "outline"
                  }
                  onClick={() => field.onChange(p)}
                  aria-pressed={isPresetMatch(field.value, p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={isOtherLabel(field.value) ? "default" : "outline"}
                onClick={() => field.onChange("")}
                aria-pressed={isOtherLabel(field.value)}
              >
                Other
              </Button>
            </div>
            <FormControl>
              <Input placeholder="Enter custom label..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="street"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street</FormLabel>
            <FormControl>
              <Input placeholder="123 Main St" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="extended"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Apt / Suite</FormLabel>
            <FormControl>
              <Input placeholder="Apt 4B" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="Brooklyn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Region / State</FormLabel>
              <FormControl>
                <Input placeholder="NY" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="postal_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal code</FormLabel>
              <FormControl>
                <Input placeholder="11201" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input placeholder="USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function AddAddressDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: AddressCreate) =>
      AddressesService.createAddressRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Address added")
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["addresses", contactId] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to add address",
      ),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      ...toPayload(data),
      contact_id: contactId,
    } as AddressCreate)
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
          <DialogTitle>Add address</DialogTitle>
          <DialogDescription>
            Attach a physical address to this contact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AddressFormFields form={form} />
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

function EditAddressDialog({
  address,
  open,
  onOpenChange,
}: {
  address: AddressPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      label: address.label ?? "",
      street: address.street ?? "",
      extended: address.extended ?? "",
      city: address.city ?? "",
      region: address.region ?? "",
      postal_code: address.postal_code ?? "",
      country: address.country ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        label: address.label ?? "",
        street: address.street ?? "",
        extended: address.extended ?? "",
        city: address.city ?? "",
        region: address.region ?? "",
        postal_code: address.postal_code ?? "",
        country: address.country ?? "",
      })
    }
  }, [open, address, form])

  const mutation = useMutation({
    mutationFn: (data: AddressUpdate) =>
      AddressesService.updateAddress({
        addressId: address.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Address updated")
      onOpenChange(false)
      queryClient.invalidateQueries({
        queryKey: ["addresses", address.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update address",
      ),
  })

  const onSubmit = (data: FormData) =>
    mutation.mutate(toPayload(data) as AddressUpdate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit address</DialogTitle>
          <DialogDescription>Update the address details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AddressFormFields form={form} />
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

function AddressRow({ address }: { address: AddressPublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => AddressesService.deleteAddress({ addressId: address.id }),
    onSuccess: () => {
      showSuccessToast("Address deleted")
      queryClient.invalidateQueries({
        queryKey: ["addresses", address.contact_id],
      })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete address",
      ),
  })

  const lines = [address.street, address.extended].filter(Boolean)
  const cityLine = [address.city, address.region, address.postal_code]
    .filter(Boolean)
    .join(", ")

  return (
    <>
      <div className="flex items-start justify-between gap-2 text-sm">
        <div className="min-w-0">
          {address.label && <div className="font-medium">{address.label}</div>}
          {lines.map((l, i) => (
            <p key={i} className="text-muted-foreground">
              {l}
            </p>
          ))}
          {cityLine && <p className="text-muted-foreground">{cityLine}</p>}
          {address.country && (
            <p className="text-muted-foreground">{address.country}</p>
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
                if (window.confirm("Delete this address?"))
                  deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditAddressDialog
        address={address}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export function AddressesCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["addresses", contactId],
    queryFn: () => AddressesService.listAddresses({ contactId }),
  })
  const addresses = (data as { data?: AddressPublic[] } | undefined)?.data ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" /> Addresses
        </CardTitle>
        <AddAddressDialog contactId={contactId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : addresses.length > 0 ? (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <AddressRow key={addr.id} address={addr} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No addresses"
            description="Track home, work, or mailing addresses for this contact."
          />
        )}
      </CardContent>
    </Card>
  )
}
