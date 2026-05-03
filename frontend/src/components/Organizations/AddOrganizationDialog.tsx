import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { OrganizationCreate } from "@/client"
import { OrganizationsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const organizationCreateSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().optional(),
  industry: z.string().optional(),
})

type OrganizationCreateFormData = z.infer<typeof organizationCreateSchema>

interface AddOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddOrganizationDialog({
  open,
  onOpenChange,
}: AddOrganizationDialogProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<OrganizationCreateFormData>({
    resolver: zodResolver(organizationCreateSchema),
    defaultValues: {
      name: "",
      domain: "",
      industry: "",
    },
  })

  const createOrgMutation = useMutation({
    mutationFn: (data: OrganizationCreate) =>
      OrganizationsService.createOrganization({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Organization created successfully")
      form.reset()
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
    onError: () => {
      showErrorToast("Failed to create organization")
    },
  })

  const onSubmit = (data: OrganizationCreateFormData) => {
    const payload: OrganizationCreate = {
      name: data.name,
      domain: data.domain || null,
      industry: data.industry || null,
    }
    createOrgMutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to link with your contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Technology" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createOrgMutation.isPending}
              className="w-full"
            >
              {createOrgMutation.isPending
                ? "Creating..."
                : "Create Organization"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
