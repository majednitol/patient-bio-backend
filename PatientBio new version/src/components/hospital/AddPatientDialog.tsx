import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useLookupPatientByCode, useGrantPatientAccess } from "@/hooks/useDoctorPatients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Search, User, Loader2, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (patientId: string) => void;
}

export default function AddPatientDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPatientDialogProps) {
  const { user } = useAuth();
  const [patientCode, setPatientCode] = useState("");
  const lookupMutation = useLookupPatientByCode();
  const grantAccessMutation = useGrantPatientAccess();

  const handleSearch = () => {
    if (!patientCode.trim()) {
      toast({
        title: "Enter Patient ID",
        description: "Please enter the patient's ID code",
        variant: "destructive",
      });
      return;
    }

    lookupMutation.mutate(patientCode.trim());
  };

  const handleAddPatient = () => {
    if (!lookupMutation.data?.patient_id || !user?.id) return;

    grantAccessMutation.mutate({ doctorId: user.id, patientId: lookupMutation.data.patient_id }, {
      onSuccess: (result) => {
        toast({
          title: result.reactivated ? "Access Restored" : "Patient Added",
          description: result.reactivated
            ? "You now have access to this patient again"
            : "Patient has been added to your list",
        });
        onSuccess(lookupMutation.data!.patient_id!);
        handleClose();

        // Auto-trigger duplicate detection for the added patient
        if (!result.reactivated && lookupMutation.data?.patient_id) {
          supabase.functions.invoke("detect-duplicate-patients", {
            body: { patient_id: lookupMutation.data.patient_id },
          }).catch(() => { /* background scan */ });
        }
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to add patient",
          variant: "destructive",
        });
      },
    });
  };

  const handleClose = () => {
    setPatientCode("");
    lookupMutation.reset();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const result = lookupMutation.data;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Patient
          </DialogTitle>
          <DialogDescription>
            Enter the patient's ID code to find and add them to your list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="patientCode">Patient ID</Label>
            <div className="flex gap-2">
              <Input
                id="patientCode"
                placeholder="e.g., PB-202602-000008-6"
                value={patientCode}
                onChange={(e) => setPatientCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                maxLength={20}
                className="font-mono uppercase"
              />
              <Button
                onClick={handleSearch}
                disabled={lookupMutation.isPending || !patientCode.trim()}
              >
                {lookupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the patient's Health Passport ID (e.g., PB-202602-000008-6)
            </p>
          </div>

          {/* Results */}
          {lookupMutation.isError && (
            <Card className="border-destructive">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Error searching for patient</span>
                </div>
              </CardContent>
            </Card>
          )}

          {result && !result.found && (
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">
                      No Patient Found
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      No patient with ID "{patientCode}" exists. Check the ID and try again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result?.found && (
            <Card className={result.already_connected ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{result.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.age ? `${result.age} years` : "Age unknown"}
                      {result.gender && ` • ${result.gender}`}
                    </p>
                    {result.already_connected && (
                      <div className="flex items-center gap-1 text-green-600 mt-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Already in your patient list</span>
                      </div>
                    )}
                  </div>
                </div>

                {!result.already_connected && (
                  <Button
                    onClick={handleAddPatient}
                    disabled={grantAccessMutation.isPending}
                    className="w-full mt-4"
                  >
                    {grantAccessMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add to My Patients
                      </>
                    )}
                  </Button>
                )}

                {result.already_connected && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSuccess(result.patient_id!);
                      handleClose();
                    }}
                    className="w-full mt-4"
                  >
                    View Patient Records
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
