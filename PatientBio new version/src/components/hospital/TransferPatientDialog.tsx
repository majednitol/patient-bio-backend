import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Bed as BedIcon, MapPin } from "lucide-react";
import { Admission } from "@/hooks/useAdmissions";
import { useWards, useBeds, Ward, Bed, WARD_TYPES } from "@/hooks/useWards";
import { useCreateTransfer, TRANSFER_REASONS } from "@/hooks/useTransferHistory";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TransferPatientDialogProps {
  admission: Admission | null;
  hospitalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TransferPatientDialog = ({
  admission,
  hospitalId,
  open,
  onOpenChange,
}: TransferPatientDialogProps) => {
  const { user } = useAuth();
  const { data: wards } = useWards(hospitalId);
  const { data: allBeds } = useBeds(hospitalId);
  const createTransfer = useCreateTransfer(hospitalId);

  const [selectedWardId, setSelectedWardId] = useState<string>("");
  const [selectedBedId, setSelectedBedId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Calculate ward availability stats
  const wardStats = useMemo(() => {
    if (!wards || !allBeds) return new Map<string, { available: number; total: number }>();

    const stats = new Map<string, { available: number; total: number }>();
    wards.forEach((ward) => {
      const wardBeds = allBeds.filter((b) => b.ward_id === ward.id);
      const availableBeds = wardBeds.filter(
        (b) => b.status === "available" && b.id !== admission?.bed_id
      );
      stats.set(ward.id, { available: availableBeds.length, total: wardBeds.length });
    });
    return stats;
  }, [wards, allBeds, admission?.bed_id]);

  // Filter available beds for selected ward (excluding current bed)
  const availableBeds = useMemo(() => {
    if (!allBeds || !selectedWardId) return [];
    return allBeds.filter(
      (bed) =>
        bed.ward_id === selectedWardId &&
        bed.status === "available" &&
        bed.id !== admission?.bed_id
    );
  }, [allBeds, selectedWardId, admission?.bed_id]);

  const getWardTypeLabel = (type: string) => {
    return WARD_TYPES.find((t) => t.value === type)?.label || type;
  };

  const handleConfirm = async () => {
    if (!admission || !selectedBedId || !transferReason || !user) return;

    await createTransfer.mutateAsync({
      admissionId: admission.id,
      fromBedId: admission.bed_id,
      toBedId: selectedBedId,
      transferredBy: user.id,
      transferReason,
      notes: notes || undefined,
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedWardId("");
    setSelectedBedId("");
    setTransferReason("");
    setNotes("");
    onOpenChange(false);
  };

  if (!admission) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-1">
            <p className="font-medium">
              {admission.patient_profile?.display_name || "Unknown Patient"}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                Current: {admission.bed?.ward?.name || "No Ward"} - Bed{" "}
                {admission.bed?.bed_number || "N/A"}
              </span>
            </div>
          </div>

          {/* Ward Selection */}
          <div className="space-y-3">
            <Label>Select Destination Ward</Label>
            <RadioGroup
              value={selectedWardId}
              onValueChange={(value) => {
                setSelectedWardId(value);
                setSelectedBedId(""); // Reset bed when ward changes
              }}
              className="grid gap-2"
            >
              {wards?.map((ward) => {
                const stats = wardStats.get(ward.id);
                const hasAvailable = (stats?.available || 0) > 0;
                const isCurrentWard = ward.id === admission.bed?.ward_id;

                return (
                  <div
                    key={ward.id}
                    className={cn(
                      "flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors",
                      selectedWardId === ward.id && "border-primary bg-primary/5",
                      !hasAvailable && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => hasAvailable && setSelectedWardId(ward.id)}
                  >
                    <RadioGroupItem
                      value={ward.id}
                      id={ward.id}
                      disabled={!hasAvailable}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {ward.name}
                          {isCurrentWard && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Current
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getWardTypeLabel(ward.type)}
                          {ward.floor && ` • Floor ${ward.floor}`}
                        </p>
                      </div>
                      <Badge
                        variant={hasAvailable ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {stats?.available || 0} / {stats?.total || 0}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Bed Selection */}
          {selectedWardId && availableBeds.length > 0 && (
            <div className="space-y-3">
              <Label>Select Bed</Label>
              <div className="grid grid-cols-3 gap-2">
                {availableBeds.map((bed) => (
                  <Button
                    key={bed.id}
                    type="button"
                    variant={selectedBedId === bed.id ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setSelectedBedId(bed.id)}
                    title={`৳${bed.daily_rate}/day`}
                  >
                    <BedIcon className="h-3 w-3" />
                    {bed.bed_number}
                  </Button>
                ))}
              </div>
              {selectedBedId && (
                <p className="text-xs text-muted-foreground">
                  Daily rate: ৳
                  {availableBeds.find((b) => b.id === selectedBedId)?.daily_rate || 0}
                </p>
              )}
            </div>
          )}

          {/* Transfer Reason */}
          <div className="space-y-2">
            <Label>Transfer Reason *</Label>
            <Select value={transferReason} onValueChange={setTransferReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason for transfer" />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes about this transfer..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedBedId || !transferReason || createTransfer.isPending
            }
          >
            {createTransfer.isPending ? "Transferring..." : "Confirm Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferPatientDialog;
