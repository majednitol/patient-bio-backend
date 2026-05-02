import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAdmissionMedications,
  useUpdateMedication,
  AdmissionMedication,
  MEDICATION_ROUTES,
  MEDICATION_FREQUENCIES,
  MedicationStatus,
} from "@/hooks/useAdmissionMedications";
import AddMedicationDialog from "./AddMedicationDialog";
import RecordAdministrationDialog from "./RecordAdministrationDialog";
import { Pill, Plus, Syringe, MoreVertical, Clock, Ban, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AdmissionMedicationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionId: string;
  patientName: string;
}

export default function AdmissionMedicationsDialog({
  open,
  onOpenChange,
  admissionId,
  patientName,
}: AdmissionMedicationsDialogProps) {
  const { data: medications, isLoading } = useAdmissionMedications(admissionId);
  const updateMedication = useUpdateMedication();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<AdmissionMedication | null>(null);

  const activeMedications = medications?.filter(m => m.status === "active") || [];
  const inactiveMedications = medications?.filter(m => m.status !== "active") || [];

  const handleAdminister = (medication: AdmissionMedication) => {
    setSelectedMedication(medication);
    setRecordDialogOpen(true);
  };

  const handleStatusChange = async (medication: AdmissionMedication, newStatus: MedicationStatus) => {
    await updateMedication.mutateAsync({
      medication_id: medication.id,
      admission_id: admissionId,
      status: newStatus,
    });
  };

  const getFrequencyLabel = (value: string) => {
    return MEDICATION_FREQUENCIES.find(f => f.value === value)?.label || value;
  };

  const getRouteLabel = (value: string) => {
    return MEDICATION_ROUTES.find(r => r.value === value)?.label || value;
  };

  const getStatusBadge = (status: MedicationStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary">Active</Badge>;
      case "discontinued":
        return <Badge variant="destructive">Discontinued</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderMedicationCard = (medication: AdmissionMedication) => (
    <Card key={medication.id} className="relative">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{medication.medication_name}</h4>
              {getStatusBadge(medication.status)}
              <Badge variant="outline" className="text-xs">
                {getRouteLabel(medication.route)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{medication.dosage}</span>
              {" • "}
              {getFrequencyLabel(medication.frequency)}
            </div>

            {medication.notes && (
              <p className="text-sm text-muted-foreground italic">
                {medication.notes}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Prescribed by {medication.prescriber_name}
              </span>
              <span>
                {formatDistanceToNow(new Date(medication.prescribed_at), { addSuffix: true })}
              </span>
            </div>

            {/* Last Administration Info */}
            {medication.last_administration && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last: {format(new Date(medication.last_administration.administered_at), "MMM d, h:mm a")}
                {medication.last_administration.skipped && (
                  <Badge variant="outline" className="ml-1 text-xs">Skipped</Badge>
                )}
                <span className="ml-2">
                  ({medication.administration_count} total)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {medication.status === "active" && (
              <Button 
                size="sm" 
                onClick={() => handleAdminister(medication)}
              >
                <Syringe className="h-4 w-4 mr-1" />
                Administer
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {medication.status === "active" && (
                  <>
                    <DropdownMenuItem onClick={() => handleStatusChange(medication, "completed")}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusChange(medication, "discontinued")}
                      className="text-destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Discontinue
                    </DropdownMenuItem>
                  </>
                )}
                {medication.status !== "active" && (
                  <DropdownMenuItem onClick={() => handleStatusChange(medication, "active")}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medications for {patientName}
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Medication
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="active" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  Active ({activeMedications.length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Discontinued/Completed ({inactiveMedications.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-4">
                {activeMedications.length === 0 ? (
                  <InlineEmptyState
                    icon={Pill}
                    title="No active medications"
                    description="Add medications to track administration during the patient's stay."
                    action={{
                      label: "Add Medication",
                      onClick: () => setAddDialogOpen(true),
                      icon: Plus,
                    }}
                  />
                ) : (
                  activeMedications.map(renderMedicationCard)
                )}
              </TabsContent>

              <TabsContent value="inactive" className="space-y-4 mt-4">
                {inactiveMedications.length === 0 ? (
                  <InlineEmptyState
                    icon={Pill}
                    title="No discontinued or completed medications"
                    description="Medications that are discontinued or completed will appear here."
                  />
                ) : (
                  inactiveMedications.map(renderMedicationCard)
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Medication Dialog */}
      <AddMedicationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        admissionId={admissionId}
      />

      {/* Record Administration Dialog */}
      {selectedMedication && (
        <RecordAdministrationDialog
          open={recordDialogOpen}
          onOpenChange={setRecordDialogOpen}
          medication={selectedMedication}
          admissionId={admissionId}
        />
      )}
    </>
  );
}
