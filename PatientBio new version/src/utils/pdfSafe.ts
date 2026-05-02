/**
 * Sanitize text for jsPDF – strip non-Latin characters (Bengali, emoji, etc.)
 * jsPDF's default font only supports basic Latin / Western European glyphs.
 *
 * Import this in every PDF generation file and wrap ALL dynamic text through it.
 */
export function pdfSafe(text: string | undefined | null): string {
  if (!text) return "";
  // Keep ASCII printable + common Latin-1 Supplement (accented letters)
  return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "").trim();
}

/**
 * Sanitize an array of strings for PDF rendering.
 */
export function pdfSafeArray(items: string[]): string[] {
  return items.map(pdfSafe).filter(Boolean);
}
