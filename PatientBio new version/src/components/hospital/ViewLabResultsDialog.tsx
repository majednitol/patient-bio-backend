import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ExternalLink,
  CheckCircle,
  Calendar,
  User,
  FlaskConical,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import type { LabOrder } from "@/hooks/useHospitalLabOrders";

interface ViewLabResultsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LabResult {
  id: string;
  order_id: string;
  pathologist_report_id: string;
  health_record_id: string | null;
  created_at: string;
  pathologist_report?: {
    id: string;
    report_name: string;
    file_url: string | null;
    created_at: string;
    disease_category: string | null;
    findings: string | null;
  };
  order?: LabOrder;
}

export function ViewLabResultsDialog({
  orderId,
  open,
  onOpenChange,
}: ViewLabResultsDialogProps) {
  const { data: result, isLoading } = useQuery({
    queryKey: ["lab-result", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("hospital_lab_results")
        .select(`
          *,
          pathologist_report:pathologist_reports(
            id,
            report_name,
            file_url,
            created_at,
            disease_category,
            findings
          ),
          order:hospital_lab_orders(
            *,
            patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id),
            pathologist_profile:pathologist_profiles!hospital_lab_orders_pathologist_id_fkey(full_name, lab_name)
          )
        `)
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as LabResult | null;
    },
    enabled: !!orderId && open,
  });

  const handleViewReport = () => {
    if (result?.pathologist_report?.file_url) {
      window.open(result.pathologist_report.file_url, "_blank");
    }
  };

  const handleDownloadReport = async () => {
    if (result?.pathologist_report?.file_url) {
      try {
        const response = await fetch(result.pathologist_report.file_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.pathologist_report.report_name || "lab-report"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
      }
    }
  };

  if (!orderId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Lab Results
          </DialogTitle>
          <DialogDescription>
            View completed lab test results and pathologist report
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8">
            <PageSkeleton type="cards" />
          </div>
        ) : !result ? (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No results found for this order</p>
            <p className="text-sm">The order may still be in progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Patient Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">
                  {result.order?.patient_profile?.display_name || "Unknown Patient"}
                </p>
                {result.order?.patient_profile?.patient_passport_id && (
                  <p className="text-muted-foreground text-xs">
                    ID: {result.order.patient_profile.patient_passport_id}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tests Completed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Tests Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {(result.order?.tests as { name: string }[])?.map((test, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {test.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Pathologist Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">
                    {result.pathologist_report?.report_name || "Lab Report"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Completed:{" "}
                    {format(
                      new Date(result.pathologist_report?.created_at || result.created_at),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>

                {result.pathologist_report?.findings && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Findings:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {result.pathologist_report.findings}
                    </p>
                  </div>
                )}

                {result.order?.pathologist_profile && (
                  <p className="text-xs text-muted-foreground">
                    Lab: {result.order.pathologist_profile.lab_name || result.order.pathologist_profile.full_name}
                  </p>
                )}

                <Separator />

                <div className="flex gap-2">
                  {result.pathologist_report?.file_url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleViewReport}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadReport}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Health Record Link */}
            {result.health_record_id && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Results added to patient's health records</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
