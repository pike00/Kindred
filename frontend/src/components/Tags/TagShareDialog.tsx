import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { TagPublic, TagSharePreview } from "@/client"
import { TagSharesService } from "@/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
import { AlertTriangle, CheckCircle2, Loader2, Share2 } from "@/lib/icons"

interface TagShareDialogProps {
  tag: TagPublic
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const shareSchema = z.object({
  granteeEmail: z.string().email("Please enter a valid email address"),
})

type ShareFormData = z.infer<typeof shareSchema>

export const TagShareDialog = ({
  tag,
  children,
  open: controlledOpen,
  onOpenChange,
}: TagShareDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  // Use controlled or uncontrolled open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      setInternalOpen(value)
    }
    if (!value) resetState()
  }
  const [step, setStep] = useState<"select" | "preview" | "confirm">("select")
  const [preview, setPreview] = useState<TagSharePreview | null>(null)
  const [confirmText, setConfirmText] = useState("")
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      granteeEmail: "",
    },
  })

  const previewMutation = useMutation({
    mutationFn: (tagId: string) => TagSharesService.previewTagShare({ tagId }),
    onSuccess: (data) => {
      setPreview(data)
      setStep("preview")
    },
    onError: () => {
      showErrorToast("Failed to load preview")
    },
  })

  const shareMutation = useMutation({
    mutationFn: (data: { tagId: string; granteeEmail: string }) =>
      TagSharesService.createTagShare({
        requestBody: {
          tag_id: data.tagId,
          grantee_email: data.granteeEmail,
        },
      }),
    onSuccess: () => {
      showSuccessToast(`Tag "${tag.name}" shared successfully`)
      queryClient.invalidateQueries({ queryKey: ["tag-shares", tag.id] })
      setIsOpen(false)
      resetState()
    },
    onError: () => {
      showErrorToast("Failed to share tag")
    },
  })

  const resetState = () => {
    setStep("select")
    setPreview(null)
    setConfirmText("")
    form.reset()
  }

  const handleFindGrantee = (_data: ShareFormData) => {
    previewMutation.mutate(tag.id)
  }

  const handleShare = () => {
    const email = form.getValues("granteeEmail")
    shareMutation.mutate({ tagId: tag.id, granteeEmail: email })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Tag: {tag.name}</DialogTitle>
          <DialogDescription>
            Grant another user read and write access to all contacts with this
            tag.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleFindGrantee)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="granteeEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grantee Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the email of the user to share with"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={
                    previewMutation.isPending || !form.watch("granteeEmail")
                  }
                  className="w-full"
                >
                  {previewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Preview...
                    </>
                  ) : (
                    "Continue to Preview"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sharing Scope Warning</AlertTitle>
              <AlertDescription>
                You are about to share the tag <strong>"{tag.name}"</strong>.
                This will grant the selected user read and write access to:
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Scope Preview</h4>
              <p className="text-sm text-muted-foreground">
                {preview.contact_count} contact(s) with{" "}
                {preview.total_related_rows} related records
              </p>

              {preview.sample_contacts &&
                preview.sample_contacts.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Sample contacts: </span>
                    {preview.sample_contacts.join(", ")}
                    {preview.contact_count > 3 && "..."}
                  </div>
                )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.entities
                    ?.sort((a, b) => b.count - a.count)
                    .map((entity) => (
                      <TableRow key={entity.entity_type}>
                        <TableCell>{entity.entity_type}</TableCell>
                        <TableCell className="text-right">
                          {entity.count}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={preview.contact_count === 0}
              >
                Continue to Confirm
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Confirmation Required</AlertTitle>
              <AlertDescription>
                Please type <strong>"I understand"</strong> to confirm sharing
                this tag.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm">
                You are sharing{" "}
                <strong>{preview.contact_count} contacts</strong> and{" "}
                <strong>{preview.total_related_rows} related rows</strong> with
                this tag.
              </p>

              <RadioGroup value={confirmText} onValueChange={setConfirmText}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="I understand" id="confirm" />
                  <Label htmlFor="confirm">
                    I understand I am sharing {preview.contact_count} contacts
                    and {preview.total_related_rows} related rows
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleShare}
                disabled={
                  confirmText !== "I understand" || shareMutation.isPending
                }
              >
                {shareMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Share
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
