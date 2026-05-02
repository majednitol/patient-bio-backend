import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CreditCard, AlertCircle } from "lucide-react";
import type { HospitalInvoice } from "@/hooks/useHospitalPatientHistory";
import { usePaymentMutations, PAYMENT_METHODS, Payment } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";

interface PatientInvoiceSummaryCardProps {
  invoice: HospitalInvoice;
  hospitalId: string;
}

export default function PatientInvoiceSummaryCard({ invoice, hospitalId }: PatientInvoiceSummaryCardProps) {
  const { user } = useAuth();
  const { recordPayment } = usePaymentMutations(hospitalId);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<Payment["payment_method"]>("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const outstanding = (invoice.total_amount || 0) - (invoice.amount_paid || 0);

  const getStatusBadge = () => {
    switch (invoice.status) {
      case "paid":
        return <Badge className="bg-primary">Paid</Badge>;
      case "partial":
        return <Badge variant="outline">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{invoice.status}</Badge>;
    }
  };

  const handleRecordPayment = async () => {
    if (!user || !paymentAmount) return;

    await recordPayment.mutateAsync({
      invoiceId: invoice.id,
      amount: parseFloat(paymentAmount),
      paymentMethod,
      transactionRef: transactionRef || undefined,
      notes: paymentNotes || undefined,
      receivedBy: user.id,
    });

    setPaymentDialogOpen(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setTransactionRef("");
    setPaymentNotes("");
  };

  return (
    <>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              {/* Invoice Number and Date */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{invoice.invoice_number}</span>
                </div>
                {getStatusBadge()}
              </div>

              {/* Date */}
              <p className="text-sm text-muted-foreground">
                {format(new Date(invoice.invoice_date), "MMM d, yyyy")}
                {invoice.due_date && (
                  <span> • Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}</span>
                )}
              </p>

              {/* Amount */}
              <div className="flex items-center gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-semibold">৳{invoice.total_amount?.toLocaleString() || 0}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Paid:</span>{" "}
                  <span className="text-primary font-medium">৳{invoice.amount_paid?.toLocaleString() || 0}</span>
                </span>
                {outstanding > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-destructive font-semibold">৳{outstanding.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Pay Button */}
            {outstanding > 0 && invoice.status !== "cancelled" && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setPaymentAmount(outstanding.toString());
                  setPaymentDialogOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pay
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {invoice.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={outstanding}
              />
              <p className="text-xs text-muted-foreground">
                Outstanding: ৳{outstanding.toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as Payment["payment_method"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transaction Reference (Optional)</Label>
              <Input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Transaction ID / Check number"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || recordPayment.isPending}
            >
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
