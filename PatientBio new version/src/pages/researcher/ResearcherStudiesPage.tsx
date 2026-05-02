import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useResearcherStudies, useStudyMilestones, useAllStudyMilestones } from "@/hooks/useResearcherStudies";
import type { StudyProtocolTemplate, ResearcherStudy } from "@/hooks/useResearcherStudies";
import { StudyCollaboratorManager } from "@/components/researcher/StudyCollaboratorManager";
import { StudyDetailDialog } from "@/components/researcher/StudyDetailDialog";
import { 
  Plus, FlaskConical, Eye, Users, GitCompareArrows, BarChart3, 
  Calendar, Target, CheckCircle2, Circle, Clock, ArrowRight,
  Loader2, ChevronRight, Milestone, Play, Archive, Search,
  AlertCircle, TrendingUp
} from "lucide-react";

const STUDY_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  recruiting: { label: "Recruiting", variant: "default" },
  active: { label: "Active", variant: "default" },
  analysis: { label: "Analysis", variant: "outline" },
  completed: { label: "Completed", variant: "secondary" },
  archived: { label: "Archived", variant: "destructive" },
};

const ICON_MAP: Record<string, React.ElementType> = {
  Eye, FlaskConical, GitCompareArrows, Users, BarChart3,
};

const DISEASE_CATEGORIES = [
  "cardiovascular", "diabetes", "respiratory", "oncology", "neurology",
  "immunology", "infectious_disease", "mental_health", "orthopedic", "dermatology",
];

const STUDY_TYPES = [
  "observational", "clinical_trial", "case_control", "cohort", "cross_sectional",
];

// Template Selection Card
const TemplateCard = ({ template, onSelect }: { template: StudyProtocolTemplate; onSelect: () => void }) => {
  const Icon = ICON_MAP[template.icon_name || "FlaskConical"] || FlaskConical;
  return (
    <Card 
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <Badge variant="outline" className="text-xs">
            {template.default_milestones.length} milestones
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>~{template.estimated_duration_days} days</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            <span>Min {template.min_sample_size} patients</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Create Study Dialog
const CreateStudyDialog = ({ 
  templates, 
  onSubmit, 
  isCreating 
}: { 
  templates: StudyProtocolTemplate[]; 
  onSubmit: (data: Parameters<ReturnType<typeof useResearcherStudies>["createStudy"]>[0]) => Promise<unknown>;
  isCreating: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"template" | "details">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<StudyProtocolTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diseaseCategory, setDiseaseCategory] = useState("");
  const [sampleSize, setSampleSize] = useState("");

  const handleSelectTemplate = (template: StudyProtocolTemplate) => {
    setSelectedTemplate(template);
    setSampleSize(String(template.min_sample_size || ""));
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      template_id: selectedTemplate?.id,
      title: title.trim(),
      study_type: selectedTemplate?.study_type || "observational",
      description: description.trim() || undefined,
      disease_categories: diseaseCategory ? [diseaseCategory] : undefined,
      target_sample_size: sampleSize ? Number(sampleSize) : undefined,
      consent_scopes: selectedTemplate?.default_consent_scopes || [],
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStep("template");
    setSelectedTemplate(null);
    setTitle("");
    setDescription("");
    setDiseaseCategory("");
    setSampleSize("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Study
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "template" ? "Choose a Study Template" : `New ${selectedTemplate?.name || "Study"}`}
          </DialogTitle>
          <DialogDescription>
            {step === "template" 
              ? "Select a protocol template to pre-configure milestones and workflows." 
              : "Customize your study details."}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} onSelect={() => handleSelectTemplate(t)} />
            ))}
            <Card 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-dashed"
              onClick={() => { setSelectedTemplate(null); setStep("details"); }}
            >
              <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Plus className="h-8 w-8 mb-2" />
                <span className="font-medium">Custom Study</span>
                <span className="text-xs">Start from scratch</span>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {selectedTemplate && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="font-medium">{selectedTemplate.name}</div>
                <div className="text-muted-foreground text-xs mt-1">
                  {selectedTemplate.default_milestones.length} milestones • 
                  ~{selectedTemplate.estimated_duration_days} days estimated
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Study Title *</label>
              <Input
                placeholder="e.g., Cardiovascular Risk Factors in Diabetic Patients"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the study objectives and methodology..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Disease Category</label>
                <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISEASE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Sample Size</label>
                <Input
                  type="number"
                  placeholder="e.g., 100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                />
              </div>
            </div>

            {!selectedTemplate && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Study Type</label>
                <Select defaultValue="observational">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observational">Observational</SelectItem>
                    <SelectItem value="clinical_trial">Clinical Trial</SelectItem>
                    <SelectItem value="case_control">Case-Control</SelectItem>
                    <SelectItem value="cohort">Cohort</SelectItem>
                    <SelectItem value="cross_sectional">Cross-Sectional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("template")}>Back</Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || isCreating} className="flex-1">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Study
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Mini progress ring for study cards
const MiniProgressRing = ({ progress }: { progress: number }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative h-9 w-9 flex-shrink-0">
      <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={radius} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
        {progress}
      </span>
    </div>
  );
};

