import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Barcode } from "lucide-react";
import { format } from "date-fns";

interface OrderForPrint {
  id: string;
  sample_barcode?: string | null;
  created_at: string;
  patient_profile?: { display_name: string; patient_passport_id?: string | null } | null;
  hospital?: { name: string } | null;
  tests: { name: string }[] | unknown;
}

interface BulkBarcodePrintDialogProps {
  orders: OrderForPrint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkBarcodePrintDialog({ orders, open, onOpenChange }: BulkBarcodePrintDialogProps) {
  const printableOrders = orders.filter(o => !!o.sample_barcode);

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const labelsHtml = printableOrders.map(order => {
      const tests = (order.tests as { name: string }[]) || [];
      return `
        <div class="label">
          <div class="barcode-text">${order.sample_barcode}</div>
          <div class="barcode-id">${order.sample_barcode}</div>
          <div class="patient-info">
            <strong>${order.patient_profile?.display_name || "Unknown"}</strong>
            ${order.patient_profile?.patient_passport_id ? ` (${order.patient_profile.patient_passport_id})` : ""}
          </div>
          <div class="tests">${tests.map(t => t.name).join(", ")}</div>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk Labels</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
          <style>
            @page { size: A4; margin: 5mm; }
            body { margin: 0; padding: 5mm; font-family: Arial, sans-serif; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
            .label {
              border: 1px solid #000;
              padding: 2mm;
              box-sizing: border-box;
              page-break-inside: avoid;
              height: 25mm;
            }
            .barcode-text {
              font-family: 'Libre Barcode 128', monospace;
              font-size: 20pt;
              text-align: center;
              letter-spacing: 2px;
            }
            .barcode-id { font-size: 9pt; font-weight: bold; text-align: center; margin-bottom: 1mm; }
            .patient-info { font-size: 7pt; margin-bottom: 1mm; }
            .tests { font-size: 6pt; color: #333; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="grid">${labelsHtml}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcode Labels
          </DialogTitle>
          <DialogDescription>
            {printableOrders.length} of {orders.length} selected samples have barcodes
          </DialogDescription>
        </DialogHeader>

        {printableOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            None of the selected samples have barcodes assigned yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {printableOrders.map(order => {
                const tests = (order.tests as { name: string }[]) || [];
                return (
                  <div
                    key={order.id}
                    className="border-2 border-dashed border-muted rounded p-3 bg-white dark:bg-gray-950"
                  >
                    <div className="flex items-center justify-center gap-1 text-sm font-mono font-bold">
                      <Barcode className="h-3 w-3 text-muted-foreground" />
                      {order.sample_barcode}
                    </div>
                    <div className="flex items-end justify-center gap-[1px] h-8 my-1">
                      {(order.sample_barcode || "").split("").map((char, i) => {
                        const height = (char.charCodeAt(0) % 15) + 20;
                        return (
                          <div
                            key={i}
                            className="bg-black"
                            style={{ width: `${i % 3 === 0 ? 2 : 1}px`, height: `${height}px` }}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs font-medium truncate">{order.patient_profile?.display_name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {tests.slice(0, 2).map(t => t.name).join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>

            <Button onClick={handlePrintAll} className="w-full mt-4">
              <Printer className="h-4 w-4 mr-2" />
              Print All ({printableOrders.length} Labels)
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
