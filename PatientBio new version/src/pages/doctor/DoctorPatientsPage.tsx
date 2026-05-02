import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorPatients, useGrantPatientAccess, useLookupPatientByCode } from "@/hooks/useDoctorPatients";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Pill,
  Filter,
  X,
  Microscope,
  MoreVertical,
  Clock,
  Shield,
  Eye,
  Activity,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  QrCode,
  CheckSquare,
} from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatePrescriptionDialog } from "@/components/doctor/CreatePrescriptionDialog";
import { DoctorPatientDetailsDialog } from "@/components/doctor/DoctorPatientDetailsDialog";
import { ReferToPathologistDialog } from "@/components/doctor/ReferToPathologistDialog";
import { PatientRiskIndicator } from "@/components/doctor/PatientRiskIndicator";
import { PatientHoverPreview } from "@/components/doctor/PatientHoverPreview";
import { NeedsAttentionSection } from "@/components/doctor/NeedsAttentionSection";
import { exportPatientsCsv } from "@/lib/exportPatientsCsv";
import { useIsDesktop, useIsTablet } from "@/hooks/useMediaQuery";
import { format, subDays, isAfter, formatDistanceToNow } from "date-fns";

type StatusFilter = "all" | "active" | "inactive";
type DateFilter = "all" | "7days" | "30days" | "90days";
type SortField = "name" | "connected" | "last_viewed";
type SortDir = "asc" | "desc";

const RECENTLY_VIEWED_KEY = "doctor_recently_viewed_patients";
const SORT_PREF_KEY = "doctor_patients_sort";
const MAX_RECENT = 3;

const getRecentlyViewed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]");
  } catch { return []; }
};

const addToRecentlyViewed = (patientId: string) => {
  const recent = getRecentlyViewed().filter(id => id !== patientId);
  recent.unshift(patientId);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const getSavedSort = (): { field: SortField; dir: SortDir } => {
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_PREF_KEY) || "null");
    if (saved?.field && saved?.dir) return saved;
  } catch {}
  return { field: "connected", dir: "desc" };
};

