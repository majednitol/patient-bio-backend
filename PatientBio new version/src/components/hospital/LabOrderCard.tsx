import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FlaskConical, 
  Clock, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  FileText,
  UserRound
} from "lucide-react";
import { format } from "date-fns";
import type { LabOrder } from "@/hooks/useHospitalLabOrders";
import { formatDoctorName } from "@/utils/formatDoctorName";

interface LabOrderCardProps {
  order: LabOrder;
  onCollectSample?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  onViewResults?: (orderId: string) => void;
  isUpdating?: boolean;
  showPatientInfo?: boolean;
}

const statusConfig: Record<LabOrder["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending_consent: { label: "Awaiting Consent", variant: "secondary", icon: Clock },
  ordered: { label: "Ordered", variant: "default", icon: FlaskConical },
  sample_collected: { label: "Sample Collected", variant: "outline", icon: TestTube },
  processing: { label: "Processing", variant: "outline", icon: Loader2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

const urgencyConfig: Record<LabOrder["urgency"], { label: string; className: string }> = {
  routine: { label: "Routine", className: "bg-gray-100 text-gray-700" },
  urgent: { label: "Urgent", className: "bg-orange-100 text-orange-700" },
  stat: { label: "STAT", className: "bg-red-100 text-red-700 font-bold" },
};

export default function LabOrderCard({
  order,
  onCollectSample,
  onCancel,
  onViewResults,
  isUpdating,
  showPatientInfo = true,
}: LabOrderCardProps) {
  const statusInfo = statusConfig[order.status];
  const urgencyInfo = urgencyConfig[order.urgency];
  const StatusIcon = statusInfo.icon;

  const totalPrice = (order.tests as { name: string; price: number }[]).reduce(
    (sum, test) => sum + (test.price || 0),
    0
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Header with status */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyInfo.className}`}>
                {urgencyInfo.label}
              </span>
              {!order.is_internal_lab && (
                <Badge variant="outline" className="text-xs">External Lab</Badge>
              )}
            </div>

            {/* Patient info */}
            {showPatientInfo && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {order.patient_profile?.display_name || "Unknown Patient"}
                </span>
                {order.patient_profile?.patient_passport_id && (
                  <span className="text-muted-foreground text-xs">
                    ({order.patient_profile.patient_passport_id})
                  </span>
                )}
              </div>
            )}

            {/* Lab info */}
            <p className="text-sm text-muted-foreground">
              Lab: {order.pathologist_profile?.lab_name || order.pathologist_profile?.full_name || "Unknown"}
            </p>

            {/* Ordering doctor */}
            {order.ordered_by_profile?.display_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                Ordered by: {formatDoctorName(order.ordered_by_profile.display_name)}
              </p>
            )}

            {/* Ward/Bed info if from admission */}
            {order.admission?.bed && (
              <p className="text-xs text-muted-foreground">
                📍 {order.admission.bed.ward?.name} - Bed {order.admission.bed.bed_number}
              </p>
            )}

            {/* Tests ordered */}
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Tests ordered:</p>
              <div className="flex flex-wrap gap-1">
                {(order.tests as { name: string; price: number }[]).map((test, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {test.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Clinical notes */}
            {order.clinical_notes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Notes: {order.clinical_notes}
              </p>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span>Ordered: {format(new Date(order.created_at), "MMM d, h:mm a")}</span>
              {order.sample_collected_at && (
                <span>Sample: {format(new Date(order.sample_collected_at), "MMM d, h:mm a")}</span>
              )}
              {order.completed_at && (
                <span>Completed: {format(new Date(order.completed_at), "MMM d, h:mm a")}</span>
              )}
            </div>

            {/* Total price */}
            <p className="text-sm font-medium mt-1">
              Total: ৳{totalPrice.toLocaleString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-row sm:flex-col gap-2">
            {order.status === "ordered" && onCollectSample && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCollectSample(order.id)}
                disabled={isUpdating}
              >
                <TestTube className="h-4 w-4 mr-1" />
                Collect Sample
              </Button>
            )}
            
            {order.status === "completed" && onViewResults && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewResults(order.id)}
              >
                <FileText className="h-4 w-4 mr-1" />
                View Results
              </Button>
            )}

            {(order.status === "pending_consent" || order.status === "ordered") && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onCancel(order.id)}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}

            {order.status === "pending_consent" && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" />
                Patient approval required
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
