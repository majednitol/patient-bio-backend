import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useResearcherStudyNotes, type StudyNoteInput } from "@/hooks/useResearcherStudyNotes";
import { StudyNoteDialog } from "@/components/researcher/StudyNoteDialog";
import LongitudinalTimeline from "@/components/researcher/LongitudinalTimeline";
import ClinicalRecordsTab from "@/components/researcher/ClinicalRecordsTab";
import ClinicalValueTrend from "@/components/researcher/ClinicalValueTrend";
import { 
  FileText, User, Heart, ExternalLink, Calendar, AlertCircle,
  ShieldCheck, BookOpen, Plus, Pencil, Trash2, Clock, Stethoscope, TrendingUp, FlaskConical,
} from "lucide-react";

interface PatientData {
  profile: {
    display_name?: string;
    date_of_birth?: string;
    gender?: string;
  } | null;
  healthData: {
    blood_group?: string;
    health_allergies?: string;
    chronic_diseases?: string;
    current_medications?: string;
    previous_diseases?: string;
  } | null;
  records: Array<{
    id: string;
    title: string;
    category?: string;
    disease_category?: string;
    file_url: string;
    record_date?: string;
    uploaded_at?: string;
    description?: string;
    signed_url?: string;
  }>;
  isAnonymized: boolean;
  diseaseCategory?: string;
  clinicalRecords?: any;
  prescriptions?: any[];
  diagnosticCenterGrades?: Array<{ lab_name: string; lab_grade: string | null }>;
}

interface ResearcherPatientDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareId: string;
  diseaseCategory?: string;
}

