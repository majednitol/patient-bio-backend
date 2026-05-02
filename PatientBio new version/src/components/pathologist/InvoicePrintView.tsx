 import { useRef } from "react";
 import { Button } from "@/components/ui/button";
 import { Printer } from "lucide-react";
 import { Invoice } from "@/hooks/usePathologistInvoices";
 import { usePathologistProfile } from "@/hooks/usePathologistProfile";
 
 interface InvoicePrintViewProps {
   invoice: Invoice;
   onClose: () => void;
 }
 
 export const InvoicePrintView = ({ invoice, onClose }: InvoicePrintViewProps) => {
   const printRef = useRef<HTMLDivElement>(null);
   const { profile } = usePathologistProfile();
 
   const handlePrint = () => {
     const printContent = printRef.current;
     if (!printContent) return;
 
     const printWindow = window.open("", "_blank");
     if (!printWindow) return;
 
     printWindow.document.write(`
       <!DOCTYPE html>
       <html>
          <head>
            <title>Invoice ${invoice.invoice_number}</title>
            <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
            <style>
             body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
             .header { text-align: center; margin-bottom: 30px; }
             .header h1 { margin: 0; color: #333; }
             .header p { margin: 5px 0; color: #666; }
             .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
             .invoice-info div { width: 48%; }
             table { width: 100%; border-collapse: collapse; margin: 20px 0; }
             th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
             th { background-color: #f5f5f5; }
             .totals { text-align: right; margin-top: 20px; }
             .totals p { margin: 5px 0; }
             .totals .total { font-size: 18px; font-weight: bold; }
             .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
             .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
             .status-paid { background: #d4edda; color: #155724; }
             .status-pending { background: #fff3cd; color: #856404; }
             .status-partial { background: #cce5ff; color: #004085; }
             @media print { button { display: none; } }
           </style>
         </head>
         <body>
           ${printContent.innerHTML}
         </body>
       </html>
     `);
 
     printWindow.document.close();
     printWindow.print();
   };
 
   const statusClass = {
     paid: "status-paid",
     pending: "status-pending",
     partial: "status-partial",
     draft: "status-pending",
     cancelled: "status-pending",
   }[invoice.status];
 
   return (
     <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-background border rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
         <div className="p-4 border-b flex justify-between items-center">
           <h2 className="text-lg font-semibold">Invoice Preview</h2>
           <div className="flex gap-2">
             <Button onClick={handlePrint}>
               <Printer className="h-4 w-4 mr-2" /> Print
             </Button>
             <Button variant="outline" onClick={onClose}>
               Close
             </Button>
           </div>
         </div>
 
         <div ref={printRef} className="p-8">
           <div className="header">
             <h1>{profile?.lab_name || "Diagnostic Center"}</h1>
             <p>{profile?.lab_address || ""}</p>
             <p>Phone: {profile?.phone || "N/A"} | Email: {profile?.email || "N/A"}</p>
           </div>
 
           <div className="invoice-info">
             <div>
               <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
               <p><strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
               {invoice.due_date && (
                 <p><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</p>
               )}
             </div>
             <div style={{ textAlign: "right" }}>
               <p><strong>Status:</strong> <span className={`status ${statusClass}`}>{invoice.status.toUpperCase()}</span></p>
               <p><strong>Patient ID:</strong> {invoice.patient_id.slice(0, 8)}...</p>
             </div>
           </div>
 
           <table>
             <thead>
               <tr>
                 <th>#</th>
                 <th>Description</th>
                 <th>Qty</th>
                 <th>Unit Price</th>
                 <th>Total</th>
               </tr>
             </thead>
             <tbody>
               {invoice.items?.map((item, index) => (
                 <tr key={item.id || index}>
                   <td>{index + 1}</td>
                   <td>{item.description}</td>
                   <td>{item.quantity}</td>
                    <td>৳{item.unit_price.toFixed(2)}</td>
                    <td>৳{item.total_price.toFixed(2)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
 
           <div className="totals">
              <p>Subtotal: ৳{invoice.subtotal.toFixed(2)}</p>
              <p>Tax: ৳{invoice.tax_amount.toFixed(2)}</p>
              <p>Discount: -৳{invoice.discount_amount.toFixed(2)}</p>
              <p className="total">Total: ৳{invoice.total_amount.toFixed(2)}</p>
              <p>Amount Paid: ৳{invoice.amount_paid.toFixed(2)}</p>
              <p className="total">Balance Due: ৳{(invoice.total_amount - invoice.amount_paid).toFixed(2)}</p>
           </div>
 
           {invoice.notes && (
             <div style={{ marginTop: "20px" }}>
               <p><strong>Notes:</strong> {invoice.notes}</p>
             </div>
           )}
 
           <div className="footer">
             <p>Thank you for choosing {profile?.lab_name || "our services"}!</p>
             <p>This is a computer-generated invoice.</p>
           </div>
         </div>
       </div>
     </div>
   );
 };