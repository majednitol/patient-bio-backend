import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { usePagination } from "@/hooks/usePagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  FileText, 
  Loader2, 
  Clock,
  CheckCircle,
  User,
  Heart,
  Eye,
  Search,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PatientDetailDialog } from "@/components/pathologist/PatientDetailDialog";
import { toast } from "@/hooks/use-toast";

interface PatientSummary {
  patientId: string;
  patientName: string | null;
  reportsCount: number;
  sharesCount: number;
  latestActivity: Date;
  diseaseCategories: string[];
  status: "active" | "completed";
  patientViewedCount: number;
  totalSharedWithPatient: number;
}

type SortOption = "latest" | "name" | "reports" | "referrals";
type StatusFilter = "all" | "active" | "completed";

const PathologistPatientsPage = () => {
  const { reports, isLoading: reportsLoading } = usePathologistReports();
  const { receivedShares, isLoading: sharesLoading } = useDoctorPathologistShares();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isLoading = reportsLoading || sharesLoading;

  // Collect all unique patient IDs
  const allPatientIds = useMemo(() => {
    const ids = new Set<string>();
    reports.forEach((r) => ids.add(r.patient_id));
    receivedShares.forEach((s) => ids.add(s.patient_id));
    return Array.from(ids);
  }, [reports, receivedShares]);

  // Batch-resolve patient names from user_profiles
  const { data: patientNames = {} } = useQuery({
    queryKey: ["patient-names", allPatientIds],
    queryFn: async () => {
      if (allPatientIds.length === 0) return {};
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", allPatientIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { if (p.display_name) map[p.user_id] = p.display_name; });
      return map;
    },
    enabled: allPatientIds.length > 0,
  });

  // Aggregate patients from reports and shares
  const patients = useMemo(() => {
    const patientMap = new Map<string, PatientSummary>();

    reports.forEach((report) => {
      const existing = patientMap.get(report.patient_id);
      const activityDate = new Date(report.updated_at);
      const isSharedWithPatient = report.is_shared_with_patient;
      const isViewedByPatient = !!(report as any).patient_viewed_at;
      
      if (existing) {
        existing.reportsCount += 1;
        if (activityDate > existing.latestActivity) {
          existing.latestActivity = activityDate;
        }
        if (report.disease_category && !existing.diseaseCategories.includes(report.disease_category)) {
          existing.diseaseCategories.push(report.disease_category);
        }
        if (isSharedWithPatient) existing.totalSharedWithPatient += 1;
        if (isViewedByPatient) existing.patientViewedCount += 1;
      } else {
        patientMap.set(report.patient_id, {
          patientId: report.patient_id,
          patientName: patientNames[report.patient_id] || null,
          reportsCount: 1,
          sharesCount: 0,
          latestActivity: activityDate,
          diseaseCategories: report.disease_category ? [report.disease_category] : [],
          status: "completed",
          totalSharedWithPatient: isSharedWithPatient ? 1 : 0,
          patientViewedCount: isViewedByPatient ? 1 : 0,
        });
      }
    });

    receivedShares.forEach((share) => {
      const existing = patientMap.get(share.patient_id);
      const activityDate = new Date(share.shared_at);
      const isActive = share.status !== "completed";

      if (existing) {
        existing.sharesCount += 1;
        if (activityDate > existing.latestActivity) {
          existing.latestActivity = activityDate;
        }
        if (share.disease_category && !existing.diseaseCategories.includes(share.disease_category)) {
          existing.diseaseCategories.push(share.disease_category);
        }
        if (isActive) {
          existing.status = "active";
        }
      } else {
        patientMap.set(share.patient_id, {
          patientId: share.patient_id,
          patientName: patientNames[share.patient_id] || null,
          reportsCount: 0,
          sharesCount: 1,
          latestActivity: activityDate,
          diseaseCategories: share.disease_category ? [share.disease_category] : [],
          status: isActive ? "active" : "completed",
          totalSharedWithPatient: 0,
          patientViewedCount: 0,
        });
      }
    });

    return Array.from(patientMap.values());
  }, [reports, receivedShares, patientNames]);

  // Filter by status
  const statusFiltered = useMemo(() => {
    if (statusFilter === "all") return patients;
    return patients.filter((p) => p.status === statusFilter);
  }, [patients, statusFilter]);

  // Filter by search
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return statusFiltered;
    const q = searchQuery.toLowerCase();
    return statusFiltered.filter((p) =>
      (p.patientName && p.patientName.toLowerCase().includes(q)) ||
      p.patientId.toLowerCase().includes(q) ||
      p.diseaseCategories.some((cat) => cat.toLowerCase().includes(q))
    );
  }, [statusFiltered, searchQuery]);

  // Sort
  const sortedPatients = useMemo(() => {
    const sorted = [...searchFiltered];
    switch (sortBy) {
      case "latest":
        return sorted.sort((a, b) => b.latestActivity.getTime() - a.latestActivity.getTime());
      case "name":
        return sorted.sort((a, b) => (a.patientName || "").localeCompare(b.patientName || ""));
      case "reports":
        return sorted.sort((a, b) => b.reportsCount - a.reportsCount);
      case "referrals":
        return sorted.sort((a, b) => b.sharesCount - a.sharesCount);
      default:
        return sorted;
    }
  }, [searchFiltered, sortBy]);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: sortedPatients, itemsPerPage: 20 });

  const activeCount = patients.filter((p) => p.status === "active").length;
  const completedCount = patients.filter((p) => p.status === "completed").length;

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (sortedPatients.length === 0) return;
    const headers = ["Name", "Reports", "Referrals", "Categories", "Status", "Last Activity"];
    const rows = sortedPatients.map((p) => [
      p.patientName || "Unknown",
      p.reportsCount.toString(),
      p.sharesCount.toString(),
      p.diseaseCategories.join("; "),
      p.status,
      p.latestActivity.toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patients-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${sortedPatients.length} patients to CSV` });
  }, [sortedPatients]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--diagnostic-primary))]" />
        <p className="text-sm text-muted-foreground">Loading patients...</p>
      </div>
    );
  }

  // Get reports and shares for selected patient
  const selectedPatientReports = selectedPatient
    ? reports.filter((r) => r.patient_id === selectedPatient.patientId)
    : [];
  const selectedPatientShares = selectedPatient
    ? receivedShares.filter((s) => s.patient_id === selectedPatient.patientId)
    : [];

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            My Patients{patients.length > 0 && ` (${patients.length})`}
          </h1>
          <p className="text-muted-foreground">
            Every patient you've helped through diagnostic analysis
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={sortedPatients.length === 0}
          className="border-[hsl(var(--diagnostic-primary)/0.3)] hover:bg-[hsl(var(--diagnostic-primary)/0.05)] self-start sm:self-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="diagnostic-stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-primary)/0.1)]">
              <Users className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Patients</p>
              <p className="text-2xl font-bold">{patients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Cases</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-accent)/0.1)]">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--diagnostic-accent))]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters: Status tabs + Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All ({patients.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[170px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Last Activity</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="reports">Most Reports</SelectItem>
              <SelectItem value="referrals">Most Referrals</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patient list */}
      {paginatedData.length === 0 ? (
        <Card className="diagnostic-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--diagnostic-primary)/0.1)] flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-[hsl(var(--diagnostic-primary)/0.4)]" />
            </div>
            <h3 className="font-medium text-lg">
              {searchQuery || statusFilter !== "all" ? "No matching patients" : "No Patients Yet"}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Patients will appear here when you receive referrals from doctors or create diagnostic reports."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="diagnostic-card">
          <CardContent className="p-0">
            <div className="divide-y">
              {paginatedData.map((patient) => (
                <PatientCard
                  key={patient.patientId}
                  patient={patient}
                  onClick={() => setSelectedPatient(patient)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} · {sortedPatients.length} patients
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={!hasPrevPage}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasNextPage}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {selectedPatient && (
        <PatientDetailDialog
          open={!!selectedPatient}
          onOpenChange={(open) => !open && setSelectedPatient(null)}
          patientId={selectedPatient.patientId}
          patientName={selectedPatient.patientName}
          reports={selectedPatientReports}
          shares={selectedPatientShares}
          diseaseCategories={selectedPatient.diseaseCategories}
          status={selectedPatient.status}
        />
      )}
    </div>
  );
};

const PatientCard = ({ patient, onClick }: { patient: PatientSummary; onClick: () => void }) => (
  <div
    className="flex items-center justify-between p-4 hover:bg-[hsl(var(--diagnostic-primary)/0.03)] transition-all cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="p-2.5 rounded-full bg-muted">
        <User className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <h4 className="font-medium text-sm">
          {patient.patientName || "Unknown Patient"}
        </h4>
        <p className="text-xs text-muted-foreground font-mono">
          ID: {patient.patientId.slice(0, 8)}...
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {patient.reportsCount > 0 && (
            <Badge variant="outline" className="text-xs border-[hsl(var(--diagnostic-primary)/0.3)] text-[hsl(var(--diagnostic-primary))]">
              <FileText className="h-3 w-3 mr-1" />
              {patient.reportsCount} report{patient.reportsCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {patient.sharesCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {patient.sharesCount} referral{patient.sharesCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {patient.totalSharedWithPatient > 0 && (
            <Badge variant="outline" className={`text-xs ${
              patient.patientViewedCount === patient.totalSharedWithPatient
                ? "border-[hsl(var(--diagnostic-accent)/0.3)] text-[hsl(var(--diagnostic-accent))]"
                : "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
            }`}>
              <Eye className="h-3 w-3 mr-1" />
              {patient.patientViewedCount}/{patient.totalSharedWithPatient} viewed
            </Badge>
          )}
          {patient.diseaseCategories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="outline" className="text-xs uppercase">
              {cat.replace("_", " ")}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last activity: {formatDistanceToNow(patient.latestActivity, { addSuffix: true })}
        </p>
      </div>
    </div>
    <Badge 
      className={
        patient.status === "active" 
          ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" 
          : "bg-[hsl(var(--diagnostic-accent)/0.15)] text-[hsl(var(--diagnostic-accent))] hover:bg-[hsl(var(--diagnostic-accent)/0.15)]"
      }
    >
      {patient.status === "active" ? (
        <><Clock className="h-3 w-3 mr-1" />Active</>
      ) : (
        <><CheckCircle className="h-3 w-3 mr-1" />Completed</>
      )}
    </Badge>
  </div>
);

export default PathologistPatientsPage;
