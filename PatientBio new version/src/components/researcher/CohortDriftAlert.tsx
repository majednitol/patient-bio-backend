import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";
import type { PatientResearcherShare } from "@/hooks/usePatientResearcherShares";

interface CohortDriftAlertProps {
  shares: PatientResearcherShare[];
  userId: string;
}

const STORAGE_KEY = "researcher_cohort_snapshot";

function getSnapshot(userId: string): { timestamp: string; shareIds: string[]; statuses: Record<string, string> } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string, shares: PatientResearcherShare[]) {
  const snapshot = {
    timestamp: new Date().toISOString(),
    shareIds: shares.map((s) => s.id),
    statuses: shares.reduce((acc, s) => ({ ...acc, [s.id]: s.status }), {} as Record<string, string>),
  };
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(snapshot));
}

const CohortDriftAlert = ({ shares, userId }: CohortDriftAlertProps) => {
  const drift = useMemo(() => {
    const snapshot = getSnapshot(userId);
    if (!snapshot) {
      // First visit — save snapshot, no alert
      if (shares.length > 0) saveSnapshot(userId, shares);
      return null;
    }

    const oldIds = new Set(snapshot.shareIds);
    const currentIds = new Set(shares.map((s) => s.id));

    const newShares = shares.filter((s) => !oldIds.has(s.id));
    const removedCount = [...oldIds].filter((id) => !currentIds.has(id)).length;
    const statusChanges = shares.filter((s) => {
      const oldStatus = snapshot.statuses[s.id];
      return oldStatus && oldStatus !== s.status;
    });

    const totalChanges = newShares.length + removedCount + statusChanges.length;
    if (totalChanges === 0) return null;

    return { newShares: newShares.length, removed: removedCount, statusChanges: statusChanges.length, total: totalChanges, since: snapshot.timestamp };
  }, [shares, userId]);

  if (!drift) return null;

  const handleDismiss = () => {
    saveSnapshot(userId, shares);
    // Force re-render by setting a dummy state — the parent will re-render on next cycle
    window.location.reload();
  };

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <AlertTriangle className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span>Cohort Changes Detected</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </AlertTitle>
      <AlertDescription className="flex items-center gap-2 flex-wrap">
        <span>{drift.total} change{drift.total !== 1 ? "s" : ""} since {new Date(drift.since).toLocaleDateString()}</span>
        {drift.newShares > 0 && <Badge variant="default">{drift.newShares} new</Badge>}
        {drift.removed > 0 && <Badge variant="destructive">{drift.removed} expired</Badge>}
        {drift.statusChanges > 0 && <Badge variant="secondary">{drift.statusChanges} updated</Badge>}
      </AlertDescription>
    </Alert>
  );
};

export default CohortDriftAlert;
