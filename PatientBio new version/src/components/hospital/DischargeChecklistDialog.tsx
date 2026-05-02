import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Admission } from "@/hooks/useAdmissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pill,
  Receipt,
  CalendarCheck,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DischargeChecklistDialogProps {
  admission: Admission | null;
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDischarge: (notes: string) => Promise<void>;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: "ready" | "warning" | "incomplete";
  detail: string;
}

const useDischargeReadiness = (admission: Admission | null, hospitalId: string) => {
  // Check medications reconciled (active meds exist and have been reviewed)
  const medsQuery = useQuery({
    queryKey: ["discharge-meds-check", admission?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_medications")
        .select("id, status, medication_name")
        .eq("admission_id", admission!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!admission?.id,
  });

  // Check invoice status
  const invoiceQuery = useQuery({
    queryKey: ["discharge-invoice-check", admission?.patient_id, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, status, total_amount, amount_paid")
        .eq("hospital_id", hospitalId)
        .eq("patient_id", admission!.patient_id)
        .in("status", ["draft", "pending", "partial"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!admission?.patient_id && !!hospitalId,
  });

  // Check follow-up appointment scheduled
  const followUpQuery = useQuery({
    queryKey: ["discharge-followup-check", admission?.patient_id, hospitalId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, status")
        .eq("hospital_id", hospitalId)
        .eq("patient_id", admission!.patient_id)
        .gte("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!admission?.patient_id && !!hospitalId,
  });

  // Check prescriptions exist (visit summary / discharge prescription)
  const prescriptionQuery = useQuery({
    queryKey: ["discharge-prescription-check", admission?.patient_id, hospitalId, admission?.admission_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, created_at, diagnosis")
        .eq("hospital_id", hospitalId)
        .eq("patient_id", admission!.patient_id)
        .gte("created_at", admission!.admission_date)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!admission?.patient_id && !!hospitalId && !!admission?.admission_date,
  });

  const isLoading =
    medsQuery.isLoading || invoiceQuery.isLoading || followUpQuery.isLoading || prescriptionQuery.isLoading;

  return { medsQuery, invoiceQuery, followUpQuery, prescriptionQuery, isLoading };
};

const StatusIcon = ({ status }: { status: ChecklistItem["status"] }) => {
  if (status === "ready")
    return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
  if (status === "warning")
    return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
  return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
};

const DischargeChecklistDialog = ({
  admission,
  hospitalId,
  open,
  onOpenChange,
  onConfirmDischarge,
}: DischargeChecklistDialogProps) => {
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [isDischarging, setIsDischarging] = useState(false);

  const { medsQuery, invoiceQuery, followUpQuery, prescriptionQuery, isLoading } =
    useDischargeReadiness(admission, hospitalId);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const meds = medsQuery.data || [];
    const unpaidInvoices = invoiceQuery.data || [];
    const followUps = followUpQuery.data || [];
    const prescriptions = prescriptionQuery.data || [];

    // 1. Medications reconciled
    const activeMeds = meds.filter((m) => m.status === "active");
    const medsItem: ChecklistItem = {
      id: "meds",
      label: "Medications Reconciled",
      description: "All medications reviewed before discharge",
      icon: Pill,
      status: meds.length === 0 ? "warning" : activeMeds.length > 0 ? "warning" : "ready",
      detail:
        meds.length === 0
          ? "No medications recorded for this admission"
          : activeMeds.length > 0
          ? `${activeMeds.length} medication(s) still active — review before discharge`
          : `All ${meds.length} medication(s) reconciled`,
    };

    // 2. Invoice settled
    const totalOutstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + ((inv.total_amount || 0) - (inv.amount_paid || 0)),
      0
    );
    const invoiceItem: ChecklistItem = {
      id: "invoice",
      label: "Invoice Settled",
      description: "Outstanding bills cleared or waived",
      icon: Receipt,
      status: unpaidInvoices.length === 0 ? "ready" : "incomplete",
      detail:
        unpaidInvoices.length === 0
          ? "No outstanding invoices"
          : `${unpaidInvoices.length} unpaid invoice(s) — ৳${totalOutstanding.toLocaleString()} outstanding`,
    };

    // 3. Follow-up scheduled
    const followUpItem: ChecklistItem = {
      id: "followup",
      label: "Follow-Up Scheduled",
      description: "Post-discharge appointment booked",
      icon: CalendarCheck,
      status: followUps.length > 0 ? "ready" : "warning",
      detail:
        followUps.length > 0
          ? `Follow-up on ${followUps[0].appointment_date}`
          : "No follow-up appointment scheduled",
    };

    // 4. Visit summary / prescription shared
    const summaryItem: ChecklistItem = {
      id: "summary",
      label: "Visit Summary / Prescription",
      description: "Discharge prescription or summary created",
      icon: FileText,
      status: prescriptions.length > 0 ? "ready" : "warning",
      detail:
        prescriptions.length > 0
          ? "Discharge prescription available"
          : "No discharge prescription created during this admission",
    };

    return [medsItem, invoiceItem, followUpItem, summaryItem];
  }, [medsQuery.data, invoiceQuery.data, followUpQuery.data, prescriptionQuery.data]);

  const readyCount = checklist.filter((c) => c.status === "ready").length;
  const hasBlockers = checklist.some((c) => c.status === "incomplete");
  const allReady = readyCount === checklist.length;

  const handleDischarge = async () => {
    setIsDischarging(true);
    try {
      await onConfirmDischarge(dischargeNotes);
      setDischargeNotes("");
    } finally {
      setIsDischarging(false);
    }
  };

  if (!admission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Discharge Readiness Checklist
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Discharging:{" "}
            <span className="font-medium text-foreground">
              {admission.patient_profile?.display_name || "Unknown Patient"}
            </span>
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Checking readiness…</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              <Badge
                variant={allReady ? "default" : hasBlockers ? "destructive" : "secondary"}
                className="text-xs"
              >
                {readyCount}/{checklist.length} Complete
              </Badge>
              {allReady && (
                <span className="text-xs text-green-600 font-medium">✓ Ready for discharge</span>
              )}
              {hasBlockers && (
                <span className="text-xs text-destructive font-medium">
                  Action required before discharge
                </span>
              )}
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    item.status === "ready" && "bg-green-500/5 border-green-500/20",
                    item.status === "warning" && "bg-amber-500/5 border-amber-500/20",
                    item.status === "incomplete" && "bg-destructive/5 border-destructive/20"
                  )}
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Discharge notes */}
            <div className="space-y-2 pt-2">
              <Label>Discharge Notes</Label>
              <Textarea
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Enter discharge summary, instructions, follow-up notes..."
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDischarge}
            disabled={isLoading || isDischarging}
            variant={hasBlockers ? "destructive" : "default"}
          >
            {isDischarging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasBlockers ? "Discharge Anyway" : "Confirm Discharge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DischargeChecklistDialog;
