import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pill, RefreshCw, Loader2, CheckCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import {
  useRenewablePrescriptions,
  useBulkRenewPrescriptions,
  RenewablePatient,
} from "@/hooks/useBulkPrescriptionRenewal";

export const BulkRenewalCard = React.memo(function BulkRenewalCard() {
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: renewables = [], isLoading } = useRenewablePrescriptions(selectedHospitalId);
  const bulkRenew = useBulkRenewPrescriptions();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return renewables;
    const q = search.toLowerCase();
    return renewables.filter(
      (p) =>
        p.patient_name?.toLowerCase().includes(q) ||
        p.diagnosis?.toLowerCase().includes(q) ||
        p.medications.some((m) => m.name.toLowerCase().includes(q))
    );
  }, [renewables, search]);

  const toggleSelect = (patientId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.patient_id)));
    }
  };

  const selectedPatients = renewables.filter((p) => selected.has(p.patient_id));

  const handleRenew = () => {
    bulkRenew.mutate(selectedPatients, {
      onSuccess: () => {
        setSelected(new Set());
        setConfirmOpen(false);
      },
      onSettled: () => setConfirmOpen(false),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (renewables.length === 0) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 truncate">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Bulk Renewal</span>
                <Badge variant="secondary" className="text-xs ml-1 flex-shrink-0">
                  {renewables.length}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Renew prescriptions for multiple patients
              </CardDescription>
            </div>
            {selected.size > 0 && (
              <Button
                size="sm"
                className="gap-1.5 text-xs h-8 sm:h-9 px-2 sm:px-3 w-full sm:w-auto"
                onClick={() => setConfirmOpen(true)}
                disabled={bulkRenew.isPending}
              >
                {bulkRenew.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                <span className="truncate">Renew {selected.size}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {/* Search + Select All */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search patient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs sm:text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] sm:text-xs h-8 px-2 sm:px-3 whitespace-nowrap"
              onClick={toggleAll}
            >
              {selected.size === filtered.length && filtered.length > 0 ? "Deselect" : "Select All"}
            </Button>
          </div>

          {/* Patient List */}
          <ScrollArea className={filtered.length > 4 ? "h-[280px]" : undefined}>
            <div className="space-y-2">
              {filtered.map((patient) => (
                <div
                  key={patient.patient_id}
                  className={`p-2.5 sm:p-3 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                    selected.has(patient.patient_id)
                      ? "border-primary/40 bg-primary/5"
                      : ""
                  }`}
                  onClick={() => toggleSelect(patient.patient_id)}
                >
                  {/* Top row: checkbox + avatar + name */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Checkbox
                      checked={selected.has(patient.patient_id)}
                      onCheckedChange={() => toggleSelect(patient.patient_id)}
                      className="flex-shrink-0"
                    />
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs">
                        {patient.patient_name?.[0]?.toUpperCase() || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {patient.patient_name || "Unknown Patient"}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                        {patient.diagnosis && (
                          <span className="truncate max-w-[100px] sm:max-w-[140px]">{patient.diagnosis}</span>
                        )}
                        <span>·</span>
                        <span className="whitespace-nowrap">{patient.medications.length} med{patient.medications.length !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span className="whitespace-nowrap">Issued {format(new Date(patient.created_at), "MMM d")}</span>
                      </div>
                    </div>
                  </div>
                  {/* Medication badges - below on mobile */}
                  {patient.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pl-[calc(1rem+1.75rem)] sm:pl-[calc(1.25rem+2rem)]">
                      {patient.medications.slice(0, 3).map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5">
                          <Pill className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" />
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">{m.name}</span>
                        </Badge>
                      ))}
                      {patient.medications.length > 3 && (
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5">
                          +{patient.medications.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {filtered.length === 0 && search && (
            <p className="text-sm text-center text-muted-foreground py-4">
              No matching patients found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Renewal</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to renew prescriptions for{" "}
              <strong>{selected.size} patient{selected.size > 1 ? "s" : ""}</strong>.
              This will create new prescriptions with the same medications, diagnosis,
              and instructions as their current active prescriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[200px] overflow-y-auto space-y-1.5 my-2">
            {selectedPatients.map((p) => (
              <div key={p.patient_id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/50">
                <Pill className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="font-medium truncate">{p.patient_name || "Patient"}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-muted-foreground truncate">
                  {p.medications.map((m) => m.name).join(", ")}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenew} disabled={bulkRenew.isPending}>
              {bulkRenew.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Renew {selected.size} Prescription{selected.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
