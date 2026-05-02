import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCreatePrescription } from "@/hooks/usePrescriptions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Loader2, Plus, Trash2, CalendarIcon, Pill, FileText, Save, Sparkles,
  Check, X, ChevronDown, GripVertical, Copy, Package, Stethoscope, StickyNote,
  ClipboardList, TestTubes, MessageSquare, Sun, Cloud, Moon,
} from "lucide-react";
import { PrescriptionTemplateSelector } from "./PrescriptionTemplateSelector";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { MedicationInteractionWarning } from "./MedicationInteractionWarning";
import { FrequentMedsBar } from "./FrequentMedsBar";
import type { PrescriptionTemplate } from "@/hooks/usePrescriptionTemplates";
import { DiagnosisCombobox, type ICDCodeSelection } from "./DiagnosisCombobox";
import { extractICD11Chapter } from "@/lib/icd11-mapping";
import { useDiagnosisSuggestion, type DiagnosisSuggestion } from "@/hooks/useDiagnosisSuggestion";
import type { AppointmentIntake } from "@/hooks/useAppointmentIntake";
import { useFavoriteMedications, type FavoriteMedication } from "@/hooks/useFavoriteMedications";
import { TreatmentCostBreakdown } from "./TreatmentCostBreakdown";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";

// === Constants for smart dropdowns ===
const FREQUENCY_OPTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "Once weekly",
  "As needed (PRN)",
  "At bedtime",
  "Before meals",
  "After meals",
];

const DURATION_OPTIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "Ongoing",
];

const DOSAGE_UNITS = ["mg", "g", "mcg", "ml", "IU", "drops", "puffs", "units"];

// === Quick-add prescription presets ===
const PRESCRIPTION_PRESETS = [
  {
    name: "Fever & Pain",
    icon: "🤒",
    medications: [
      { name: "Paracetamol", dosage: "500mg", frequency: "Three times daily", duration: "5 days", instructions: "Take after meals" },
    ],
  },
  {
    name: "Infection Kit",
    icon: "💊",
    medications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "7 days", instructions: "Complete the full course" },
      { name: "Paracetamol", dosage: "500mg", frequency: "As needed (PRN)", duration: "5 days", instructions: "For fever" },
    ],
  },
  {
    name: "Allergy Relief",
    icon: "🤧",
    medications: [
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "7 days", instructions: "Take at bedtime" },
    ],
  },
  {
    name: "Acid Reflux",
    icon: "🔥",
    medications: [
      { name: "Omeprazole", dosage: "20mg", frequency: "Once daily", duration: "14 days", instructions: "Take 30 minutes before breakfast" },
    ],
  },
  {
    name: "UTI Protocol",
    icon: "💧",
    medications: [
      { name: "Ciprofloxacin", dosage: "500mg", frequency: "Twice daily", duration: "5 days", instructions: "Drink plenty of water" },
    ],
  },
  {
    name: "Hypertension",
    icon: "❤️",
    medications: [
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "Ongoing", instructions: "Take in the morning" },
    ],
  },
];

const timingPatternSchema = z.object({
  morning: z.number().min(0).max(3),
  noon: z.number().min(0).max(3),
  night: z.number().min(0).max(3),
}).optional();

const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  timingPattern: timingPatternSchema,
});

const formSchema = z.object({
  chief_complaints: z.string().optional(),
  diagnosis: z.string().optional(),
  investigations: z.string().optional(),
  medications: z.array(medicationSchema).min(1, "At least one medication is required"),
  instructions: z.string().optional(),
  advice: z.string().optional(),
  notes: z.string().optional(),
  follow_up_date: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface PrescriptionPrefillData {
  diagnosis?: string;
  chief_complaints?: string;
  investigations?: string;
  advice?: string;
  medications?: { name: string; dosage: string; frequency: string; duration: string; instructions?: string; timingPattern?: { morning: number; noon: number; night: number } }[];
  instructions?: string;
  notes?: string;
}

interface CreatePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name: string | null;
  };
  hospitalId?: string;
  initialData?: PrescriptionPrefillData;
  intakeData?: AppointmentIntake | null;
  patientAllergies?: string[];
  currentMedications?: string;
  chronicConditions?: string[];
}

