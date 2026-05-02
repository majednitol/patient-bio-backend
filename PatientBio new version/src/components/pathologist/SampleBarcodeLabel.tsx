import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Barcode } from "lucide-react";
import { format } from "date-fns";

interface SampleBarcodeLabelProps {
  barcode: string;
  patientName: string;
  patientId?: string;
  tests: { name: string }[];
  orderedAt: string;
  hospitalName?: string;
}

export function SampleBarcodeLabel({
  barcode,
  patientName,
  patientId,
  tests,
  orderedAt,
  hospitalName,
}: SampleBarcodeLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = labelRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
         <head>
          <title>Sample Label - ${barcode}</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
          <style>
            @page {
              size: 50mm 25mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              font-family: Arial, sans-serif;
              font-size: 8pt;
            }
            .label {
              width: 46mm;
              height: 21mm;
              border: 1px solid #000;
              padding: 1mm;
              box-sizing: border-box;
            }
            .barcode-text {
              font-family: 'Libre Barcode 128', monospace;
              font-size: 24pt;
              text-align: center;
              letter-spacing: 2px;
            }
            .barcode-id {
              font-size: 9pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 1mm;
            }
            .patient-info {
              font-size: 7pt;
              margin-bottom: 1mm;
            }
            .tests {
              font-size: 6pt;
              color: #333;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="label">
            <div class="barcode-text">${barcode}</div>
            <div class="barcode-id">${barcode}</div>
            <div class="patient-info">
              <strong>${patientName}</strong>
              ${patientId ? ` (${patientId})` : ""}
            </div>
            <div class="tests">
              ${tests.map(t => t.name).join(", ")}
            </div>
          </div>
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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div
          ref={labelRef}
          className="border-2 border-dashed border-muted rounded-lg p-4 bg-white dark:bg-gray-950"
        >
          {/* Barcode visual representation */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-1 text-2xl tracking-widest font-mono select-all">
              <Barcode className="h-6 w-6 text-muted-foreground" />
              <span className="font-bold">{barcode}</span>
            </div>
            
            {/* Barcode lines simulation */}
            <div className="flex items-end justify-center gap-[1px] h-12">
              {barcode.split("").map((char, i) => {
                const height = (char.charCodeAt(0) % 20) + 30;
                const width = i % 3 === 0 ? 2 : 1;
                return (
                  <div
                    key={i}
                    className="bg-black"
                    style={{ width: `${width}px`, height: `${height}px` }}
                  />
                );
              })}
            </div>
            
            <p className="text-xs font-mono text-center tracking-widest">
              {barcode}
            </p>
          </div>

          {/* Patient info */}
          <div className="mt-3 pt-3 border-t border-dashed space-y-1">
            <p className="text-sm font-medium">{patientName}</p>
            {patientId && (
              <p className="text-xs text-muted-foreground">ID: {patientId}</p>
            )}
            {hospitalName && (
              <p className="text-xs text-muted-foreground">From: {hospitalName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ordered: {format(new Date(orderedAt), "MMM d, yyyy h:mm a")}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {tests.slice(0, 3).map((test, idx) => (
                <span
                  key={idx}
                  className="text-xs px-1.5 py-0.5 bg-muted rounded"
                >
                  {test.name}
                </span>
              ))}
              {tests.length > 3 && (
                <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                  +{tests.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Label
        </Button>
      </CardContent>
    </Card>
  );
}
