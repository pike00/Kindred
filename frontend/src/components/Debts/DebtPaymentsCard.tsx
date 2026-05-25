import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useState } from "react"
import { type DebtPublic, DebtsService } from "@/client"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar as CalendarIcon, Trash2 } from "@/lib/icons"

interface DebtPaymentsCardProps {
  debt: DebtPublic
}

export function DebtPaymentsCard({ debt }: DebtPaymentsCardProps) {
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState<Date>(new Date())
  const [note, setNote] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["debt-payments", debt.id],
    queryFn: () => DebtsService.listDebtPayments({ debtId: debt.id }),
  })

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; paid_at: string; note?: string }) =>
      DebtsService.createDebtPayment({ debtId: debt.id, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debt-payments", debt.id] })
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      setAmount("")
      setNote("")
      setIsAdding(false)
      toast({ title: "Payment added successfully" })
    },
    onError: () => {
      toast({ title: "Failed to add payment", variant: "destructive" })
    },
  })

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      DebtsService.deleteDebtPayment({ paymentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debt-payments", debt.id] })
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      toast({ title: "Payment deleted successfully" })
    },
    onError: () => {
      toast({ title: "Failed to delete payment", variant: "destructive" })
    },
  })

  const handleAddPayment = () => {
    const numAmount = parseFloat(amount)
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" })
      return
    }
    addPaymentMutation.mutate({
      amount: numAmount,
      paid_at: format(paidAt, "yyyy-MM-dd"),
      note: note || undefined,
    })
  }

  const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const isOverpaid = paidAmount > (debt.amount || 0)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Payments</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Cancel" : "Add Payment"}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Date Paid</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paidAt ? format(paidAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paidAt}
                      onSelect={(date) => date && setPaidAt(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-note">Note (optional)</Label>
              <Textarea
                id="payment-note"
                placeholder="Payment note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={handleAddPayment}
                disabled={addPaymentMutation.isPending}
              >
                {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading payments...</p>
      ) : payments.length > 0 ? (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-start justify-between p-2 rounded-lg border"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  ${payment.amount?.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.paid_at && format(new Date(payment.paid_at), "PPP")}
                </p>
                {payment.note && (
                  <p className="text-xs text-muted-foreground">
                    {payment.note}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() =>
                  payment.id && deletePaymentMutation.mutate(payment.id)
                }
                disabled={deletePaymentMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="pt-2 border-t">
            <p className="text-sm">
              <span className="font-medium">
                Paid: ${paidAmount.toFixed(2)}
              </span>
              {" / "}
              <span>Total: ${debt.amount?.toFixed(2)}</span>
            </p>
            {isOverpaid && (
              <p className="text-xs text-yellow-600 mt-1">
                Overpaid by ${(paidAmount - (debt.amount || 0)).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No payments recorded yet.
        </p>
      )}
    </div>
  )
}