// Timing grid cell component
const TimingCell = ({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(value >= 2 ? 0 : value + 1)}
    className={cn(
      "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
      value > 0
        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
    )}
  >
    <Icon className="h-3 w-3" />
    <span>{value}</span>
  </button>
);

export const CreatePrescriptionDialog = ({
  open,
  onOpenChange,
  patient,
  hospitalId,
  initialData,
  intakeData,
  patientAllergies,
  currentMedications,
  chronicConditions,
}: CreatePrescriptionDialogProps) => {
  const createPrescription = useCreatePrescription();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedICDCode, setSelectedICDCode] = useState<ICDCodeSelection | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { suggestions, isLoading: isSuggestLoading, fetchSuggestions, clearSuggestions } = useDiagnosisSuggestion();
  const { trackUsage } = useFavoriteMedications();
  const { user } = useAuth();
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { useDoctorFee } = useCostEstimation();
  const { data: doctorFeeData } = useDoctorFee(user?.id);
  const { data: doctorProfile } = useDoctorProfile();
  const specialtyConfig = getSpecialtyConfig(doctorProfile?.specialty);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      chief_complaints: initialData?.chief_complaints || "",
      diagnosis: initialData?.diagnosis || "",
      investigations: initialData?.investigations || "",
      medications: initialData?.medications?.length
        ? initialData.medications.map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions || "",
            timingPattern: m.timingPattern,
          }))
        : [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }],
      instructions: initialData?.instructions || "",
      advice: initialData?.advice || "",
      notes: initialData?.notes || "",
      follow_up_date: undefined,
    },
  });

  const { fields, append, remove, replace, move } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const handleSelectTemplate = (template: PrescriptionTemplate) => {
    if (template.diagnosis) form.setValue("diagnosis", template.diagnosis);
    if (template.instructions) form.setValue("instructions", template.instructions);
    if (template.medications.length > 0) {
      replace(template.medications.map(med => ({
        name: med.name, dosage: med.dosage, frequency: med.frequency,
        duration: med.duration, instructions: med.instructions || "",
        timingPattern: (med as any).timingPattern,
      })));
    }
  };

  const handleAISuggest = () => {
    if (!intakeData?.chief_complaint) return;
    fetchSuggestions({
      chief_complaint: intakeData.chief_complaint,
      symptom_duration: intakeData.symptom_duration || undefined,
      symptom_severity: intakeData.symptom_severity || undefined,
      self_medications: intakeData.self_medications || undefined,
      additional_notes: intakeData.additional_notes || undefined,
      patient_allergies: patientAllergies,
    });
  };

  const applySuggestion = (suggestion: DiagnosisSuggestion) => {
    form.setValue("diagnosis", suggestion.diagnosis);
    if (suggestion.general_instructions) form.setValue("instructions", suggestion.general_instructions);
    if (suggestion.medications.length > 0) {
      replace(suggestion.medications.map(med => ({
        name: med.name, dosage: med.dosage, frequency: med.frequency,
        duration: med.duration, instructions: med.instructions || "",
      })));
    }
    clearSuggestions();
  };

  const applyPreset = (preset: typeof PRESCRIPTION_PRESETS[0]) => {
    replace(preset.medications.map(med => ({
      name: med.name, dosage: med.dosage, frequency: med.frequency,
      duration: med.duration, instructions: med.instructions || "",
    })));
  };

  const duplicateMedication = (index: number) => {
    const med = form.getValues(`medications.${index}`);
    append({ ...med });
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      move(dragIndex, index);
      setDragIndex(index);
    }
  };
  const handleDragEnd = () => setDragIndex(null);

  const onSubmit = async (data: FormData) => {
    const medications = data.medications.map(med => ({
      name: med.name, dosage: med.dosage, frequency: med.frequency,
      duration: med.duration, instructions: med.instructions,
      ...(med.timingPattern ? { timingPattern: { morning: med.timingPattern.morning ?? 0, noon: med.timingPattern.noon ?? 0, night: med.timingPattern.night ?? 0 } } : {}),
    }));

    await createPrescription.mutateAsync({
      patient_id: patient.patient_id,
      hospital_id: hospitalId,
      chief_complaints: data.chief_complaints,
      diagnosis: data.diagnosis,
      investigations: data.investigations,
      medications,
      instructions: data.instructions,
      advice: data.advice,
      notes: data.notes,
      follow_up_date: data.follow_up_date ? format(data.follow_up_date, "yyyy-MM-dd") : undefined,
      icd11_code: selectedICDCode?.code || undefined,
      icd11_chapter_code: selectedICDCode?.standard === "icd11" && selectedICDCode?.code
        ? extractICD11Chapter(selectedICDCode.code) || undefined
        : undefined,
      icd_standard: selectedICDCode?.standard || undefined,
    });

    medications.forEach((med) => {
      trackUsage.mutate({
        name: med.name, dosage: med.dosage, frequency: med.frequency,
        duration: med.duration, instructions: med.instructions,
      });
    });

    form.reset();
    clearSuggestions();
    onOpenChange(false);
  };

  const defaultInvestigations = specialtyConfig.prescriptionFormat?.defaultInvestigations || [];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="text-base sm:text-lg">Create Prescription</span>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Prescribing for: <strong>{patient.display_name || "Unknown Patient"}</strong>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ─── Section 0: Chief Complaints ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" />
                Chief Complaints
              </div>
              <FormField
                control={form.control}
                name="chief_complaints"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Chest pain for 3 days, shortness of breath"
                        className="min-h-[60px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Auto-fill from intake if available */}
              {intakeData?.chief_complaint && !form.watch("chief_complaints") && (
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => form.setValue("chief_complaints", intakeData.chief_complaint || "")}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Fill from intake: "{intakeData.chief_complaint.substring(0, 40)}..."
                </Button>
              )}
            </div>

            <div className="border-t border-border/50" />

            {/* ─── Section 1: Diagnosis ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Stethoscope className="h-4 w-4 text-primary" />
                Diagnosis
              </div>
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <DiagnosisCombobox value={field.value || ""} onChange={field.onChange} onCodeSelect={setSelectedICDCode} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AI Suggest */}
              {intakeData?.chief_complaint && (
                <div className="space-y-3">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={handleAISuggest} disabled={isSuggestLoading}
                    className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
                  >
                    {isSuggestLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {isSuggestLoading ? "Analyzing symptoms..." : "AI Suggest Diagnosis & Medications"}
                  </Button>

                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">AI Suggestions (click to apply)</p>
                        <Button type="button" variant="ghost" size="sm" onClick={clearSuggestions} className="h-6 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {suggestions.map((s, i) => (
                        <button
                          key={i} type="button" onClick={() => applySuggestion(s)}
                          className="w-full text-left border rounded-lg p-3 space-y-1 hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{s.diagnosis}</span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              s.confidence === "high" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              s.confidence === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              s.confidence === "low" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            )}>
                              {s.confidence}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.medications.map((m, j) => (
                              <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded">{m.name} {m.dosage}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                      <p className="text-[10px] text-muted-foreground italic">
                        ⚠️ AI suggestions are for reference only. Always verify before prescribing.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border/50" />

            {/* ─── Section 1.5: Investigations ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TestTubes className="h-4 w-4 text-primary" />
                Investigations
              </div>
              <FormField
                control={form.control}
                name="investigations"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., CBC, LFT, RFT, ECG, X-ray Chest PA view"
                        className="min-h-[60px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Specialty-suggested investigations */}
              {defaultInvestigations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {defaultInvestigations.map((inv) => (
                    <Badge
                      key={inv}
                      variant="outline"
                      className="cursor-pointer text-xs px-2 py-1 hover:bg-accent transition-colors"
                      onClick={() => {
                        const current = form.getValues("investigations") || "";
                        const items = current.split(",").map(s => s.trim()).filter(Boolean);
                        if (!items.includes(inv)) {
                          form.setValue("investigations", items.length > 0 ? `${current}, ${inv}` : inv);
                        }
                      }}
                    >
                      + {inv}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border/50" />

            {/* ─── Section 2: Quick Actions Bar ─── */}
            <div className="space-y-3">
              {/* Quick-add presets */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3 w-3" />
                  Quick Presets — tap to apply
                </p>
                <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 sm:flex-wrap">
                  {PRESCRIPTION_PRESETS.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer text-xs px-2.5 py-1.5 hover:bg-accent transition-colors gap-1"
                      onClick={() => applyPreset(preset)}
                    >
                      <span>{preset.icon}</span>
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Specialty-suggested medications */}
              {specialtyConfig.commonMedications.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Suggested for {doctorProfile?.specialty || "your specialty"} — tap to add
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialtyConfig.commonMedications.map((med) => (
                      <Badge
                        key={med.name}
                        variant="outline"
                        className="cursor-pointer text-xs px-2.5 py-1 hover:bg-accent transition-colors"
                        onClick={() => {
                          append({
                            name: med.name,
                            dosage: med.dosage,
                            frequency: med.frequency,
                            duration: med.duration,
                            instructions: med.instructions || "",
                          });
                        }}
                      >
                        {med.name}
                        <span className="ml-1 text-muted-foreground">{med.dosage}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Frequent medications */}
              <FrequentMedsBar
                onSelect={(med: FavoriteMedication) => {
                  append({
                    name: med.medication_name,
                    dosage: med.default_dosage || "",
                    frequency: med.default_frequency || "",
                    duration: med.default_duration || "",
                    instructions: med.default_instructions || "",
                  });
                }}
              />
            </div>

            <div className="border-t border-border/50" />

            {/* ─── Section 3: Medications ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Pill className="h-4 w-4 text-primary" />
                  Medications
                  <Badge variant="secondary" className="text-xs ml-1">{fields.length}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Templates
                  </Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => append({ name: "", dosage: "", frequency: "", duration: "", instructions: "" })}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "border rounded-xl p-2.5 sm:p-4 space-y-2 sm:space-y-3 bg-muted/20 transition-all",
                    dragIndex === index && "opacity-50 border-primary border-dashed",
                    "hover:border-border"
                  )}
                >
                  {/* Medication header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                      <span className="text-sm font-medium text-foreground">
                        Rx {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => duplicateMedication(index)} title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {fields.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Row 1: Name + Dosage */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name={`medications.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Drug Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Amoxicillin" {...field} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Dosage</FormLabel>
                          <FormControl>
                            <div className="flex gap-1.5">
                              <Input
                                placeholder="e.g., 500"
                                value={field.value.replace(/[a-zA-Z]+$/, "")}
                                onChange={(e) => {
                                  const unit = field.value.match(/[a-zA-Z]+$/)?.[0] || "";
                                  field.onChange(e.target.value + unit);
                                }}
                                className="h-9 flex-1"
                              />
                              <Select
                                value={field.value.match(/[a-zA-Z]+$/)?.[0] || ""}
                                onValueChange={(unit) => {
                                  const num = field.value.replace(/[a-zA-Z]+$/, "");
                                  field.onChange(num + unit);
                                }}
                              >
                                <SelectTrigger className="h-9 w-16 sm:w-20 text-xs">
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DOSAGE_UNITS.map((u) => (
                                    <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Frequency + Duration (dropdowns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <FormField
                      control={form.control}
                      name={`medications.${index}.frequency`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Frequency</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FREQUENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Duration</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DURATION_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2.5: Timing Pattern Grid (M | N | Nt) */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Dosage Timing (optional)</p>
                    <div className="flex gap-2">
                      <TimingCell
                        label="M"
                        icon={Sun}
                        value={form.watch(`medications.${index}.timingPattern`)?.morning ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, morning: v });
                        }}
                      />
                      <TimingCell
                        label="N"
                        icon={Cloud}
                        value={form.watch(`medications.${index}.timingPattern`)?.noon ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, noon: v });
                        }}
                      />
                      <TimingCell
                        label="Nt"
                        icon={Moon}
                        value={form.watch(`medications.${index}.timingPattern`)?.night ?? 0}
                        onChange={(v) => {
                          const current = form.getValues(`medications.${index}.timingPattern`) || { morning: 0, noon: 0, night: 0 };
                          form.setValue(`medications.${index}.timingPattern`, { ...current, night: v });
                        }}
                      />
                      {form.watch(`medications.${index}.timingPattern`) &&
                        (form.watch(`medications.${index}.timingPattern`)!.morning > 0 ||
                         form.watch(`medications.${index}.timingPattern`)!.noon > 0 ||
                         form.watch(`medications.${index}.timingPattern`)!.night > 0) && (
                        <div className="flex items-center ml-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {form.watch(`medications.${index}.timingPattern`)!.morning}+
                            {form.watch(`medications.${index}.timingPattern`)!.noon}+
                            {form.watch(`medications.${index}.timingPattern`)!.night}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Instructions */}
                  <FormField
                    control={form.control}
                    name={`medications.${index}.instructions`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Special Instructions</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Take after meals with water" {...field} className="h-9" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              {form.formState.errors.medications?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.medications.message}</p>
              )}
            </div>

            {/* Medication Interaction Check */}
            <MedicationInteractionWarning
              medications={form.watch("medications")}
              patientAllergies={patientAllergies}
              currentMedications={currentMedications}
              chronicConditions={chronicConditions}
            />

            <div className="border-t border-border/50" />

            {/* ─── Section 4: Instructions ─── */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    General Instructions
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="General advice for the patient..." className="min-h-[70px] resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ─── Section 4.5: Advice ─── */}
            <FormField
              control={form.control}
              name="advice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Advice (Diet, Lifestyle, Precautions)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Avoid spicy food, regular exercise, adequate rest"
                      className="min-h-[60px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ─── Section 5: Notes & Follow-up (Collapsible) ─── */}
            <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Clinical Notes & Follow-up
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", notesOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Clinical Notes (Private)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes for your reference..." className="min-h-[60px] resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="follow_up_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs">Follow-up Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("w-full pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single" selected={field.value} onSelect={field.onChange}
                            disabled={(date) => date < new Date()} initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Treatment Cost Estimate */}
            <TreatmentCostBreakdown
              consultationFee={doctorFeeData?.consultation_fee}
              medicationCount={form.watch("medications").filter((m) => m.name).length}
              isHospitalContext={!!selectedHospitalId}
            />

            {/* ─── Footer Actions ─── */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-border/50">
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => {
                  const medications = form.getValues("medications");
                  if (medications.some(m => m.name && m.dosage)) setShowSaveTemplate(true);
                }}
                disabled={!form.getValues("medications").some(m => m.name && m.dosage)}
              >
                <Save className="h-4 w-4 mr-1" />
                Save as Template
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPrescription.isPending} className="gap-2">
                  {createPrescription.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Check className="h-4 w-4" />
                  Create Prescription
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <PrescriptionTemplateSelector
          open={showTemplates} onOpenChange={setShowTemplates} onSelectTemplate={handleSelectTemplate}
        />
        <SaveTemplateDialog
          open={showSaveTemplate} onOpenChange={setShowSaveTemplate}
          diagnosis={form.getValues("diagnosis")}
          medications={form.getValues("medications")
            .filter((m): m is { name: string; dosage: string; frequency: string; duration: string; instructions?: string } =>
              Boolean(m.name && m.dosage && m.frequency && m.duration))
            .map(m => ({ ...m, instructions: m.instructions || "" }))}
          instructions={form.getValues("instructions")}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};