const ResearcherPatientDataDialog = ({
  open, onOpenChange, shareId, diseaseCategory,
}: ResearcherPatientDataDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);

  const { notes, createNote, updateNote, deleteNote, isCreating, isUpdating } =
    useResearcherStudyNotes(shareId);

  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("get-patient-data-for-researcher", {
        body: { share_id: shareId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setPatientData(data);
    } catch (err) {
      console.error("Error fetching patient data:", err);
      setError(err instanceof Error ? err.message : "Failed to load patient data");
      toast({ title: "Error", description: "Failed to load patient data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !patientData) fetchPatientData();
  };

  const openDocument = (url: string) => window.open(url, "_blank");

  const handleSaveNote = (data: StudyNoteInput & { id?: string }) => {
    if (data.id) updateNote({ ...data, id: data.id });
    else createNote({ ...data, share_id: shareId });
    setEditingNote(null);
  };

  const showTimeline = patientData && !patientData.isAnonymized && patientData.records.length > 0;
  const hasClinical = patientData?.clinicalRecords || (patientData?.prescriptions && patientData.prescriptions.length > 0);

  // Build clinical snapshots for trend chart from investigations data
  const clinicalSnapshots = (() => {
    if (!patientData?.clinicalRecords) return [];
    const inv = patientData.clinicalRecords as Record<string, any>;
    const snapshots: Array<{ date: string; bp_systolic?: number; bp_diastolic?: number; bmi?: number }> = [];
    // From investigations
    if (inv.investigations) {
      const i = inv.investigations;
      if (i.bp_systolic || i.bmi) {
        snapshots.push({
          date: i.updated_at || i.created_at || patientData.records[0]?.record_date || new Date().toISOString(),
          bp_systolic: i.bp_systolic ?? undefined,
          bp_diastolic: i.bp_diastolic ?? undefined,
          bmi: i.bmi ?? undefined,
        });
      }
    }
    // From records that have dates (simulate multiple data points)
    patientData.records.forEach((r) => {
      if (r.record_date && r.category === "lab_result") {
        snapshots.push({ date: r.record_date });
      }
    });
    return snapshots;
  })();
  const showTrends = clinicalSnapshots.length >= 2;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Patient Research Data
            {patientData?.isAnonymized && (
              <Badge variant="secondary" className="ml-2">
                <ShieldCheck className="h-3 w-3 mr-1" />Anonymized
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {diseaseCategory 
              ? `Viewing ${diseaseCategory.replace('_', ' ')} related health records`
              : "Viewing shared health records for research purposes"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchPatientData}>Try Again</Button>
          </div>
        ) : patientData ? (
          <div className="space-y-4">
            {/* Diagnostic Center Grades */}
            {patientData.diagnosticCenterGrades && patientData.diagnosticCenterGrades.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Data Sources:
                </span>
                {patientData.diagnosticCenterGrades.map((dc, i) => {
                  const gradeColors: Record<string, string> = {
                    A: "bg-green-500/15 text-green-700 border-green-500/30",
                    B: "bg-blue-500/15 text-blue-700 border-blue-500/30",
                    C: "bg-amber-500/15 text-amber-700 border-amber-500/30",
                    D: "bg-red-500/15 text-red-700 border-red-500/30",
                  };
                  return (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`text-[10px] ${dc.lab_grade ? gradeColors[dc.lab_grade] || "" : "text-muted-foreground"}`}
                    >
                      {dc.lab_name}
                      {dc.lab_grade ? ` • Grade ${dc.lab_grade}` : " • Ungraded"}
                    </Badge>
                  );
                })}
              </div>
            )}
          <Tabs defaultValue="records" className="w-full">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="records" className="flex-1">
                <FileText className="h-4 w-4 mr-1" />
                Records ({patientData.records.length})
              </TabsTrigger>
              <TabsTrigger value="health" className="flex-1">
                <Heart className="h-4 w-4 mr-1" />
                Health
              </TabsTrigger>
              {hasClinical && (
                <TabsTrigger value="clinical" className="flex-1">
                  <Stethoscope className="h-4 w-4 mr-1" />
                  Clinical
                </TabsTrigger>
              )}
              <TabsTrigger value="notes" className="flex-1">
                <BookOpen className="h-4 w-4 mr-1" />
                Notes ({notes.length})
              </TabsTrigger>
              {showTrends && (
                <TabsTrigger value="trends" className="flex-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trends
                </TabsTrigger>
              )}
              {showTimeline && (
                <TabsTrigger value="timeline" className="flex-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Timeline
                </TabsTrigger>
              )}
              {!patientData.isAnonymized && (
                <TabsTrigger value="profile" className="flex-1">
                  <User className="h-4 w-4 mr-1" />
                  Profile
                </TabsTrigger>
              )}
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              {/* Records Tab */}
              <TabsContent value="records" className="mt-0">
                {patientData.records.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No health records found for this category</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientData.records.map((record) => (
                      <Card key={record.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{record.title}</h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                {record.category && <Badge variant="outline" className="text-xs">{record.category}</Badge>}
                                {record.disease_category && <Badge variant="secondary" className="text-xs">{record.disease_category.replace('_', ' ')}</Badge>}
                              </div>
                              {record.record_date && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(record.record_date).toLocaleDateString()}
                                </p>
                              )}
                              {record.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{record.description}</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => record.signed_url && openDocument(record.signed_url)} disabled={!record.signed_url}>
                              <ExternalLink className="h-4 w-4 mr-1" />View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="mt-0">
                <Card>
                  <CardHeader><CardTitle className="text-base">Health Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {patientData.healthData ? (
                      <>
                        {patientData.healthData.blood_group && <div><p className="text-sm font-medium text-muted-foreground">Blood Group</p><p>{patientData.healthData.blood_group}</p></div>}
                        {patientData.healthData.health_allergies && <div><p className="text-sm font-medium text-muted-foreground">Allergies</p><p>{patientData.healthData.health_allergies}</p></div>}
                        {patientData.healthData.chronic_diseases && <div><p className="text-sm font-medium text-muted-foreground">Chronic Diseases</p><p>{patientData.healthData.chronic_diseases}</p></div>}
                        {patientData.healthData.current_medications && <div><p className="text-sm font-medium text-muted-foreground">Current Medications</p><p>{patientData.healthData.current_medications}</p></div>}
                        {patientData.healthData.previous_diseases && <div><p className="text-sm font-medium text-muted-foreground">Previous Diseases</p><p>{patientData.healthData.previous_diseases}</p></div>}
                        {!patientData.healthData.blood_group && !patientData.healthData.health_allergies && !patientData.healthData.chronic_diseases && (
                          <p className="text-muted-foreground text-center py-4">No health data available</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No health data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Clinical Tab */}
              {hasClinical && (
                <TabsContent value="clinical" className="mt-0">
                  <ClinicalRecordsTab
                    clinicalRecords={patientData.clinicalRecords}
                    prescriptions={patientData.prescriptions || null}
                  />
                </TabsContent>
              )}

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-0">
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setEditingNote(null); setNoteDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" />Add Note
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No notes for this data share</p>
                      <p className="text-sm">Add research notes to annotate your findings</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium">{note.study_title}</h4>
                              {note.findings && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.findings}</p>}
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(note.updated_at).toLocaleDateString()}
                                {note.sample_size && ` • ${note.sample_size} participants`}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNote(note); setNoteDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteNote(note.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {showTrends && (
                <TabsContent value="trends" className="mt-0">
                  <ClinicalValueTrend snapshots={clinicalSnapshots} title="Longitudinal Clinical Trends" />
                </TabsContent>
              )}

              {showTimeline && (
                <TabsContent value="timeline" className="mt-0">
                  <LongitudinalTimeline records={patientData.records} />
                </TabsContent>
              )}

              {!patientData.isAnonymized && (
                <TabsContent value="profile" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Patient Profile</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {patientData.profile ? (
                        <>
                          {patientData.profile.display_name && <div><p className="text-sm font-medium text-muted-foreground">Name</p><p>{patientData.profile.display_name}</p></div>}
                          {patientData.profile.date_of_birth && <div><p className="text-sm font-medium text-muted-foreground">Date of Birth</p><p>{new Date(patientData.profile.date_of_birth).toLocaleDateString()}</p></div>}
                          {patientData.profile.gender && <div><p className="text-sm font-medium text-muted-foreground">Gender</p><p className="capitalize">{patientData.profile.gender}</p></div>}
                        </>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No profile data available</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </ScrollArea>
          </Tabs>
          </div>
        ) : null}
      </DialogContent>

      <StudyNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        note={editingNote}
        shareId={shareId}
        onSave={handleSaveNote}
        isSaving={isCreating || isUpdating}
      />
    </Dialog>
  );
};

export default ResearcherPatientDataDialog;
