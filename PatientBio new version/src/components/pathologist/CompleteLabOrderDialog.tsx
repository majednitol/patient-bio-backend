import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/async-button";
import {
  FlaskConical,
  Building2,
  FileText,
  Upload,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLabOrdersForPathologist, type IncomingLabOrder } from "@/hooks/useLabOrdersForPathologist";
import { toast } from "@/hooks/use-toast";

interface CompleteLabOrderDialogProps {
  order: IncomingLabOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteLabOrderDialog({
  order,
  open,
  onOpenChange,
}: CompleteLabOrderDialogProps) {
  const { user } = useAuth();
  const { completeOrder } = useLabOrdersForPathologist();
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reportName, setReportName] = useState("");

  // Fetch available reports for this pathologist
  const { data: availableReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["pathologist-reports-for-linking", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("pathologist_reports")
        .select("id, report_name, created_at, file_url")
        .eq("pathologist_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (!reportName) {
        setReportName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const uploadReportFile = async (): Promise<string | null> => {
    if (!uploadedFile || !user?.id) return null;

    const fileExt = uploadedFile.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("medical-documents")
      .upload(fileName, uploadedFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("medical-documents")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleComplete = async () => {
    if (!order || !user?.id) return;

    try {
      let reportId = selectedReportId;

      // If creating a new report
      if (activeTab === "new") {
        if (!uploadedFile) {
          toast.error("Please upload a report file");
          return;
        }

        setIsUploading(true);
        const fileUrl = await uploadReportFile();

        if (!fileUrl) {
          toast.error("Failed to upload file");
          return;
        }

        // Create the pathologist report
        const testNames = (order.tests as { name: string }[])
          .map((t) => t.name)
          .join(", ");

        const { data: newReport, error: reportError } = await supabase
          .from("pathologist_reports")
          .insert({
            pathologist_id: user.id,
            patient_id: order.patient_id,
            report_name: reportName || testNames,
            file_url: fileUrl,
            disease_category: "general",
            hospital_lab_order_id: order.id,
          })
          .select()
          .single();

        if (reportError) throw reportError;
        reportId = newReport.id;
      }

      if (!reportId) {
        toast.error("Please select or create a report");
        return;
      }

      // Complete the order
      await completeOrder.mutateAsync({
        orderId: order.id,
        reportId,
        patientId: order.patient_id,
      });

      // Reset and close
      setSelectedReportId("");
      setUploadedFile(null);
      setReportName("");
      setActiveTab("existing");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to complete order:", error);
      toast.error("Failed to complete order");
    } finally {
      setIsUploading(false);
    }
  };

  if (!order) return null;

  const tests = order.tests as { name: string; price: number }[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Lab Order
          </DialogTitle>
          <DialogDescription>
            Attach a report to complete this order. Results will be sent to the
            hospital and patient.
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {order.hospital?.name || "Unknown Hospital"}
              </span>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Patient: </span>
              <span className="font-medium">
                {order.patient_profile?.display_name || "Unknown"}
              </span>
              {order.patient_profile?.patient_passport_id && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({order.patient_profile.patient_passport_id})
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {tests.map((test, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {test.name}
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Ordered: {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
            </p>
          </CardContent>
        </Card>

        {/* Report Selection Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "existing" | "new")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Select Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-1">
              <Upload className="h-4 w-4" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            {isLoadingReports ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableReports && availableReports.length > 0 ? (
              <div className="space-y-2">
                <Label>Select a report</Label>
                <Select
                  value={selectedReportId}
                  onValueChange={setSelectedReportId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a report..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        <div className="flex flex-col">
                          <span>{report.report_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No existing reports available</p>
                <p className="text-xs">Upload a new report instead</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="e.g., CBC Report - John Doe"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-file">Report File (PDF)</Label>
              <Input
                id="report-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              {uploadedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton
            onClick={handleComplete}
            isLoading={completeOrder.isPending || isUploading}
            disabled={
              (activeTab === "existing" && !selectedReportId) ||
              (activeTab === "new" && !uploadedFile)
            }
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Order
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
