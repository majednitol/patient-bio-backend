import { forwardRef } from "react";
import { Invoice, InvoiceItem, INVOICE_ITEM_CATEGORIES } from "@/hooks/useInvoices";
import { Hospital } from "@/types/hospital";
import { format } from "date-fns";

interface InvoicePrintViewProps {
  invoice: Invoice;
  hospital: Hospital;
}

const InvoicePrintView = forwardRef<HTMLDivElement, InvoicePrintViewProps>(
  ({ invoice, hospital }, ref) => {
    const getCategoryLabel = (category: InvoiceItem["category"]) => {
      return INVOICE_ITEM_CATEGORIES.find((c) => c.value === category)?.label || category;
    };

    const getStatusLabel = (status: Invoice["status"]) => {
      const statusMap: Record<string, string> = {
        draft: "DRAFT",
        pending: "PENDING",
        partial: "PARTIALLY PAID",
        paid: "PAID",
        cancelled: "CANCELLED",
      };
      return statusMap[status] || status.toUpperCase();
    };

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hospital.name}</h1>
            {hospital.address && <p className="text-sm text-gray-600">{hospital.address}</p>}
            {hospital.city && hospital.state && (
              <p className="text-sm text-gray-600">
                {hospital.city}, {hospital.state} {hospital.country}
              </p>
            )}
            {hospital.phone && <p className="text-sm text-gray-600">Phone: {hospital.phone}</p>}
            {hospital.email && <p className="text-sm text-gray-600">Email: {hospital.email}</p>}
            {hospital.registration_number && (
              <p className="text-sm text-gray-600">Reg. No: {hospital.registration_number}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-lg font-semibold text-gray-700 mt-1">{invoice.invoice_number}</p>
            <div className="mt-2 inline-block px-3 py-1 rounded text-sm font-semibold"
              style={{
                backgroundColor: invoice.status === "paid" ? "#dcfce7" : 
                  invoice.status === "cancelled" ? "#fee2e2" : "#fef3c7",
                color: invoice.status === "paid" ? "#166534" :
                  invoice.status === "cancelled" ? "#991b1b" : "#92400e"
              }}
            >
              {getStatusLabel(invoice.status)}
            </div>
          </div>
        </div>

        {/* Invoice Details Row */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <p className="font-semibold text-gray-900">
              {invoice.patient_profile?.display_name || "Patient"}
            </p>
            {invoice.patient_profile?.phone && (
              <p className="text-sm text-gray-600">{invoice.patient_profile.phone}</p>
            )}
            <p className="text-sm text-gray-600">Patient ID: {invoice.patient_id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Invoice Date:</span>
                <span className="text-sm font-medium">
                  {format(new Date(invoice.invoice_date), "MMMM d, yyyy")}
                </span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Due Date:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(invoice.due_date), "MMMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
              <th className="text-left py-2 text-sm font-semibold text-gray-700">Category</th>
              <th className="text-center py-2 text-sm font-semibold text-gray-700">Qty</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="py-2 text-sm">{item.description}</td>
                <td className="py-2 text-sm text-gray-600">{getCategoryLabel(item.category)}</td>
                <td className="py-2 text-sm text-center">{item.quantity}</td>
                <td className="py-2 text-sm text-right">৳{item.unit_price.toFixed(2)}</td>
                <td className="py-2 text-sm text-right font-medium">৳{item.total_price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>৳{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span>৳{invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span>-৳{invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t-2 border-gray-800 pt-2">
              <span>Total:</span>
              <span>৳{invoice.total_amount.toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Amount Paid:</span>
                  <span>৳{invoice.amount_paid.toFixed(2)}</span>
                </div>
                {invoice.status !== "paid" && (
                  <div className="flex justify-between font-semibold text-red-700">
                    <span>Balance Due:</span>
                    <span>৳{(invoice.total_amount - invoice.amount_paid).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t pt-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes:</h3>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-500">
          <p>Thank you for choosing {hospital.name}</p>
          <p className="mt-1">This is a computer-generated invoice.</p>
        </div>
      </div>
    );
  }
);

InvoicePrintView.displayName = "InvoicePrintView";

export default InvoicePrintView;
