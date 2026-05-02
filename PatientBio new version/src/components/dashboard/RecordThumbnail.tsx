import { useState, useEffect } from "react";
import { FileText, Image as ImageIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordThumbnailProps {
  fileType: string | null;
  fileUrl: string | null;
  title: string;
  className?: string;
  onGetUrl?: () => Promise<string | null>;
}

export const RecordThumbnail = ({
  fileType,
  fileUrl,
  title,
  className,
  onGetUrl,
}: RecordThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";

  useEffect(() => {
    if (isImage && onGetUrl && !thumbnailUrl && !hasError) {
      setIsLoading(true);
      onGetUrl()
        .then((url) => {
          if (url) setThumbnailUrl(url);
          else setHasError(true);
        })
        .catch(() => setHasError(true))
        .finally(() => setIsLoading(false));
    }
  }, [isImage, onGetUrl, thumbnailUrl, hasError]);

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-8 w-8 text-red-500" />;
    if (isImage) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    }
    return <FileText className="h-8 w-8 text-muted-foreground" />;
  };

  const getFileTypeLabel = () => {
    if (isPdf) return "PDF";
    if (isImage) return fileType?.split("/")[1]?.toUpperCase() || "IMG";
    if (fileType?.includes("word")) return "DOC";
    if (fileType?.includes("spreadsheet") || fileType?.includes("excel")) return "XLS";
    return "FILE";
  };

  return (
    <div
      className={cn(
        "relative w-full h-full bg-muted/30 flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : isImage && thumbnailUrl && !hasError ? (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {getFileIcon()}
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {getFileTypeLabel()}
          </span>
        </div>
      )}
    </div>
  );
};
