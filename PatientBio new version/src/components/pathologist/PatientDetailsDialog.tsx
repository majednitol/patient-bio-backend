import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  User,
  Calendar,
  FileText,
  Download,
  AlertCircle,
  Heart,
  Droplets,
} from "lucide-react";
import { format } from "date-fns";
import type { DoctorPathologistShare } from "@/hooks/useDoctorPathologistShares";

interface PatientData {
  profile: {
    display_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
  healthData: {
    blood_group: string | null;
    health_allergies: string | null;
    chronic_diseases: string | null;
    current_medications: string | null;
  } | null;
  records: Array<{
    id: string;
    title: string;
    category: string | null;
    disease_category: string | null;
    file_url: string;
    record_date: string | null;
    uploaded_at: string;
  }>;
}

interface PatientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share: DoctorPathologistShare;
}

export const PatientDetailsDialog = ({
  open,
  onOpenChange,
  share,
}: PatientDetailsDialogProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && share.patient_id) {
      fetchPatientData();
    }
  }, [open, share.patient_id]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-patient-data-for-pathologist",
        {
          body: {
            share_id: share.id,
            patient_id: share.patient_id,
          },
        }
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setPatientData(data);
    } catch (err: any) {
      console.error("Error fetching patient data:", err);
      setError(err.message || "Failed to load patient data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadRecord = async (recordId: string, fileUrl: string) => {
    setDownloadingId(recordId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-document-url",
        {
          body: { record_id: recordId },
        }
      );

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error generating download URL:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Details
          </DialogTitle>
          <DialogDescription>
            View patient information shared by the referring doctor
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
            <p className="text-destructive font-medium">Failed to load patient data</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchPatientData}>
              Retry
            </Button>
          </div>
        ) : patientData ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Patient Profile */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {patientData.profile?.display_name?.[0]?.toUpperCase() || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {patientData.profile?.display_name || "Unknown Patient"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {patientData.profile?.gender && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {patientData.profile.gender}
                          </span>
                        )}
                        {patientData.profile?.date_of_birth && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {calculateAge(patientData.profile.date_of_birth)} years
                          </span>
                        )}
                      </div>
                    </div>
                    {share.disease_category && (
                      <Badge variant="secondary" className="uppercase text-xs">
                        {share.disease_category.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Health Data */}
              {patientData.healthData && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Health Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {patientData.healthData.blood_group && (
                      <Card>
                        <CardContent className="p-3 flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Group</p>
                            <p className="font-medium">{patientData.healthData.blood_group}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {patientData.healthData.health_allergies && (
                      <Card>
                        <CardContent className="p-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive/70" />
                          <div>
                            <p className="text-xs text-muted-foreground">Allergies</p>
                            <p className="font-medium text-sm truncate">
                              {patientData.healthData.health_allergies}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {patientData.healthData.chronic_diseases && (
                      <Card className="col-span-2">
                        <CardContent className="p-3 flex items-start gap-2">
                          <Heart className="h-4 w-4 text-destructive mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Chronic Conditions</p>
                            <p className="font-medium text-sm">
                              {patientData.healthData.chronic_diseases}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {patientData.healthData.current_medications && (
                      <Card className="col-span-2">
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground mb-1">Current Medications</p>
                          <p className="text-sm">{patientData.healthData.current_medications}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {/* Health Records */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Health Records ({patientData.records.length})
                </h4>
                {patientData.records.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No health records available
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {patientData.records.map((record) => (
                      <Card key={record.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{record.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {record.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {record.category}
                                  </Badge>
                                )}
                                {record.record_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(record.record_date), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadRecord(record.id, record.file_url)}
                            disabled={downloadingId === record.id}
                          >
                            {downloadingId === record.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes from Doctor */}
              {share.notes && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Notes from Doctor</p>
                    <p className="text-sm">{share.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
