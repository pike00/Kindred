import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ContactSharesService } from "@/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
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
import useCustomToast from "@/hooks/useCustomToast"
import { AlertTriangle } from "@/lib/icons"

const contactShareSchema = z.object({
  granteeEmail: z.string().email("Please enter a valid email address"),
  confirmed: z
    .boolean()
    .refine((value) => value, {
      message: "You must confirm the full sharing scope before continuing",
    }),
})

type ContactShareFormData = z.infer<typeof contactShareSchema>

interface ContactShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultValues: ContactShareFormData = {
  granteeEmail: "",
  confirmed: false,
}

export function ContactShareDialog({
  open,
  onOpenChange,
}: ContactShareDialogProps) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const form = useForm<ContactShareFormData>({
    resolver: zodResolver(contactShareSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues)
    }
  }, [form, open])

  const createShareMutation = useMutation({
    mutationFn: (data: ContactShareFormData) =>
      ContactSharesService.createContactShare({
        requestBody: { grantee_email: data.granteeEmail },
      }),
    onSuccess: (share) => {
      showSuccessToast(`Shared all contacts with ${share.grantee_email}`)
      queryClient.invalidateQueries({ queryKey: ["contact-shares"] })
      onOpenChange(false)
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error ? error.message : "Failed to share contacts",
      )
    },
  })

  const onSubmit = (data: ContactShareFormData) => {
    createShareMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share all contacts</DialogTitle>
          <DialogDescription>
            Grant one active user full access to every contact you own.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="granteeEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient email</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="email"
                      placeholder="person@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sharing scope</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  This shares all current and future contacts and their
                  contact-related records. The recipient can edit shared
                  contacts and interactions.
                </p>
                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={field.value}
                          className="mt-0.5"
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                        <span>
                          I understand this grants read and write access to all
                          of my current and future contacts, their
                          contact-related records, and their interactions.
                        </span>
                      </label>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createShareMutation.isPending || !form.watch("confirmed")
                }
              >
                {createShareMutation.isPending
                  ? "Sharing..."
                  : "Share all contacts"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