const DoctorPatientsPage = () => {
  const isDesktop = useIsDesktop();
  const isTablet = useIsTablet();
  const { user } = useAuth();
  const { effectiveDoctorId } = useStaffAccess();
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: patients, isLoading } = useDoctorPatients(effectiveDoctorId || undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [patientCode, setPatientCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(getRecentlyViewed());
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>(getSavedSort().field);
  const [sortDir, setSortDir] = useState<SortDir>(getSavedSort().dir);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // QR scanner state
  const [qrScanMode, setQrScanMode] = useState(false);
  const qrScannerRef = useRef<HTMLDivElement>(null);
  const qrInstanceRef = useRef<any>(null);

  const lookupPatient = useLookupPatientByCode();
  const grantAccess = useGrantPatientAccess();

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem(SORT_PREF_KEY, JSON.stringify({ field: sortField, dir: sortDir }));
  }, [sortField, sortDir]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return field;
    });
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleViewPatient = useCallback((patient: any) => {
    setSelectedPatient(patient);
    setDetailsDialogOpen(true);
    addToRecentlyViewed(patient.patient_id);
    setRecentIds(getRecentlyViewed());
  }, []);

  const recentlyViewedPatients = useMemo(() => {
    if (!patients || recentIds.length === 0) return [];
    return recentIds
      .map(id => patients.find((p: any) => p.patient_id === id))
      .filter(Boolean);
  }, [patients, recentIds]);

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    let result = patients.filter((patient: any) => {
      const matchesSearch = patient.display_name?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && patient.is_active) ||
        (statusFilter === "inactive" && !patient.is_active);
      let matchesDate = true;
      if (dateFilter !== "all" && patient.granted_at) {
        const grantedDate = new Date(patient.granted_at);
        const daysAgo = dateFilter === "7days" ? 7 : dateFilter === "30days" ? 30 : 90;
        const cutoffDate = subDays(new Date(), daysAgo);
        matchesDate = isAfter(grantedDate, cutoffDate);
      }
      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort
    result = [...result].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = (a.display_name || "").localeCompare(b.display_name || "");
      } else if (sortField === "connected") {
        cmp = new Date(a.granted_at || 0).getTime() - new Date(b.granted_at || 0).getTime();
      } else if (sortField === "last_viewed") {
        cmp = new Date(a.last_accessed_at || 0).getTime() - new Date(b.last_accessed_at || 0).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [patients, debouncedSearch, statusFilter, dateFilter, sortField, sortDir]);

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
  };

  // Bulk selection helpers
  const toggleSelection = (patientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPatients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatients.map((p: any) => p.patient_id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selected = filteredPatients.filter((p: any) => selectedIds.has(p.patient_id));
    exportPatientsCsv(selected, "selected-patients.csv");
    toast.success(`Exported ${selected.length} patients`);
    exitSelectionMode();
  };

  // QR scanner
  useEffect(() => {
    if (!qrScanMode || !qrScannerRef.current) return;
    let scanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("qr-reader");
        qrInstanceRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText: string) => {
            setPatientCode(decodedText.toUpperCase().substring(0, 8));
            setQrScanMode(false);
            scanner?.stop().catch(() => {});
          },
          () => {}
        );
      } catch {
        toast.error("Camera access denied or unavailable");
        setQrScanMode(false);
      }
    };
    startScanner();

    return () => {
      scanner?.stop().catch(() => {});
      qrInstanceRef.current = null;
    };
  }, [qrScanMode]);

  const handleLookup = async () => {
    if (patientCode.length < 8) {
      toast.error("Please enter a valid 8-character Patient ID");
      return;
    }
    setIsLookingUp(true);
    try {
      const result = await lookupPatient.mutateAsync(patientCode);
      setLookupResult(result);
    } catch (error) {
      setLookupResult(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddPatient = async () => {
    if (!lookupResult?.patient_id || !effectiveDoctorId) return;
    try {
      await grantAccess.mutateAsync({
        doctorId: effectiveDoctorId,
        patientId: lookupResult.patient_id,
      });
      setAddDialogOpen(false);
      setPatientCode("");
      setLookupResult(null);
      toast.success("Patient added successfully!");
    } catch (error) {
      // Error handled in hook
    }
  };

  const resetDialog = () => {
    setPatientCode("");
    setLookupResult(null);
    setQrScanMode(false);
    qrInstanceRef.current?.stop().catch(() => {});
  };

  const getHealthStatus = (patient: any): { color: string; label: string } => {
    if (!patient.is_active) return { color: "bg-muted-foreground", label: "Inactive" };
    if (patient.last_accessed_at) {
      const lastAccess = new Date(patient.last_accessed_at);
      const daysSince = Math.floor((Date.now() - lastAccess.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) return { color: "bg-primary", label: "Recent" };
      if (daysSince <= 30) return { color: "bg-accent-foreground/60", label: "Follow-up" };
    }
    return { color: "bg-primary", label: "Stable" };
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Patients</h1>
            <p className="text-sm text-muted-foreground">Patients who have shared access with you via consent</p>
          </div>
          {isTablet && patients && patients.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1.5 py-1">
                <Users className="h-3 w-3" />
                {patients.length} Total
              </Badge>
              <Badge variant="outline" className="text-xs gap-1.5 py-1">
                <Activity className="h-3 w-3 text-primary" />
                {patients.filter((p: any) => p.is_active).length} Active
              </Badge>
              {recentIds.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1.5 py-1">
                  <Eye className="h-3 w-3" />
                  {recentIds.length} Recent
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* CSV Export */}
          {patients && patients.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => exportPatientsCsv(filteredPatients)}>
              <Download className="h-4 w-4 mr-1.5" />Export
            </Button>
          )}
          {/* Bulk Select Toggle */}
          {patients && patients.length > 0 && !selectionMode && (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
              <CheckSquare className="h-4 w-4 mr-1.5" />Select
            </Button>
          )}
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" />Add Patient</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Patient by ID</DialogTitle>
                <DialogDescription>Enter the patient's ID or scan their QR code to request access.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-code">Patient ID</Label>
                  <div className="flex gap-2">
                    <Input id="patient-code" placeholder="e.g., ABCD1234" value={patientCode} onChange={(e) => { setPatientCode(e.target.value.toUpperCase()); setLookupResult(null); }} maxLength={8} className="uppercase" />
                    <Button variant="outline" size="icon" onClick={() => setQrScanMode(!qrScanMode)} title="Scan QR Code">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleLookup} disabled={patientCode.length < 8 || isLookingUp}>
                      {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* QR Scanner */}
                {qrScanMode && (
                  <div className="rounded-lg border overflow-hidden">
                    <div id="qr-reader" ref={qrScannerRef} className="w-full" />
                    <div className="p-2 text-center">
                      <Button variant="ghost" size="sm" onClick={() => { setQrScanMode(false); qrInstanceRef.current?.stop().catch(() => {}); }}>
                        <X className="h-3.5 w-3.5 mr-1" />Cancel scan
                      </Button>
                    </div>
                  </div>
                )}

                {lookupResult && (
                  <div className="rounded-lg border p-4">
                    {lookupResult.found ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <span className="font-medium text-primary">Patient Found</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12"><AvatarFallback>{lookupResult.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-medium">{lookupResult.display_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{lookupResult.gender && `${lookupResult.gender}`}{lookupResult.age && `, ${lookupResult.age} years old`}</p>
                          </div>
                        </div>
                        {lookupResult.already_connected ? (
                          <Badge variant="secondary">Already in your patient list</Badge>
                        ) : (
                          <Button className="w-full" onClick={handleAddPatient} disabled={grantAccess.isPending}>
                            {grantAccess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                            Add to My Patients
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <span>No patient found with this ID</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Selection Toolbar */}
      {selectionMode && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-accent/30 sticky top-0 z-10">
          <Checkbox
            checked={selectedIds.size === filteredPatients.length && filteredPatients.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedIds.size} of {filteredPatients.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkExport} disabled={selectedIds.size === 0}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
              <X className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Recently Viewed - mobile only */}
      {!isTablet && recentlyViewedPatients.length > 0 && !debouncedSearch && statusFilter === "all" && dateFilter === "all" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Recently Viewed</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentlyViewedPatients.map((patient: any) => (
              <button key={patient.patient_id} onClick={() => handleViewPatient(patient)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors shrink-0 text-left">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{patient.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[120px]">{patient.display_name || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground">{patient.last_accessed_at ? formatDistanceToNow(new Date(patient.last_accessed_at), { addSuffix: true }) : "—"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className={cn("flex flex-col sm:flex-row gap-3", isDesktop && "flex-row items-center")}>
          <div className={cn("relative flex-1", !isDesktop && "sm:max-w-md")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          {/* Desktop: recently viewed chips inline */}
          {isTablet && recentlyViewedPatients.length > 0 && !debouncedSearch && statusFilter === "all" && dateFilter === "all" && (
            <div className="flex items-center gap-2 shrink-0">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {recentlyViewedPatients.map((patient: any) => (
                <button key={patient.patient_id} onClick={() => handleViewPatient(patient)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-card hover:bg-accent/50 transition-colors text-xs font-medium">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{patient.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">{patient.display_name || "Unknown"}</span>
                </button>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="sm:hidden justify-between">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" />Filters</span>
            {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{activeFiltersCount}</Badge>}
          </Button>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden sm:flex self-center text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />Clear ({activeFiltersCount})
            </Button>
          )}
        </div>

        <div className={cn("space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-2", !filtersOpen && "hidden sm:flex")}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
            </div>
            {(["all", "active", "inactive"] as const).map((s) => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="h-8 text-xs px-3">
                {s === "active" && <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
              </Button>
            ))}
          </div>
          <div className="hidden sm:block w-px h-6 bg-border mx-1" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Connected:</span>
            </div>
            {([
              { value: "all" as const, label: "All Time" },
              { value: "7days" as const, label: "7 Days" },
              { value: "30days" as const, label: "30 Days" },
              { value: "90days" as const, label: "90 Days" },
            ]).map((d) => (
              <Button key={d.value} variant={dateFilter === d.value ? "default" : "outline"} size="sm" onClick={() => setDateFilter(d.value)} className="h-8 text-xs px-3">{d.label}</Button>
            ))}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="sm:hidden w-full mt-2 text-muted-foreground">
              <X className="h-4 w-4 mr-1" />Clear all filters
            </Button>
          )}
        </div>

        {patients && patients.length > 0 && (
          <p className="text-xs text-muted-foreground pt-1">Showing {filteredPatients.length} of {patients.length} patient{patients.length !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Consent Notice Banner */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>All records are owned by patients. You can only view data that has been shared with you via patient consent.</span>
      </div>

      {/* Needs Attention Section */}
      {patients && patients.length > 0 && !debouncedSearch && (
        <NeedsAttentionSection
          patients={patients as any[]}
          onViewPatient={handleViewPatient}
        />
      )}

      {/* Patients Content */}
      {isLoading ? (
        <PageSkeleton type="cards" />
      ) : patients?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Add patients by entering their Patient ID or have them scan your QR code to grant you access to their health records."
          action={{ label: "Add Patient", onClick: () => setAddDialogOpen(true), icon: UserPlus }}
        />
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching patients"
          description="No patients match your current filters. Try adjusting your search or filter criteria."
          action={{ label: "Clear Filters", onClick: clearFilters }}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {selectionMode && <TableHead className="w-10" />}
                  <TableHead className="w-[280px]">
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                      Patient <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">Age / Gender</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[90px]">Risk</TableHead>
                  <TableHead className="w-[120px]">
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("connected")}>
                      Connected <SortIcon field="connected" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("last_viewed")}>
                      Last Viewed <SortIcon field="last_viewed" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient: any) => {
                  const healthStatus = getHealthStatus(patient);
                  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
                  return (
                    <TableRow key={patient.id} className="cursor-pointer" onClick={() => !selectionMode && handleViewPatient(patient)}>
                      {selectionMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(patient.patient_id)}
                            onCheckedChange={() => toggleSelection(patient.patient_id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{patient.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback>
                            </Avatar>
                            <span className={cn("absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card", healthStatus.color)} />
                          </div>
                          <PatientHoverPreview patientId={patient.patient_id} patientName={patient.display_name || "Unknown"}>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate hover:underline">{patient.display_name || "Unknown Patient"}</p>
                              <p className="text-xs text-muted-foreground">{patient.patient_id?.substring(0, 8).toUpperCase()}</p>
                            </div>
                          </PatientHoverPreview>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{age ? `${age} yrs` : "—"} / {patient.gender || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={patient.is_active ? "default" : "secondary"} className="text-xs">{patient.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell><PatientRiskIndicator patientId={patient.patient_id} compact /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{patient.granted_at ? format(new Date(patient.granted_at), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{patient.last_accessed_at ? formatDistanceToNow(new Date(patient.last_accessed_at), { addSuffix: true }) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => handleViewPatient(patient)}>
                            <FileText className="h-3.5 w-3.5 mr-1" />View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => { setSelectedPatient(patient); setPrescriptionDialogOpen(true); }}>
                            <Pill className="h-3.5 w-3.5 mr-1" />Prescribe
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => { setSelectedPatient(patient); setReferralDialogOpen(true); }}>
                            <Microscope className="h-3.5 w-3.5 mr-1" />Refer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Tablet Compact Table View (md to lg) */}
          <div className="hidden md:block lg:hidden rounded-lg border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {selectionMode && <TableHead className="w-10" />}
                  <TableHead>
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                      Patient <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Status / Risk</TableHead>
                  <TableHead className="whitespace-nowrap">
                    <button className="flex items-center hover:text-foreground transition-colors" onClick={() => handleSort("connected")}>
                      Connected <SortIcon field="connected" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient: any) => {
                  const healthStatus = getHealthStatus(patient);
                  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;
                  return (
                    <TableRow key={patient.id} className="cursor-pointer" onClick={() => !selectionMode && handleViewPatient(patient)}>
                      {selectionMode && (
                        <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(patient.patient_id)}
                            onCheckedChange={() => toggleSelection(patient.patient_id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">{patient.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback>
                            </Avatar>
                            <span className={cn("absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", healthStatus.color)} />
                          </div>
                          <PatientHoverPreview patientId={patient.patient_id} patientName={patient.display_name || "Unknown"}>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate hover:underline">{patient.display_name || "Unknown Patient"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {patient.patient_id?.substring(0, 8).toUpperCase()}
                                {age ? ` · ${age} yrs / ${patient.gender || "—"}` : ""}
                              </p>
                            </div>
                          </PatientHoverPreview>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={patient.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 whitespace-nowrap">{patient.is_active ? "Active" : "Inactive"}</Badge>
                          <Shield className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          <PatientRiskIndicator patientId={patient.patient_id} compact />
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {patient.granted_at ? format(new Date(patient.granted_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right py-2.5" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="bg-popover min-w-[200px]">
                            <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleViewPatient(patient)}>
                              <FileText className="h-4 w-4 shrink-0" /><span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2" onClick={() => { setSelectedPatient(patient); setPrescriptionDialogOpen(true); }}>
                              <Pill className="h-4 w-4 shrink-0" /><span>Prescribe</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2" onClick={() => { setSelectedPatient(patient); setReferralDialogOpen(true); }}>
                              <Microscope className="h-4 w-4 shrink-0" /><span>Refer to Diagnostic Center</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Grid */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filteredPatients.map((patient: any) => {
              const healthStatus = getHealthStatus(patient);
              return (
                <Card key={patient.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {selectionMode && (
                        <Checkbox
                          checked={selectedIds.has(patient.patient_id)}
                          onCheckedChange={() => toggleSelection(patient.patient_id)}
                          className="shrink-0"
                        />
                      )}
                      <div className="relative">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={patient.patient_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{patient.display_name?.[0]?.toUpperCase() || "P"}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", healthStatus.color)} title={healthStatus.label} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate leading-tight">{patient.display_name || "Unknown Patient"}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">ID: {patient.patient_id?.substring(0, 8).toUpperCase()}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /><span>{patient.gender || "—"}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>{patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() + " yrs" : "—"}</span></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={patient.is_active ? "default" : "secondary"} className="text-xs">{patient.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline" className="text-xs gap-1"><Shield className="h-3 w-3" />Consent</Badge>
                      <PatientRiskIndicator patientId={patient.patient_id} compact />
                      {patient.granted_at && <span className="text-[11px] text-muted-foreground">Connected {format(new Date(patient.granted_at), "MMM d, yyyy")}</span>}
                    </div>
                    {patient.last_accessed_at && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" />Viewed {formatDistanceToNow(new Date(patient.last_accessed_at), { addSuffix: true })}
                      </p>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-9" onClick={() => handleViewPatient(patient)}>
                          <FileText className="h-4 w-4 mr-1.5" />View Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-9 px-2.5"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4} className="bg-popover min-w-[200px]">
                            <DropdownMenuItem onClick={() => { setSelectedPatient(patient); setPrescriptionDialogOpen(true); }}>
                              <Pill className="h-4 w-4 mr-2 shrink-0" />Prescribe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedPatient(patient); setReferralDialogOpen(true); }}>
                              <Microscope className="h-4 w-4 mr-2 shrink-0" />Refer to Diagnostic Center
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <DoctorPatientDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} patient={selectedPatient} />

      {selectedPatient && (
        <CreatePrescriptionDialog
          open={prescriptionDialogOpen}
          onOpenChange={setPrescriptionDialogOpen}
          patient={{ patient_id: selectedPatient.patient_id, display_name: selectedPatient.display_name }}
          hospitalId={selectedHospitalId || undefined}
        />
      )}

      {selectedPatient && (
        <ReferToPathologistDialog
          open={referralDialogOpen}
          onOpenChange={setReferralDialogOpen}
          patient={{ patient_id: selectedPatient.patient_id, display_name: selectedPatient.display_name }}
        />
      )}
    </div>
  );
};

export default DoctorPatientsPage;