// Study Card (enhanced)
const StudyCard = ({ 
  study, 
  onUpdateStatus,
  onOpenDetail,
}: { 
  study: ResearcherStudy; 
  onUpdateStatus: (studyId: string, status: string) => void;
  onOpenDetail: (study: ResearcherStudy) => void;
}) => {
  const { progress, totalCount, completedCount } = useStudyMilestones(study.id);
  const statusConfig = STUDY_STATUS_CONFIG[study.status] || STUDY_STATUS_CONFIG.draft;

  const nextStatusAction: Record<string, { label: string; status: string } | null> = {
    draft: { label: "Start Recruiting", status: "recruiting" },
    recruiting: { label: "Begin Study", status: "active" },
    active: { label: "Move to Analysis", status: "analysis" },
    analysis: { label: "Mark Complete", status: "completed" },
    completed: { label: "Archive", status: "archived" },
    archived: null,
  };

  const action = nextStatusAction[study.status];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary flex-shrink-0" />
              <button
                onClick={() => onOpenDetail(study)}
                className="truncate text-left hover:text-primary transition-colors hover:underline underline-offset-2"
              >
                {study.title}
              </button>
            </CardTitle>
            <CardDescription className="mt-1">
              {study.study_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              {study.disease_categories?.[0] && ` • ${study.disease_categories[0].replace("_", " ")}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && <MiniProgressRing progress={progress} />}
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {study.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{study.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {study.target_sample_size && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{study.current_sample_size}/{study.target_sample_size}</span>
            </div>
          )}
          {study.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Started {new Date(study.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Milestone className="h-3.5 w-3.5" />
              <span>{completedCount}/{totalCount} milestones</span>
            </div>
          )}
        </div>

        {action && (
          <div className="pt-1 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateStatus(study.id, action.status)}
              className="gap-1.5"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              {action.label}
            </Button>
            <StudyCollaboratorManager studyId={study.id} studyTitle={study.title} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// KPI Stats Row
const StudyKPIs = ({ 
  totalStudies, activeCount, avgProgress, upcomingDeadlines 
}: { 
  totalStudies: number; activeCount: number; avgProgress: number; upcomingDeadlines: number;
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <FlaskConical className="h-4 w-4" />
          <span className="text-xs font-medium">Total Studies</span>
        </div>
        <p className="text-2xl font-bold">{totalStudies}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-medium">Active</span>
        </div>
        <p className="text-2xl font-bold">{activeCount}</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-medium">Avg Progress</span>
        </div>
        <p className="text-2xl font-bold">{avgProgress}%</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Due This Week</span>
        </div>
        <p className="text-2xl font-bold">{upcomingDeadlines}</p>
      </CardContent>
    </Card>
  </div>
);

// Main Page
const ResearcherStudiesPage = () => {
  const { templates, studies, isLoading, createStudy, updateStudy, isCreating } = useResearcherStudies();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailStudy, setDetailStudy] = useState<ResearcherStudy | null>(null);

  const activeStudies = studies.filter((s) => ["draft", "recruiting", "active", "analysis"].includes(s.status));
  const completedStudies = studies.filter((s) => ["completed", "archived"].includes(s.status));

  // Cross-study milestone stats
  const activeStudyIds = useMemo(() => activeStudies.map(s => s.id), [activeStudies]);
  const { data: allMilestones = [] } = useAllStudyMilestones(activeStudyIds);

  const kpiStats = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    // Average progress across active studies
    const studyProgressMap = new Map<string, { completed: number; total: number }>();
    allMilestones.forEach(m => {
      const entry = studyProgressMap.get(m.study_id) || { completed: 0, total: 0 };
      entry.total++;
      if (m.status === "completed") entry.completed++;
      studyProgressMap.set(m.study_id, entry);
    });

    let totalProgress = 0;
    let studiesWithMilestones = 0;
    studyProgressMap.forEach(({ completed, total }) => {
      if (total > 0) {
        totalProgress += Math.round((completed / total) * 100);
        studiesWithMilestones++;
      }
    });

    const avgProgress = studiesWithMilestones > 0 ? Math.round(totalProgress / studiesWithMilestones) : 0;

    const upcomingDeadlines = allMilestones.filter(m => 
      m.status !== "completed" && m.due_date && 
      new Date(m.due_date) >= now && new Date(m.due_date) <= weekFromNow
    ).length;

    return { avgProgress, upcomingDeadlines };
  }, [allMilestones]);

  // Filtering
  const filterStudies = (list: ResearcherStudy[]) => {
    return list.filter(s => {
      if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (diseaseFilter !== "all" && !s.disease_categories?.includes(diseaseFilter)) return false;
      if (typeFilter !== "all" && s.study_type !== typeFilter) return false;
      return true;
    });
  };

  const filteredActive = filterStudies(activeStudies);
  const filteredCompleted = filterStudies(completedStudies);

  const handleUpdateStatus = (studyId: string, status: string) => {
    updateStudy({ studyId, updates: { status } });
  };

  const handleUpdateStudy = (studyId: string, updates: Record<string, unknown>) => {
    updateStudy({ studyId, updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Study Protocols</h1>
          <p className="text-muted-foreground">Manage your research studies with pre-built templates and milestone tracking</p>
        </div>
        <CreateStudyDialog templates={templates} onSubmit={createStudy} isCreating={isCreating} />
      </div>

      {studies.length > 0 && (
        <StudyKPIs
          totalStudies={studies.length}
          activeCount={activeStudies.length}
          avgProgress={kpiStats.avgProgress}
          upcomingDeadlines={kpiStats.upcomingDeadlines}
        />
      )}

      {studies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No studies yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md mt-2">
              Create your first study using a protocol template. Templates include pre-configured milestones, consent scopes, and timelines.
            </p>
            <CreateStudyDialog templates={templates} onSubmit={createStudy} isCreating={isCreating} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search studies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Disease" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DISEASE_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {STUDY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Play className="h-4 w-4" />
                Active
                {filteredActive.length > 0 && <Badge variant="secondary">{filteredActive.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <Archive className="h-4 w-4" />
                Completed
                {filteredCompleted.length > 0 && <Badge variant="outline">{filteredCompleted.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {filteredActive.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {searchQuery || diseaseFilter !== "all" || typeFilter !== "all"
                      ? "No studies match your filters."
                      : "No active studies. Create one to get started."}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredActive.map((s) => (
                    <StudyCard key={s.id} study={s} onUpdateStatus={handleUpdateStatus} onOpenDetail={setDetailStudy} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {filteredCompleted.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {searchQuery || diseaseFilter !== "all" || typeFilter !== "all"
                      ? "No studies match your filters."
                      : "No completed studies yet."}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredCompleted.map((s) => (
                    <StudyCard key={s.id} study={s} onUpdateStatus={handleUpdateStatus} onOpenDetail={setDetailStudy} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {detailStudy && (
        <StudyDetailDialog
          study={detailStudy}
          open={!!detailStudy}
          onOpenChange={(open) => { if (!open) setDetailStudy(null); }}
          onUpdateStudy={handleUpdateStudy}
        />
      )}
    </div>
  );
};

export default ResearcherStudiesPage;
