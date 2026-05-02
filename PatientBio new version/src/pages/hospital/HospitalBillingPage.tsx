import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useInvoices, useInvoiceMutations, Invoice, INVOICE_STATUSES, INVOICE_ITEM_CATEGORIES } from "@/hooks/useInvoices";
import { usePayments, usePaymentMutations, PAYMENT_METHODS, Payment } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Plus, Receipt, CreditCard, Eye, XCircle, Banknote, Trash2, Printer } from "lucide-react";
import PatientLookupInput from "@/components/hospital/PatientLookupInput";
import QuickPatientRegisterDialog from "@/components/hospital/QuickPatientRegisterDialog";
import { format } from "date-fns";
import InvoicePrintView from "@/components/hospital/InvoicePrintView";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

type InvoiceItemCategory = "consultation" | "bed_charge" | "medication" | "procedure" | "lab_test" | "other";

interface InvoiceItemInput {
  description: string;
  category: InvoiceItemCategory;
  quantity: number;
  unit_price: number;
}

export default function HospitalBillingPage() {
  const { hospital, isAdmin } = useOutletContext<HospitalContext>();
  const { user } = useAuth();
  const { data: invoices, isLoading } = useInvoices(hospital.id);
  const { createInvoice, cancelInvoice } = useInvoiceMutations(hospital.id);
  const { recordPayment } = usePaymentMutations(hospital.id);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [newInvoice, setNewInvoice] = useState<{
    patientId: string;
    items: InvoiceItemInput[];
    taxPercent: number;
    discountAmount: number;
    notes: string;
    dueDate: string;
  }>({
    patientId: "",
    items: [{ description: "", category: "consultation" as const, quantity: 1, unit_price: 0 }],
    taxPercent: 0,
    discountAmount: 0,
    notes: "",
    dueDate: "",
  });

  const [newPayment, setNewPayment] = useState({
    amount: 0,
    paymentMethod: "cash" as Payment["payment_method"],
    transactionRef: "",
    notes: "",
  });

  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: "", category: "other", quantity: 1, unit_price: 0 }],
    });
  };

  const removeInvoiceItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index),
    });
  };

  const updateInvoiceItem = (index: number, updates: Partial<InvoiceItemInput>) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * (newInvoice.taxPercent / 100);
    return subtotal + tax - newInvoice.discountAmount;
  };

  const handleCreateInvoice = async () => {
    if (!user) return;
    await createInvoice.mutateAsync({
      patientId: newInvoice.patientId,
      items: newInvoice.items.filter((item) => item.description && item.unit_price > 0),
      taxPercent: newInvoice.taxPercent,
      discountAmount: newInvoice.discountAmount,
      notes: newInvoice.notes || undefined,
      dueDate: newInvoice.dueDate || undefined,
      createdBy: user.id,
    });
    setCreateDialogOpen(false);
    setNewInvoice({
      patientId: "",
      items: [{ description: "", category: "consultation", quantity: 1, unit_price: 0 }],
      taxPercent: 0,
      discountAmount: 0,
      notes: "",
      dueDate: "",
    });
  };

  const printRef = useRef<HTMLDivElement>(null);

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !user) return;
    await recordPayment.mutateAsync({
      invoiceId: selectedInvoice.id,
      amount: newPayment.amount,
      paymentMethod: newPayment.paymentMethod,
      transactionRef: newPayment.transactionRef || undefined,
      notes: newPayment.notes || undefined,
      receivedBy: user.id,
    });
    setPaymentDialogOpen(false);
    setNewPayment({ amount: 0, paymentMethod: "cash", transactionRef: "", notes: "" });
  };

  const handlePrintInvoice = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
         <head>
          <title>Invoice ${selectedInvoice?.invoice_number || ""}</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
          <style>
            body { margin: 0; padding: 0; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const openViewDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setNewPayment({ ...newPayment, amount: invoice.total_amount - invoice.amount_paid });
    setPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const config = INVOICE_STATUSES.find((s) => s.value === status);
    return (
      <Badge variant="outline" className={`${config?.color} text-white`}>
        {config?.label}
      </Badge>
    );
  };

  const filteredInvoices = statusFilter === "all"
    ? invoices
    : invoices?.filter((i) => i.status === statusFilter);

  // Pagination for invoices
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedInvoices,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: filteredInvoices || [], itemsPerPage: 10 });

  if (isLoading) {
    return <PageSkeleton type="table" />;
  }

  const totalPending = invoices?.filter((i) => i.status === "pending" || i.status === "partial")
    .reduce((sum, i) => sum + (i.total_amount - i.amount_paid), 0) || 0;
  const totalPaid = invoices?.filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground">Generate and manage patient invoices</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <PatientLookupInput
                value={newInvoice.patientId}
                onChange={(patientId) => setNewInvoice({ ...newInvoice, patientId })}
                label="Patient"
                onRegisterNew={() => setRegisterDialogOpen(true)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Invoice Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, { description: e.target.value })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={item.category}
                        onValueChange={(v) => updateInvoiceItem(index, { category: v as InvoiceItemInput["category"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_ITEM_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, { quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInvoiceItem(index)}
                        disabled={newInvoice.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax (%)</Label>
                  <Input
                    type="number"
                    value={newInvoice.taxPercent}
                    onChange={(e) => setNewInvoice({ ...newInvoice, taxPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount (৳)</Label>
                  <Input
                    type="number"
                    value={newInvoice.discountAmount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, discountAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              <div className="border-t pt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>৳{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({newInvoice.taxPercent}%):</span>
                  <span>৳{(calculateSubtotal() * (newInvoice.taxPercent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-৳{newInvoice.discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>৳{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} disabled={!newInvoice.patientId || newInvoice.items.length === 0}>
                Create Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-3xl font-bold">{invoices?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-3xl font-bold text-yellow-600">৳{totalPending.toFixed(0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-3xl font-bold text-green-600">৳{totalPaid.toFixed(0)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="partial">Partial</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.patient_profile?.display_name || "Unknown"}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>৳{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>৳{invoice.amount_paid.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(invoice.status)}
                        {invoice.due_date && (invoice.status === "pending" || invoice.status === "partial") && new Date(invoice.due_date) < new Date() && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openViewDialog(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(invoice.status === "pending" || invoice.status === "partial") && (
                          <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(invoice)}>
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.status === "draft" && isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => cancelInvoice.mutate(invoice.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice {selectedInvoice?.invoice_number}</span>
              <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Print Preview */}
              <div className="hidden">
                <InvoicePrintView ref={printRef} invoice={selectedInvoice} hospital={hospital} />
              </div>
              
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedInvoice.patient_profile?.display_name || "Unknown"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.invoice_date), "MMM d, yyyy")}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">৳{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">৳{item.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>৳{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>৳{selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-৳{selectedInvoice.discount_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span>৳{selectedInvoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>৳{selectedInvoice.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance:</span>
                  <span>৳{(selectedInvoice.total_amount - selectedInvoice.amount_paid).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div>{getStatusBadge(selectedInvoice.status)}</div>
                {(selectedInvoice.status === "pending" || selectedInvoice.status === "partial") && (
                  <Button size="sm" onClick={() => { setViewDialogOpen(false); openPaymentDialog(selectedInvoice); }}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Invoice: {selectedInvoice?.invoice_number} • Balance: ৳{((selectedInvoice?.total_amount || 0) - (selectedInvoice?.amount_paid || 0)).toFixed(2)}
            </p>
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={newPayment.paymentMethod}
                onValueChange={(v) => setNewPayment({ ...newPayment, paymentMethod: v as Payment["payment_method"] })}
              >
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
                value={newPayment.transactionRef}
                onChange={(e) => setNewPayment({ ...newPayment, transactionRef: e.target.value })}
                placeholder="Optional reference number"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={newPayment.amount <= 0}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Patient Registration Dialog */}
      <QuickPatientRegisterDialog
        hospitalId={hospital.id}
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        onSuccess={(patientId) => {
          setNewInvoice({ ...newInvoice, patientId });
        }}
      />
    </div>
  );
}
