/**
 * LazyPDFExport - Dynamic jsPDF loader
 * Saves ~200KB from initial bundle by loading jsPDF on-demand
 * Part of Performance Optimization (Phase 2.1)
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { pdfSafe } from '@/utils/pdfSafe';

interface PDFExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  content: PDFContentItem[];
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter';
}

type PDFContentItem =
  | { type: 'heading'; text: string; level?: 1 | 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'divider' }
  | { type: 'spacer'; height?: number }
  | { type: 'keyValue'; data: Record<string, string> };

interface LazyPDFButtonProps {
  options: PDFExportOptions;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Generate PDF from content items
 */
async function generatePDF(options: PDFExportOptions): Promise<void> {
  // Dynamically import jsPDF and autoTable
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: options.pageSize || 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Add title if provided
  if (options.title) {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfSafe(options.title), margin, yPosition);
    yPosition += 10;
  }

  // Add subtitle if provided
  if (options.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(pdfSafe(options.subtitle), margin, yPosition);
    doc.setTextColor(0);
    yPosition += 8;
  }

  // Add content items
  for (const item of options.content) {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPosition = margin;
    }

    switch (item.type) {
      case 'heading': {
        const sizes = { 1: 16, 2: 14, 3: 12 };
        doc.setFontSize(sizes[item.level || 2]);
        doc.setFont('helvetica', 'bold');
        doc.text(pdfSafe(item.text), margin, yPosition);
        yPosition += item.level === 1 ? 10 : 8;
        break;
      }

      case 'paragraph': {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(pdfSafe(item.text), pageWidth - 2 * margin);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * 5 + 4;
        break;
      }

      case 'table': {
        autoTable(doc, {
          head: [item.headers],
          body: item.rows,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [124, 58, 237] }, // Primary purple
        });
        yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
        break;
      }

      case 'list': {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        item.items.forEach((listItem, index) => {
          const bullet = item.ordered ? `${index + 1}.` : '\u2022';
          doc.text(`${bullet} ${pdfSafe(listItem)}`, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 4;
        break;
      }

      case 'divider': {
        doc.setDrawColor(200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 6;
        break;
      }

      case 'spacer': {
        yPosition += item.height || 10;
        break;
      }

      case 'keyValue': {
        doc.setFontSize(10);
        Object.entries(item.data).forEach(([key, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`${pdfSafe(key)}:`, margin, yPosition);
          doc.setFont('helvetica', 'normal');
          doc.text(pdfSafe(value), margin + 40, yPosition);
          yPosition += 6;
        });
        yPosition += 4;
        break;
      }
    }
  }

  // Add footer with timestamp
  const timestamp = new Date().toLocaleString();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Generated on ${timestamp}`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  // Save the PDF
  doc.save(`${options.filename}.pdf`);
}

/**
 * LazyPDFButton - Button that generates and downloads PDF on click
 */
export const LazyPDFButton: React.FC<LazyPDFButtonProps> = ({
  options,
  children,
  variant = 'default',
  size = 'default',
  className = '',
  onSuccess,
  onError,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = useCallback(async () => {
    setIsGenerating(true);
    try {
      await generatePDF(options);
      onSuccess?.();
    } catch (error) {
      console.error('PDF generation failed:', error);
      onError?.(error as Error);
    } finally {
      setIsGenerating(false);
    }
  }, [options, onSuccess, onError]);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          {children || (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </>
          )}
        </>
      )}
    </Button>
  );
};

/**
 * useLazyPDF - Hook for programmatic PDF generation
 */
export function useLazyPDF() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (options: PDFExportOptions) => {
    setIsGenerating(true);
    setError(null);
    try {
      await generatePDF(options);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating, error };
}

export type { PDFExportOptions, PDFContentItem };
