import { Button } from "@/components/ui/button";
import { Repeat, Loader2 } from "lucide-react";
import { useLatestPrescription } from "@/hooks/useRepeatPrescription";
import type { PrescriptionPrefillData } from "@/components/doctor/CreatePrescriptionDialog";
import { toast } from "@/hooks/use-toast";

interface RepeatRxButtonProps {
  patientId: string;
  patientName: string | null;
  onRepeat: (prefill: PrescriptionPrefillData) => void;
}

export function RepeatRxButton({ patientId, patientName, onRepeat }: RepeatRxButtonProps) {
  const { data: latestRx, isLoading } = useLatestPrescription(patientId);

  const handleClick = () => {
    if (!latestRx) {
      toast.info("No previous prescription found for this patient.");
      return;
    }
    onRepeat(latestRx);
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-xs h-7 gap-1"
      onClick={handleClick}
      disabled={isLoading}
      title={latestRx ? "Repeat last prescription" : "No previous prescription"}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Repeat className="h-3 w-3" />
      )}
      Repeat
    </Button>
  );
}
