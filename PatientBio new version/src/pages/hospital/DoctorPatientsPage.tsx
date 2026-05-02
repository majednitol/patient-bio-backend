import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useDoctorPatients, useUpdatePatientAccess } from "@/hooks/useDoctorPatients";
import { useMergeCandidates } from "@/hooks/useMergeCandidates";
import { Hospital } from "@/types/hospital";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  Eye,
  Pill,
  UserPlus,
  MoreVertical,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import PatientDetailsDialog from "@/components/hospital/PatientDetailsDialog";
import AddPatientDialog from "@/components/hospital/AddPatientDialog";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";

interface OutletContext {
  hospital: Hospital;
  isAdmin: boolean;
  isDoctor: boolean;
}

export default function DoctorPatientsPage() {
  const { hospital } = useOutletContext<OutletContext>();
  const { data: patients, isLoading } = useDoctorPatients();
  const { data: mergeCandidates } = useMergeCandidates(hospital.id);
  const updateAccess = useUpdatePatientAccess();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Build a set of patient IDs that have pending merge candidates
  const duplicatePatientIds = new Set<string>();
  mergeCandidates?.forEach((c) => {
    duplicatePatientIds.add(c.patient_id_a);
    duplicatePatientIds.add(c.patient_id_b);
  });

  const filteredPatients = patients?.filter((patient) => {
    const name = patient.patient_profile?.display_name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  }) || [];

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPatients,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: filteredPatients, itemsPerPage: 9 });

  const handleViewPatient = (patientId: string) => {
    updateAccess.mutate(patientId);
    setSelectedPatientId(patientId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            My Patients
          </h1>
          <p className="text-muted-foreground mt-1">
            Patients who have shared their health data with you
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search - sticky on mobile */}
      <div className="sticky top-11 sm:top-auto sm:static z-20 bg-background/95 backdrop-blur-md py-2 sm:py-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Patients Grid */}
      {filteredPatients.length > 0 ? (
        <>
          {/* Mobile: full-width stacked list / Desktop: grid */}
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {paginatedPatients.map((patient) => {
            const profile = patient.patient_profile;
            const age = profile?.date_of_birth
              ? Math.floor(
                  (Date.now() - new Date(profile.date_of_birth).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : null;

            return (
              <Card
                key={patient.id}
                className="hover:shadow-md active:scale-[0.98] transition-all duration-150 rounded-xl cursor-pointer"
                onClick={() => handleViewPatient(patient.patient_id)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {profile?.display_name || "Unknown Patient"}
                        </p>
                        {duplicatePatientIds.has(patient.patient_id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Dup
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Potential duplicate detected — review in hospital dashboard</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        {age && <span>{age}y</span>}
                        {age && profile?.gender && <span>•</span>}
                        {profile?.gender && <span>{profile.gender}</span>}
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          Shared {formatDistanceToNow(new Date(patient.granted_at), { addSuffix: true })}
                        </span>
                      </div>
                      {/* Mobile-only compact metadata */}
                      <div className="flex items-center gap-2 mt-1 sm:hidden text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(patient.granted_at), { addSuffix: true })}
                        </span>
                        {patient.last_accessed_at && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(patient.last_accessed_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Desktop actions */}
                    <div className="hidden sm:flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => handleViewPatient(patient.patient_id)}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="px-2">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleViewPatient(patient.patient_id)}>
                            <Pill className="h-4 w-4 mr-2" />
                            Prescribe
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Mobile chevron hint */}
                    <Eye className="h-4 w-4 text-muted-foreground/50 sm:hidden shrink-0" />
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Patients Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              Add patients using their Patient ID code. Patients can find their ID in their Patient Portal.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Your First Patient
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Patient Details Dialog */}
      <PatientDetailsDialog
        patientId={selectedPatientId}
        hospitalId={hospital.id}
        onClose={() => setSelectedPatientId(null)}
      />

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={(patientId) => setSelectedPatientId(patientId)}
      />
    </div>
  );
}
