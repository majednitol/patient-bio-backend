import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useResearcherSavedCohorts } from "@/hooks/useResearcherSavedCohorts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Filter,
  Download,
  Search,
  X,
  FlaskConical,
  FileDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const diseaseCategories = [
  { value: "general", label: "General" },
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "other", label: "Other" },
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface CohortFilters {
  diseaseCategories: string[];
  bloodGroups: string[];
  ageRange: [number, number];
  hasAllergies: boolean | null;
  hasChronicDiseases: boolean | null;
  hasMedications: boolean | null;
  searchQuery: string;
  icd10Prefix: string;
  treatmentType: string;
  hasAbnormalLabs: boolean | null;
  comorbidityCount: string;
}

interface CohortPatient {
  patient_id: string;
  disease_category: string;
  shared_at: string;
  is_anonymized: boolean;
}

const CohortBuilderPage = () => {
  const { user } = useAuth();
  const { cohorts, saveCohort, deleteCohort, isSaving } = useResearcherSavedCohorts();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [cohortName, setCohortName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [filters, setFilters] = useState<CohortFilters>({
    diseaseCategories: [],
    bloodGroups: [],
    ageRange: [0, 100],
    hasAllergies: null,
    hasChronicDiseases: null,
    hasMedications: null,
    searchQuery: "",
    icd10Prefix: "",
    treatmentType: "",
    hasAbnormalLabs: null,
    comorbidityCount: "any",
  });

  const debouncedFilters = useDebounce(filters, 300);

  const handleSaveCohort = () => {
    if (!cohortName.trim()) return;
    saveCohort({ name: cohortName.trim(), filters: filters as unknown as Record<string, unknown> });
    setCohortName("");
    setShowSaveInput(false);
  };

  const handleLoadCohort = (savedFilters: Record<string, unknown>) => {
    setFilters({
      diseaseCategories: (savedFilters.diseaseCategories as string[]) || [],
      bloodGroups: (savedFilters.bloodGroups as string[]) || [],
      ageRange: (savedFilters.ageRange as [number, number]) || [0, 100],
      hasAllergies: (savedFilters.hasAllergies as boolean | null) ?? null,
      hasChronicDiseases: (savedFilters.hasChronicDiseases as boolean | null) ?? null,
      hasMedications: (savedFilters.hasMedications as boolean | null) ?? null,
      searchQuery: (savedFilters.searchQuery as string) || "",
      icd10Prefix: (savedFilters.icd10Prefix as string) || "",
      treatmentType: (savedFilters.treatmentType as string) || "",
      hasAbnormalLabs: (savedFilters.hasAbnormalLabs as boolean | null) ?? null,
      comorbidityCount: (savedFilters.comorbidityCount as string) || "any",
    });
  };

  // Fetch approved research shares with patient data
  const { data: cohortData = [], isLoading, refetch } = useQuery({
    queryKey: ["research-cohort", user?.id, debouncedFilters],
    queryFn: async (): Promise<CohortPatient[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("patient_researcher_shares")
        .select("patient_id, disease_category, shared_at, is_anonymized")
        .eq("researcher_id", user.id)
        .in("status", ["pending", "viewed", "completed"]);

      // Apply disease category filter
      if (debouncedFilters.diseaseCategories.length > 0) {
        query = query.in("disease_category", debouncedFilters.diseaseCategories);
      }

      const { data, error } = await query.order("shared_at", { ascending: false });

      if (error) {
        console.error("Error fetching cohort data:", error);
        return [];
      }

      let results: CohortPatient[] = data || [];

      // Apply clinical filters via edge function if any clinical filter is active
      const hasClinicalFilters =
        debouncedFilters.icd10Prefix.trim() ||
        debouncedFilters.treatmentType.trim() ||
        debouncedFilters.hasAbnormalLabs === true ||
        debouncedFilters.comorbidityCount !== "any";

      if (hasClinicalFilters && results.length > 0) {
        try {
          const { data: filterData, error: filterError } = await supabase.functions.invoke(
            "filter-cohort-clinical",
            {
              body: {
                icd10Prefix: debouncedFilters.icd10Prefix.trim() || null,
                treatmentType: debouncedFilters.treatmentType.trim() || null,
                hasAbnormalLabs: debouncedFilters.hasAbnormalLabs,
                comorbidityCount: debouncedFilters.comorbidityCount,
              },
            }
          );

          if (!filterError && filterData?.matchingPatientIds) {
            const matchSet = new Set(filterData.matchingPatientIds as string[]);
            results = results.filter((r) => matchSet.has(r.patient_id));
          }
        } catch (err) {
          console.error("Clinical filter error:", err);
        }
      }

      return results;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get unique disease categories in current cohort
  const diseaseCounts = cohortData.reduce((acc, p) => {
    const cat = p.disease_category || "general";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleDiseaseCategory = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      diseaseCategories: prev.diseaseCategories.includes(category)
        ? prev.diseaseCategories.filter((c) => c !== category)
        : [...prev.diseaseCategories, category],
    }));
  };

  const toggleBloodGroup = (group: string) => {
    setFilters((prev) => ({
      ...prev,
      bloodGroups: prev.bloodGroups.includes(group)
        ? prev.bloodGroups.filter((g) => g !== group)
        : [...prev.bloodGroups, group],
    }));
  };

  const clearFilters = () => {
    setFilters({
      diseaseCategories: [],
      bloodGroups: [],
      ageRange: [0, 100],
      hasAllergies: null,
      hasChronicDiseases: null,
      hasMedications: null,
      searchQuery: "",
      icd10Prefix: "",
      treatmentType: "",
      hasAbnormalLabs: null,
      comorbidityCount: "any",
    });
  };

  const hasActiveFilters =
    filters.diseaseCategories.length > 0 ||
    filters.bloodGroups.length > 0 ||
    filters.hasAllergies !== null ||
    filters.hasChronicDiseases !== null ||
    filters.hasMedications !== null ||
    filters.hasAbnormalLabs !== null ||
    filters.icd10Prefix.length > 0 ||
    filters.treatmentType.length > 0 ||
    filters.comorbidityCount !== "any" ||
    filters.searchQuery.length > 0;

  const exportCohortCSV = () => {
    if (cohortData.length === 0) {
      toast({
        title: "No data to export",
        description: "Apply filters to build your cohort first",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Patient ID", "Disease Category", "Shared Date", "Anonymized"];
    const rows = cohortData.map((p) => [
      p.is_anonymized ? `ANON-${p.patient_id.substring(0, 8)}` : p.patient_id,
      p.disease_category || "general",
      new Date(p.shared_at).toISOString().split("T")[0],
      p.is_anonymized ? "Yes" : "No",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-cohort-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${cohortData.length} patient records`,
    });
  };

  const exportCohortJSON = () => {
    if (cohortData.length === 0) {
      toast({
        title: "No data to export",
        description: "Apply filters to build your cohort first",
        variant: "destructive",
      });
      return;
    }

    const exportData = cohortData.map((p) => ({
      patientId: p.is_anonymized ? `ANON-${p.patient_id.substring(0, 8)}` : p.patient_id,
      diseaseCategory: p.disease_category || "general",
      sharedAt: p.shared_at,
      isAnonymized: p.is_anonymized,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-cohort-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${cohortData.length} patient records as JSON`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-primary" />
            Cohort Builder
          </h1>
          <p className="text-muted-foreground">
            Build and filter research participant cohorts from approved patient data
          </p>
        </div>
        <div className="flex gap-2">
          {/* Load saved cohort */}
          {cohorts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Load Cohort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {cohorts.map((c) => (
                  <DropdownMenuItem key={c.id} className="flex items-center justify-between">
                    <span className="truncate flex-1 cursor-pointer" onClick={() => handleLoadCohort(c.filters)}>
                      {c.name}
                    </span>
                    <Trash2
                      className="h-3.5 w-3.5 text-destructive ml-2 cursor-pointer flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteCohort(c.id); }}
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Save current cohort */}
          {showSaveInput ? (
            <div className="flex gap-1">
              <Input
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                placeholder="Cohort name..."
                className="w-40 h-9"
                onKeyDown={(e) => e.key === "Enter" && handleSaveCohort()}
              />
              <Button size="sm" onClick={handleSaveCohort} disabled={isSaving || !cohortName.trim()}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowSaveInput(true)}>
              <Save className="h-4 w-4 mr-2" />
              Save Cohort
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <Card className="lg:col-span-1">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-fit"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients..."
                      value={filters.searchQuery}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <Separator />

                {/* Disease Categories */}
                <div className="space-y-3">
                  <Label>Disease Categories</Label>
                  <div className="space-y-2">
                    {diseaseCategories.map((cat) => (
                      <div key={cat.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat.value}`}
                          checked={filters.diseaseCategories.includes(cat.value)}
                          onCheckedChange={() => toggleDiseaseCategory(cat.value)}
                        />
                        <label
                          htmlFor={`cat-${cat.value}`}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {cat.label}
                        </label>
                        {diseaseCounts[cat.value] && (
                          <Badge variant="secondary" className="text-xs">
                            {diseaseCounts[cat.value]}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Blood Groups */}
                <div className="space-y-3">
                  <Label>Blood Groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {bloodGroups.map((group) => (
                      <Badge
                        key={group}
                        variant={filters.bloodGroups.includes(group) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleBloodGroup(group)}
                      >
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Health Conditions */}
                <div className="space-y-3">
                  <Label>Health Conditions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="has-allergies"
                        checked={filters.hasAllergies === true}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            hasAllergies: checked ? true : null,
                          }))
                        }
                      />
                      <label htmlFor="has-allergies" className="text-sm cursor-pointer">
                        Has Allergies
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="has-chronic"
                        checked={filters.hasChronicDiseases === true}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            hasChronicDiseases: checked ? true : null,
                          }))
                        }
                      />
                      <label htmlFor="has-chronic" className="text-sm cursor-pointer">
                        Has Chronic Diseases
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="has-meds"
                        checked={filters.hasMedications === true}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            hasMedications: checked ? true : null,
                          }))
                        }
                      />
                      <label htmlFor="has-meds" className="text-sm cursor-pointer">
                        On Medications
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Age Range */}
                <div className="space-y-3">
                  <Label>Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}</Label>
                  <Slider
                    value={filters.ageRange}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        ageRange: value as [number, number],
                      }))
                    }
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <Separator />

                {/* Clinical Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Clinical Filters</Label>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">ICD-10 Code Prefix</label>
                      <Input
                        placeholder="e.g. E11, C34..."
                        value={filters.icd10Prefix}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, icd10Prefix: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Treatment Type</label>
                      <Select
                        value={filters.treatmentType || "any"}
                        onValueChange={(v) =>
                          setFilters((prev) => ({ ...prev, treatmentType: v === "any" ? "" : v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="chemotherapy">Chemotherapy</SelectItem>
                          <SelectItem value="immunotherapy">Immunotherapy</SelectItem>
                          <SelectItem value="surgery">Surgery</SelectItem>
                          <SelectItem value="radiation">Radiation</SelectItem>
                          <SelectItem value="dialysis">Dialysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Comorbidity Count</label>
                      <Select
                        value={filters.comorbidityCount}
                        onValueChange={(v) =>
                          setFilters((prev) => ({ ...prev, comorbidityCount: v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="0">None (0)</SelectItem>
                          <SelectItem value="1-2">1–2</SelectItem>
                          <SelectItem value="3+">3+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="has-abnormal-labs"
                        checked={filters.hasAbnormalLabs === true}
                        onCheckedChange={(checked) =>
                          setFilters((prev) => ({
                            ...prev,
                            hasAbnormalLabs: checked ? true : null,
                          }))
                        }
                      />
                      <label htmlFor="has-abnormal-labs" className="text-sm cursor-pointer">
                        Has Abnormal Labs
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Summary Card */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{cohortData.length}</span>
                    <span className="text-muted-foreground">patients in cohort</span>
                  </div>
                  {Object.entries(diseaseCounts).length > 0 && (
                    <div className="flex gap-2">
                      {Object.entries(diseaseCounts)
                        .slice(0, 3)
                        .map(([cat, count]) => (
                          <Badge key={cat} variant="secondary">
                            {cat}: {count}
                          </Badge>
                        ))}
                      {Object.entries(diseaseCounts).length > 3 && (
                        <Badge variant="outline">
                          +{Object.entries(diseaseCounts).length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportCohortCSV} disabled={cohortData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" onClick={exportCohortJSON} disabled={cohortData.length === 0}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient List */}
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : cohortData.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No patients in cohort</h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mt-2">
                  When patients approve your data requests, they will appear here. Use the filters to
                  refine your cohort based on disease category, demographics, and health conditions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Patient Records</CardTitle>
                <CardDescription>
                  Anonymized patient data from approved research shares
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {cohortData.map((patient, index) => (
                    <div
                      key={`${patient.patient_id}-${index}`}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.is_anonymized
                              ? `ANON-${patient.patient_id.substring(0, 8).toUpperCase()}`
                              : `Patient ${patient.patient_id.substring(0, 8).toUpperCase()}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Shared on {new Date(patient.shared_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {(patient.disease_category || "general").replace("_", " ")}
                        </Badge>
                        {patient.is_anonymized && (
                          <Badge variant="outline">Anonymized</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CohortBuilderPage;
