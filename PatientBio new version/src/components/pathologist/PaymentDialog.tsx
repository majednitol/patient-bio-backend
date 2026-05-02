 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   usePathologistPaymentMutations,
   PAYMENT_METHODS,
   PaymentMethod,
 } from "@/hooks/usePathologistPayments";
 import { Invoice } from "@/hooks/usePathologistInvoices";
 
 interface PaymentDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   invoice: Invoice | null;
 }
 
 export const PaymentDialog = ({ open, onOpenChange, invoice }: PaymentDialogProps) => {
   const { createPayment } = usePathologistPaymentMutations();
   
   const balanceDue = invoice ? invoice.total_amount - invoice.amount_paid : 0;
   
   const [amount, setAmount] = useState(balanceDue.toString());
   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
   const [transactionRef, setTransactionRef] = useState("");
   const [notes, setNotes] = useState("");
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!invoice) return;
 
     await createPayment.mutateAsync({
       invoice_id: invoice.id,
       amount: parseFloat(amount),
       payment_method: paymentMethod,
       transaction_ref: transactionRef || null,
       notes: notes || null,
     });
 
     onOpenChange(false);
     setAmount("");
     setPaymentMethod("cash");
     setTransactionRef("");
     setNotes("");
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>Record Payment</DialogTitle>
         </DialogHeader>
 
         {invoice && (
           <div className="bg-muted p-3 rounded-lg mb-4">
             <p className="text-sm">
               <span className="text-muted-foreground">Invoice:</span>{" "}
               <span className="font-medium">{invoice.invoice_number}</span>
             </p>
             <p className="text-sm">
               <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">৳{invoice.total_amount.toFixed(2)}</span>
             </p>
             <p className="text-sm">
               <span className="text-muted-foreground">Already Paid:</span>{" "}
                <span className="font-medium">৳{invoice.amount_paid.toFixed(2)}</span>
             </p>
             <p className="text-sm font-bold">
               <span className="text-muted-foreground">Balance Due:</span>{" "}
                <span className="text-primary">৳{balanceDue.toFixed(2)}</span>
             </p>
           </div>
         )}
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label>Amount *</Label>
             <Input
               type="number"
               min="0.01"
               step="0.01"
               max={balanceDue}
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               required
             />
           </div>
 
           <div className="space-y-2">
             <Label>Payment Method *</Label>
             <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {PAYMENT_METHODS.map((method) => (
                   <SelectItem key={method.value} value={method.value}>
                     {method.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           <div className="space-y-2">
             <Label>Transaction Reference</Label>
             <Input
               value={transactionRef}
               onChange={(e) => setTransactionRef(e.target.value)}
               placeholder="e.g., UPI ID, Card last 4 digits"
             />
           </div>
 
           <div className="space-y-2">
             <Label>Notes</Label>
             <Textarea
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               placeholder="Payment notes..."
               rows={2}
             />
           </div>
 
           <div className="flex justify-end gap-2">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={createPayment.isPending}>
               {createPayment.isPending ? "Recording..." : "Record Payment"}
             </Button>
           </div>
         </form>
       </DialogContent>
     </Dialog>
   );
 };