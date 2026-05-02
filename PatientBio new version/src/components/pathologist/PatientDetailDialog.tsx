import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Clock, CheckCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PatientReport {
  id: string;
  report_name: string;
  report_type?: string;
  disease_category?: string;
  is_shared_with_patient?: boolean;
  created_at: string;
}

interface PatientShare {
  id: string;
  disease_category?: string;
  status?: string;
  shared_at: string;
  notes?: string;
}

interface PatientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string | null;
  reports: PatientReport[];
  shares: PatientShare[];
  diseaseCategories: string[];
  status: "active" | "completed";
}

export function PatientDetailDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  reports,
  shares,
  diseaseCategories,
  status,
}: PatientDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {patientName || "Unknown Patient"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs">{patientId.slice(0, 8)}...</span>
            <Badge
              className={
                status === "active"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
              }
            >
              {status === "active" ? (
                <><Clock className="h-3 w-3 mr-1" />Active</>
              ) : (
                <><CheckCircle className="h-3 w-3 mr-1" />Completed</>
              )}
            </Badge>
            {diseaseCategories.map((cat) => (
              <Badge key={cat} variant="outline" className="text-xs uppercase">
                {cat.replace("_", " ")}
              </Badge>
            ))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Reports */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
                Reports ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports for this patient</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded-lg border text-sm"
                    >
                      <div>
                        <p className="font-medium">{r.report_name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {r.report_type && (
                            <Badge variant="secondary" className="text-xs">{r.report_type}</Badge>
                          )}
                          {r.disease_category && (
                            <Badge variant="outline" className="text-xs">{r.disease_category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {r.is_shared_with_patient && (
                          <Eye className="h-3 w-3 text-green-500" />
                        )}
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referrals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Referrals ({shares.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">No referrals for this patient</p>
              ) : (
                <div className="space-y-2">
                  {shares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-lg border text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {s.disease_category || "General"} referral
                        </p>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {s.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={s.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {s.status || "pending"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(s.shared_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
