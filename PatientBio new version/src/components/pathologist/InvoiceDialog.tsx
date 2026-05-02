import { useState, useEffect, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, Trash2, Search, Loader2, User } from "lucide-react";
import { useTestCatalog } from "@/hooks/useTestCatalog";
import {
  usePathologistInvoiceMutations,
  InvoiceItem,
  CreateInvoiceData,
} from "@/hooks/usePathologistInvoices";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { usePatientSearch } from "@/hooks/usePatientSearch";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceDialog = ({ open, onOpenChange }: InvoiceDialogProps) => {
  const { tests } = useTestCatalog();
  const { reports } = usePathologistReports();
  const { createInvoice } = usePathologistInvoiceMutations();

  const [patientId, setPatientId] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);

  const [reportId, setReportId] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0, total_price: 0 },
  ]);

  const { results: searchResults, isSearching } = usePatientSearch(patientSearchQuery);
  const activeTests = tests?.filter((t) => t.is_active) || [];
  const patientReports = reports || [];

  useEffect(() => {
    if (!open) {
      setPatientId("");
      setPatientLabel("");
      setPatientSearchQuery("");
      setPatientPopoverOpen(false);
      setReportId("");
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setTaxPercent(0);
      setDiscountAmount(0);
      setNotes("");
      setItems([{ description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
    }
  }, [open]);

  const handlePatientSelect = (id: string, name: string, passportId: string | null) => {
    setPatientId(id);
    setPatientLabel(passportId ? `${name} (${passportId})` : name);
    setPatientPopoverOpen(false);
    setPatientSearchQuery("");
    setReportId("");
  };

  const handleTestSelect = (index: number, testId: string) => {
    const test = activeTests.find((t) => t.id === testId);
    if (test) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        test_id: testId,
        description: test.name,
        unit_price: test.price,
        total_price: test.price * newItems[index].quantity,
      };
      setItems(newItems);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unit_price") {
      const qty = field === "quantity" ? Number(value) : newItems[index].quantity;
      const price = field === "unit_price" ? Number(value) : newItems[index].unit_price;
      newItems[index].total_price = qty * price;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) return;

    const validItems = items.filter((item) => item.description && item.total_price > 0);
    if (validItems.length === 0) return;

    const invoiceData: CreateInvoiceData = {
      patient_id: patientId,
      report_id: reportId || null,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      notes: notes || null,
      items: validItems,
    };

    await createInvoice.mutateAsync(invoiceData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientPopoverOpen}
                    className="w-full justify-start text-left font-normal h-10"
                  >
                    {patientLabel ? (
                      <span className="flex items-center gap-2 truncate">
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {patientLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search by name or Passport ID...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 z-50" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type name or PB-XXXXXX..."
                      value={patientSearchQuery}
                      onValueChange={setPatientSearchQuery}
                    />
                    <CommandList>
                      {isSearching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No patients found.</CommandEmpty>
                          <CommandGroup heading="Results">
                            {searchResults.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.id}
                                onSelect={() =>
                                  handlePatientSelect(
                                    patient.id,
                                    patient.display_name,
                                    patient.patient_passport_id
                                  )
                                }
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{patient.display_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {patient.patient_passport_id || "No Passport ID"}
                                    {patient.phone ? ` · ${patient.phone}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Link to Report (optional)</Label>
              <Select value={reportId} onValueChange={setReportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
              <SelectContent>
                  {!patientId ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Select a patient first
                    </div>
                  ) : (
                    patientReports
                      .filter((r) => r.patient_id === patientId)
                      .length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No reports for this patient
                        </div>
                      ) : (
                        patientReports
                          .filter((r) => r.patient_id === patientId)
                          .map((report) => (
                            <SelectItem key={report.id} value={report.id}>
                              {report.report_name}
                            </SelectItem>
                          ))
                      )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Test/Service</Label>
                    <Select
                      value={item.test_id || ""}
                      onValueChange={(v) => handleTestSelect(index, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.name} - ৳{test.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <div className="h-10 flex items-center font-medium">
                      ৳{item.total_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount (৳)</Label>
              <Input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxPercent}%):</span>
              <span>৳{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-৳{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>৳{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
