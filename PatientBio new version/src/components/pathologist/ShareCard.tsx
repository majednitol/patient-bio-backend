import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  Eye,
  FileText,
  Stethoscope,
  User
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { DoctorPathologistShare } from "@/hooks/useDoctorPathologistShares";

interface ShareCardProps {
  share: DoctorPathologistShare;
  showActions?: boolean;
  categoryColor?: string;
  onMarkViewed?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  onViewPatient?: (share: DoctorPathologistShare) => void;
}

export const ShareCard = ({ 
  share, 
  showActions = true,
  categoryColor,
  onMarkViewed,
  onMarkCompleted,
  onViewPatient
}: ShareCardProps) => (
  <Card className="diagnostic-card">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20">
            <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800 dark:text-gray-100">
              {share.patient_name ? `Patient: ${share.patient_name}` : "Patient Data Request"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Referred by <span className="font-medium text-foreground">{share.doctor_name || "Unknown Doctor"}</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {share.disease_category && (
                <Badge className={`uppercase text-xs ${categoryColor || "bg-gray-100 dark:bg-gray-800"}`}>
                  {share.disease_category.replace("_", " ")}
                </Badge>
              )}
              <Badge
                className={
                  share.status === "pending"
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
                    : share.status === "completed"
                    ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-cyan-100 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300"
                }
              >
                {share.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                {share.status === "viewed" && <Eye className="h-3 w-3 mr-1" />}
                {share.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                {share.status}
              </Badge>
            </div>
            {share.notes && (
              <p className="text-sm text-muted-foreground mt-2">
                <FileText className="h-3 w-3 inline mr-1" />
                {share.notes}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Received {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}
              {share.completed_at && (
                <span className="ml-2">
                  • Completed {format(new Date(share.completed_at), "MMM d, yyyy")}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {onViewPatient && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewPatient(share)}
              className="border-teal-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 dark:border-teal-800 dark:hover:bg-teal-900/30"
            >
              <User className="h-4 w-4 mr-1" />
              View Patient
            </Button>
          )}
          {showActions && share.status !== "completed" && (
            <>
              {share.status === "pending" && onMarkViewed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkViewed(share.id)}
                  className="border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900/30"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Mark Viewed
                </Button>
              )}
              {onMarkCompleted && (
                <Button
                  size="sm"
                  onClick={() => onMarkCompleted(share.id)}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
