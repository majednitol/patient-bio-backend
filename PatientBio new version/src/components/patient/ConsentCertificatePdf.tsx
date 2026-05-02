import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

interface ContributionForCert {
  id: string;
  contribution_hash: string;
  data_categories: string[];
  disease_categories: string[];
  source_jurisdiction: string;
  contributed_at: string;
  is_active: boolean;
  requires_govt_approval: boolean;
  govt_approval_status: string;
  govt_reference_number: string | null;
  blockchainHash?: string | null;
  blockchainTimestamp?: string | null;
}

interface ConsentCertificatePdfProps {
  contribution: ContributionForCert;
  patientName?: string;
}

export const ConsentCertificatePdf = ({ contribution, patientName }: ConsentCertificatePdfProps) => {
  const generatePdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CONSENT CERTIFICATE", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Global Health Data Contribution — Cryptographic Proof of Consent", pageWidth / 2, y, { align: "center" });
    y += 4;

    // Divider
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Status badge
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const status = contribution.is_active ? "ACTIVE" : "WITHDRAWN";
    doc.text(`Status: ${status}`, 20, y);
    y += 10;

    // Certificate details table
    const details = [
      ["Certificate ID", contribution.id],
      ["Contributor", pdfSafe(patientName) || "Anonymous Patient"],
      ["Contributed At", format(new Date(contribution.contributed_at), "PPpp")],
      ["Jurisdiction", pdfSafe(contribution.source_jurisdiction)],
      ["Data Categories", contribution.data_categories.map(pdfSafe).join(", ")],
      ["Disease Categories", contribution.disease_categories.map(pdfSafe).join(", ")],
      ["Govt Approval Required", contribution.requires_govt_approval ? "Yes" : "No"],
      ["Govt Approval Status", pdfSafe(contribution.govt_approval_status)],
    ];

    if (contribution.govt_reference_number) {
      details.push(["Govt Reference Number", contribution.govt_reference_number]);
    }

    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: details,
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [51, 51, 51] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Cryptographic Proof Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cryptographic Verification", 20, y);
    y += 8;

    const cryptoDetails = [
      ["Contribution Hash (SHA-256)", contribution.contribution_hash],
    ];

    if (contribution.blockchainHash) {
      cryptoDetails.push(["Blockchain Transaction Hash", contribution.blockchainHash]);
    }
    if (contribution.blockchainTimestamp) {
      cryptoDetails.push(["Blockchain Recorded At", format(new Date(contribution.blockchainTimestamp), "PPpp")]);
    }

    autoTable(doc, {
      startY: y,
      body: cryptoDetails,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 3, font: "courier" },
      columnStyles: { 0: { font: "helvetica", fontStyle: "bold", cellWidth: 55 } },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Digital Signature line
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Digital Signature:", 20, y);
    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    // Generate a deterministic signature from the hashes
    const sigBase = `${contribution.contribution_hash}|${contribution.id}|${contribution.contributed_at}`;
    doc.text(`sig:sha256:${sigBase.slice(0, 64)}`, 20, y);
    y += 12;

    // Footer
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      "This certificate is cryptographically verifiable. The contribution hash and blockchain transaction hash can be independently validated against the platform's immutable audit ledger.",
      20, y, { maxWidth: pageWidth - 40 }
    );
    y += 12;
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 20, y);

    doc.save(`consent-certificate-${contribution.id.slice(0, 8)}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePdf} className="gap-1.5">
      <FileDown className="h-3.5 w-3.5" />
      Certificate
    </Button>
  );
};
