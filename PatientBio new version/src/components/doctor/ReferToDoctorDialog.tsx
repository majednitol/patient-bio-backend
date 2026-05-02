import { useState } from "react";
import { useDoctorReferrals, useSearchDoctors } from "@/hooks/useDoctorReferrals";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, BadgeCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  hospitalId?: string;
}

export function ReferToDoctorDialog({ open, onOpenChange, patientId, patientName, hospitalId }: Props) {
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [urgency, setUrgency] = useState("routine");
  const [reason, setReason] = useState("");
  const [specialtyNeeded, setSpecialtyNeeded] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const { data: doctors = [], isLoading: searching } = useSearchDoctors(search);
  const { createReferral } = useDoctorReferrals();

  const handleSubmit = async () => {
    if (!selectedDoctor || !reason) return;
    await createReferral.mutateAsync({
      referred_to_doctor_id: selectedDoctor.user_id,
      patient_id: patientId,
      hospital_id: hospitalId,
      specialty_needed: specialtyNeeded || undefined,
      urgency,
      reason,
      clinical_notes: clinicalNotes || undefined,
      diagnosis: diagnosis || undefined,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSearch("");
    setSelectedDoctor(null);
    setUrgency("routine");
    setReason("");
    setSpecialtyNeeded("");
    setClinicalNotes("");
    setDiagnosis("");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Refer Patient to Doctor</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Refer <span className="font-medium">{patientName}</span> to a specialist
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Doctor Search */}
          {!selectedDoctor ? (
            <div className="space-y-2">
              <Label>Search Doctor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by doctor name..."
                  className="pl-9"
                />
              </div>
              {searching && <p className="text-sm text-muted-foreground">Searching...</p>}
              {doctors.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {doctors.map((doc) => (
                    <button
                      key={doc.user_id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setSelectedDoctor(doc)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {doc.full_name?.[0]?.toUpperCase() || "D"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium flex items-center gap-1">
                          {doc.full_name}
                          {doc.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-green-500" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{doc.specialty || "General"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedDoctor.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{selectedDoctor.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDoctor.specialty || "General"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)}>
                Change
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specialty Needed</Label>
              <Input
                value={specialtyNeeded}
                onChange={(e) => setSpecialtyNeeded(e.target.value)}
                placeholder="e.g., Cardiology"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for Referral *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this referral is needed..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Current diagnosis"
            />
          </div>

          <div className="space-y-2">
            <Label>Clinical Notes</Label>
            <Textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Additional clinical information..."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedDoctor || !reason || createReferral.isPending}
          >
            {createReferral.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Referral
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
