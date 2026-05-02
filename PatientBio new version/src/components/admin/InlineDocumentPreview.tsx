import { useState } from "react";

interface InlineDocumentPreviewProps {
  url: string;
  fileName?: string;
}

export function InlineDocumentPreview({ url, fileName }: InlineDocumentPreviewProps) {
  const [error, setError] = useState(false);
  
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);

  if (error) {
    return (
      <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
        <p>Unable to preview this document.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-1 inline-block">
          Open in new tab
        </a>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="border rounded-lg overflow-hidden bg-muted">
        <img
          src={url}
          alt={fileName || "Document preview"}
          className="max-h-64 w-full object-contain"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={url}
          title={fileName || "PDF Document"}
          className="w-full h-64"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // Fallback: link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
      Open document
    </a>
  );
}
