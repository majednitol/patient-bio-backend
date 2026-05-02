import { useState, useRef, useCallback, useEffect } from "react";
import { PathologistReport } from "@/hooks/usePathologistReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, X, File, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const reportTypes = [
  { value: "blood_work", label: "Blood Work" },
  { value: "imaging", label: "Imaging" },
  { value: "pathology", label: "Pathology" },
  { value: "microbiology", label: "Microbiology" },
  { value: "cardiology", label: "Cardiology" },
  { value: "other", label: "Other" },
];

const diseaseCategories = [
  { value: "general", label: "General" },
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "other", label: "Other" },
];

interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: PathologistReport;
  onUpdate: (
    reportId: string,
    data: {
      report_name?: string;
      report_type?: string;
      disease_category?: string;
      findings?: string;
      file_url?: string;
    }
  ) => void;
  uploadFile: (file: File) => Promise<string>;
  isUpdating: boolean;
}

export const EditReportDialog = ({
  open,
  onOpenChange,
  report,
  onUpdate,
  uploadFile,
  isUpdating,
}: EditReportDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    report_name: report.report_name,
    report_type: report.report_type || "",
    disease_category: report.disease_category || "",
    findings: report.findings || "",
  });

  // Reset form when report changes
  useEffect(() => {
    setFormData({
      report_name: report.report_name,
      report_type: report.report_type || "",
      disease_category: report.disease_category || "",
      findings: report.findings || "",
    });
    setSelectedFile(null);
  }, [report]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let fileUrl: string | undefined;

      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      onUpdate(report.id, {
        report_name: formData.report_name,
        report_type: formData.report_type || undefined,
        disease_category: formData.disease_category || undefined,
        findings: formData.findings || undefined,
        ...(fileUrl && { file_url: fileUrl }),
      });
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Report</DialogTitle>
          <DialogDescription>
            Update the diagnostic report details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report_name">Report Name *</Label>
            <Input
              id="report_name"
              value={formData.report_name}
              onChange={(e) =>
                setFormData({ ...formData, report_name: e.target.value })
              }
              placeholder="Complete Blood Count"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) =>
                setFormData({ ...formData, report_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Disease Category</Label>
            <Select
              value={formData.disease_category}
              onValueChange={(value) =>
                setFormData({ ...formData, disease_category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {diseaseCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>
              {report.file_url ? "Replace Report File" : "Attach Report File"}
            </Label>
            {report.file_url && !selectedFile && (
              <p className="text-xs text-muted-foreground mb-2">
                Current file attached. Upload a new file to replace it.
              </p>
            )}
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {getFileIcon(selectedFile)}
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPEG, PNG, DOC (max 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="findings">Findings</Label>
            <Textarea
              id="findings"
              value={formData.findings}
              onChange={(e) =>
                setFormData({ ...formData, findings: e.target.value })
              }
              placeholder="Enter diagnostic findings..."
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isUpdating || isUploading || !formData.report_name}
            >
              {isUpdating || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
