import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Prescription, usePatientPrescriptions } from "@/hooks/usePrescriptions";
import { PatientPrescriptionViewDialog } from "./PatientPrescriptionViewDialog";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText, Pill, Calendar, Stethoscope, User, Search, X, Flag,
  CheckCircle2, ChevronDown, ChevronUp, Clock, Download, AlertTriangle, Eye,
} from "lucide-react";
import { PrescriptionCostBadge } from "./PrescriptionCostBadge";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { prescriptionHasAntibiotic, getPrescriptionComplications } from "@/utils/prescriptionFlags";

const DIAGNOSIS_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart", label: "Heart/Cardiac" },
  { value: "respiratory", label: "Respiratory" },
  { value: "infection", label: "Infection" },
  { value: "pain", label: "Pain Management" },
  { value: "other", label: "Other" },
];

interface DigitalPrescriptionsSectionProps {
  searchQuery?: string;
}

export const DigitalPrescriptionsSection = ({ searchQuery: externalSearchQuery }: DigitalPrescriptionsSectionProps) => {
  const { data: prescriptions = [], isLoading } = usePatientPrescriptions();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchQuery = externalSearchQuery || localSearchQuery;

  const categorize = (diagnosis: string | null): string => {
    if (!diagnosis) return "other";
    const d = diagnosis.toLowerCase();
    if (d.includes("diabet") || d.includes("glucose") || d.includes("insulin")) return "diabetes";
    if (d.includes("heart") || d.includes("cardiac") || d.includes("hypertension") || d.includes("blood pressure")) return "heart";
    if (d.includes("asthma") || d.includes("bronch") || d.includes("lung") || d.includes("respiratory") || d.includes("pneumo")) return "respiratory";
    if (d.includes("infect") || d.includes("fever") || d.includes("viral") || d.includes("bacterial")) return "infection";
    if (d.includes("pain") || d.includes("ache") || d.includes("arthrit")) return "pain";
    return "other";
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "completed" && p.is_active) return false;
      if (categoryFilter !== "all" && categorize(p.diagnosis) !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDiagnosis = p.diagnosis?.toLowerCase().includes(query);
        const matchesDoctor = p.doctor_name?.toLowerCase().includes(query);
        const matchesMedication = p.medications.some((m) => m.name.toLowerCase().includes(query));
        if (!matchesDiagnosis && !matchesDoctor && !matchesMedication) return false;
      }
      return true;
    });
  }, [prescriptions, statusFilter, categoryFilter, searchQuery]);

  const activeCount = prescriptions.filter((p) => p.is_active).length;
  const completedCount = prescriptions.filter((p) => !p.is_active).length;
  const needsAttentionCount = prescriptions.filter((p) => getPrescriptionComplications(p).length > 0).length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prescriptions.length };
    prescriptions.forEach((p) => {
      const cat = categorize(p.diagnosis);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [prescriptions]);

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setViewDialogOpen(true);
  };

  // Unified mobile filter combining status + category
  const mobileFilters = useMemo(() => {
    const filters = [
      { value: "all", label: "All", count: prescriptions.length },
      { value: "active", label: "Active", count: activeCount },
      { value: "completed", label: "Completed", count: completedCount },
      ...DIAGNOSIS_CATEGORIES.filter(c => c.value !== "all").map(c => ({
        value: `cat_${c.value}`,
        label: c.label,
        count: categoryCounts[c.value] || 0,
      })),
    ];
    return filters;
  }, [prescriptions.length, activeCount, completedCount, categoryCounts]);

  const activeMobileFilter = statusFilter !== "all" ? statusFilter : categoryFilter !== "all" ? `cat_${categoryFilter}` : "all";

  const handleMobileFilter = (value: string) => {
    if (value === "all") {
      setStatusFilter("all");
      setCategoryFilter("all");
    } else if (value === "active" || value === "completed") {
      setStatusFilter(value);
      setCategoryFilter("all");
    } else if (value.startsWith("cat_")) {
      setStatusFilter("all");
      setCategoryFilter(value.replace("cat_", ""));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (prescriptions.length === 0) return null;

  return (
    <>
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-2.5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-primary shrink-0" />
              Digital Prescriptions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} from your healthcare providers
            </p>
          </div>
          <Badge variant="secondary" className="text-xs sm:hidden shrink-0">{prescriptions.length}</Badge>
        </div>
      </div>

      {/* Mobile Compact Stats - inline colored dot pills */}
      <div className="flex sm:hidden gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
        {[
          { label: "Total", value: prescriptions.length, dotColor: "bg-primary" },
          { label: "Active", value: activeCount, dotColor: "bg-green-500" },
          { label: "Done", value: completedCount, dotColor: "bg-muted-foreground" },
          { label: "Atte…", value: needsAttentionCount, dotColor: "bg-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 shrink-0 bg-card">
            <span className={`h-2 w-2 rounded-full ${stat.dotColor} shrink-0`} />
            <span className="text-xs font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Desktop Stats Row */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{prescriptions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-100">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Active</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-muted bg-gradient-to-br from-muted/30 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-muted">
              <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Completed</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-destructive/10">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Needs Attention</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{needsAttentionCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {!externalSearchQuery && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by diagnosis, doctor, medication..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 pr-10 text-sm h-9 sm:h-10"
          />
          {localSearchQuery && (
            <button
              onClick={() => setLocalSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile: Segmented control filter */}
      <div className="sm:hidden">
        <div className="flex overflow-x-auto hide-scrollbar rounded-xl bg-muted/40 p-1 gap-0.5 scroll-fade-right">
          {mobileFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleMobileFilter(f.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 touch-target ${
                activeMobileFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}{f.count > 0 ? ` ${f.count}` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Status tabs + Category filters */}
      <div className="hidden sm:flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="text-xs h-8 px-3 capitalize"
            >
              {status === "all" ? "All" : status} {status === "active" ? `(${activeCount})` : status === "completed" ? `(${completedCount})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop: Category Filter */}
      <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2">
        {DIAGNOSIS_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={categoryFilter === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(cat.value)}
            className="text-xs h-7 sm:h-8 px-2 sm:px-3"
          >
            {cat.label}
            {(categoryCounts[cat.value] || 0) > 0 && (
              <span className="ml-1 bg-background/20 text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full">
                {categoryCounts[cat.value]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Collapsible List */}
      {filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">No prescriptions found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery || categoryFilter !== "all"
                ? "No prescriptions match your search criteria"
                : `No ${statusFilter !== "all" ? statusFilter : ""} prescriptions found`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredPrescriptions.map((prescription) => {
            const isExpanded = expandedId === prescription.id;
            const complications = getPrescriptionComplications(prescription);
            const hasAntibiotic = prescriptionHasAntibiotic(prescription.medications);

            return (
              <Collapsible
                key={prescription.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : prescription.id)}
              >
                <Card className="rounded-xl hover:shadow-md transition-all duration-200">
                  <CardContent className="p-2.5 sm:p-4">
                    {/* Header: icon + title + expand only on mobile */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10 flex-shrink-0">
                        <Pill className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base truncate">
                          {formatDoctorName(prescription.doctor_name)} — {prescription.diagnosis || "General"}
                        </h4>
                      </div>
                      {/* Desktop action buttons */}
                      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPrescription(prescription);
                          }}
                          title="View full details"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      {/* Mobile: only expand chevron */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="sm:hidden h-7 w-7 p-0 flex-shrink-0">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                      <Badge
                        variant={prescription.is_active ? "default" : "secondary"}
                        className="text-[10px] sm:text-xs"
                      >
                        {prescription.is_active ? "Active" : "Completed"}
                      </Badge>
                      {hasAntibiotic && (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 hover:bg-amber-500/20 text-[10px] sm:text-xs">
                          Antibiotic
                        </Badge>
                      )}
                      {complications.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs gap-1">
                          <Flag className="h-3 w-3" />
                          {complications.length} issue{complications.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] sm:text-xs capitalize">
                        {categorize(prescription.diagnosis).replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Medication summary preview */}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">
                      {prescription.medications.map((m) => `${m.name} (${m.dosage})`).join(", ")}
                    </p>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                      {prescription.doctor_specialty && (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" />
                          {prescription.doctor_specialty}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Pill className="h-3 w-3" />
                        {prescription.medications.length} med{prescription.medications.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(prescription.created_at), "MMM d, yyyy")}
                        <span className="text-muted-foreground/60 hidden sm:inline">
                          ({formatDistanceToNow(new Date(prescription.created_at), { addSuffix: true })})
                        </span>
                      </span>
                    </div>

                    {/* Expanded Detail */}
                    <CollapsibleContent>
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 space-y-3 sm:space-y-4">
                        {/* Mobile action buttons - full width */}
                        <div className="flex sm:hidden gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 text-xs gap-1.5"
                            onClick={() => handleViewPrescription(prescription)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 text-xs gap-1.5"
                            onClick={() => handleViewPrescription(prescription)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </div>

                        {/* Full medication list */}
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-2">Medications</p>
                          <div className="space-y-2">
                            {prescription.medications.map((med, idx) => (
                              <div key={idx} className="bg-muted/30 rounded-lg p-2.5 sm:p-3 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{med.name}</span>
                                  <Badge variant="outline" className="text-[10px]">{med.dosage}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                  <p>Frequency: {med.frequency}</p>
                                  <p>Duration: {med.duration}</p>
                                  {med.instructions && <p>Instructions: {med.instructions}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cost estimate */}
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Cost Estimate</p>
                          <PrescriptionCostBadge medications={prescription.medications} />
                        </div>

                        {/* Complication flags */}
                        {complications.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">Attention Items</p>
                            <div className="space-y-1.5">
                              {complications.map((c, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 ${
                                    c.severity === "error"
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                  }`}
                                >
                                  <Flag className="h-3 w-3 shrink-0" />
                                  {c.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detail metadata grid - stacked on mobile */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Doctor</p>
                            <p className="text-sm font-medium">{formatDoctorName(prescription.doctor_name)}</p>
                          </div>
                          {prescription.doctor_specialty && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Specialty</p>
                              <p className="text-sm font-medium">{prescription.doctor_specialty}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Date</p>
                            <p className="text-sm font-medium">
                              {format(new Date(prescription.created_at), "MMMM d, yyyy")}
                            </p>
                          </div>
                          {prescription.follow_up_date && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Follow-up</p>
                              <p className="text-sm font-medium">
                                {format(new Date(prescription.follow_up_date), "MMMM d, yyyy")}
                              </p>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full hidden sm:flex"
                          onClick={() => handleViewPrescription(prescription)}
                        >
                          View Full Prescription
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      <PatientPrescriptionViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        prescription={selectedPrescription}
      />
    </>
  );
};
