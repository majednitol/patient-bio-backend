import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, MapPin, Users, RefreshCw, ExternalLink, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Phone, Globe, Mail, FileText, Shield, Stethoscope, UserCog, UserCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface Hospital {
  id: string;
  name: string;
  type: string | null;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  is_active: boolean | null;
  created_at: string | null;
  staff_count?: number;
}

type SortField = "name" | "staff_count" | "created_at";
type SortDir = "asc" | "desc";

// --- Detail Panel Sub-Component ---
function HospitalDetailPanel({ hospital }: { hospital: Hospital }) {
  const { data: departments, isLoading: depsLoading } = useQuery({
    queryKey: ["admin-hospital-departments", hospital.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_departments")
        .select("id, name, is_active")
        .eq("hospital_id", hospital.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staffBreakdown, isLoading: staffLoading } = useQuery({
    queryKey: ["admin-hospital-staff-breakdown", hospital.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_staff")
        .select("role")
        .eq("hospital_id", hospital.id)
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s) => {
        counts[s.role] = (counts[s.role] || 0) + 1;
      });
      return counts;
    },
  });

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <UserCog className="h-3.5 w-3.5 text-muted-foreground" />,
    doctor: <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />,
    nurse: <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />,
    receptionist: <Users className="h-3.5 w-3.5 text-muted-foreground" />,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
      {/* Left: Contact & Registration */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Contact & Registration</h4>
        <div className="space-y-2 text-sm">
          {hospital.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {hospital.phone}
            </div>
          )}
          {hospital.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {hospital.email}
            </div>
          )}
          {hospital.website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="underline">{hospital.website}</a>
            </div>
          )}
          {hospital.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {hospital.address}
            </div>
          )}
          {hospital.registration_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Reg: {hospital.registration_number}
            </div>
          )}
          {hospital.type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> Type: <Badge variant="outline" className="capitalize text-xs">{hospital.type}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Right: Departments & Staff */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Departments</h4>
        {depsLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : departments && departments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <Badge key={d.id} variant={d.is_active ? "secondary" : "outline"} className="text-xs">
                {d.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No departments</p>
        )}

        <h4 className="text-sm font-semibold text-foreground mt-4">Staff Breakdown</h4>
        {staffLoading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : staffBreakdown && Object.keys(staffBreakdown).length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(staffBreakdown).map(([role, count]) => (
              <div key={role} className="flex items-center gap-2 text-sm text-muted-foreground">
                {roleIcons[role] || <Users className="h-3.5 w-3.5" />}
                <span className="capitalize">{role}s</span>
                <Badge variant="outline" className="ml-auto font-mono text-xs">{count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No active staff</p>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function AdminHospitalsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Hospital | null>(null);

  const { data: hospitals, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: async () => {
      const { data: hospitalsData, error: hospitalsError } = await supabase
        .from("hospitals")
        .select("id, name, city, country, phone, email, website, address, type, registration_number, logo_url, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (hospitalsError) throw hospitalsError;

      const hospitalIds = hospitalsData.map((h) => h.id);
      const { data: staffData } = await supabase
        .from("hospital_staff")
        .select("hospital_id")
        .in("hospital_id", hospitalIds)
        .eq("is_active", true);

      const staffCounts: Record<string, number> = {};
      staffData?.forEach((s) => {
        staffCounts[s.hospital_id] = (staffCounts[s.hospital_id] || 0) + 1;
      });

      return hospitalsData.map((h) => ({
        ...h,
        staff_count: staffCounts[h.id] || 0,
      })) as Hospital[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from("hospitals")
        .update({ is_active: !current })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hospitals"] });
      toast.success(`Hospital ${toggleTarget?.is_active !== false ? "deactivated" : "activated"} successfully`);
      setToggleTarget(null);
    },
    onError: (err) => {
      toast.error("Failed to update hospital: " + (err as Error).message);
      setToggleTarget(null);
    },
  });

  const filteredAndSorted = useMemo(() => {
    if (!hospitals) return [];
    let result = hospitals;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((h) => h.type === typeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.city?.toLowerCase().includes(query) ||
          h.country?.toLowerCase().includes(query) ||
          h.email?.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "staff_count") {
        cmp = (a.staff_count || 0) - (b.staff_count || 0);
      } else {
        cmp = (a.created_at || "").localeCompare(b.created_at || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [hospitals, searchQuery, typeFilter, sortField, sortDir]);

  const {
    currentPage, totalPages, paginatedData, goToPage, hasNextPage, hasPrevPage,
  } = usePagination({ data: filteredAndSorted, itemsPerPage: 10 });

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const exportCSV = useCallback(() => {
    const headers = ["Name", "City", "Country", "Email", "Phone", "Type", "Status", "Staff", "Registered"];
    const rows = filteredAndSorted.map((h) => [
      h.name,
      h.city || "",
      h.country || "",
      h.email || "",
      h.phone || "",
      h.type || "",
      h.is_active !== false ? "Active" : "Inactive",
      String(h.staff_count || 0),
      h.created_at ? format(new Date(h.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospitals-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSorted]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const activeCount = hospitals?.filter((h) => h.is_active !== false).length || 0;
  const inactiveCount = hospitals?.filter((h) => h.is_active === false).length || 0;
  const totalStaff = hospitals?.reduce((sum, h) => sum + (h.staff_count || 0), 0) || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Hospital Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor and manage all registered hospitals
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredAndSorted.length} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="flex-1 sm:flex-none">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hospitals?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Hospitals
                {filteredAndSorted.length > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {filteredAndSorted.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View all registered healthcare facilities
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search hospitals..."
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Failed to load hospitals</p>
              <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-0 sm:mx-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm w-8"></TableHead>
                      <TableHead
                        className="text-xs sm:text-sm cursor-pointer select-none"
                        onClick={() => handleSort("name")}
                      >
                        <span className="inline-flex items-center">Hospital <SortIcon field="name" /></span>
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">Location</TableHead>
                      <TableHead
                        className="text-xs sm:text-sm cursor-pointer select-none"
                        onClick={() => handleSort("staff_count")}
                      >
                        <span className="inline-flex items-center">Staff <SortIcon field="staff_count" /></span>
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead
                        className="text-xs sm:text-sm hidden md:table-cell cursor-pointer select-none"
                        onClick={() => handleSort("created_at")}
                      >
                        <span className="inline-flex items-center">Registered <SortIcon field="created_at" /></span>
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={7} rows={5} />
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((hospital: Hospital) => (
                        <React.Fragment key={hospital.id}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => setExpandedId((prev) => (prev === hospital.id ? null : hospital.id))}
                          >
                            <TableCell className="px-2">
                              {expandedId === hospital.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              <div>
                                <span className="truncate max-w-[180px] block">{hospital.name}</span>
                                {hospital.email && (
                                  <span className="text-xs text-muted-foreground">{hospital.email}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {[hospital.city, hospital.country].filter(Boolean).join(", ") || "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge variant="outline" className="font-mono">{hospital.staff_count}</Badge>
                            </TableCell>
                            <TableCell>
                              {hospital.is_active !== false ? (
                                <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" /> Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                              {formatDate(hospital.created_at)}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setToggleTarget(hospital)}
                                  title={hospital.is_active !== false ? "Deactivate" : "Activate"}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/hospital/${hospital.id}`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedId === hospital.id && (
                            <TableRow key={`${hospital.id}-detail`}>
                              <TableCell colSpan={7} className="p-3 sm:p-4">
                                <HospitalDetailPanel hospital={hospital} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                          {searchQuery ? "No hospitals match your search" : "No hospitals registered yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Toggle Active/Inactive Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active !== false ? "Deactivate" : "Activate"} Hospital
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {toggleTarget?.is_active !== false ? "deactivate" : "activate"}{" "}
              <strong>{toggleTarget?.name}</strong>?
              {toggleTarget?.is_active !== false &&
                " This will prevent staff from accessing hospital features."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toggleTarget) {
                  toggleActiveMutation.mutate({
                    id: toggleTarget.id,
                    current: toggleTarget.is_active !== false,
                  });
                }
              }}
              className={toggleTarget?.is_active !== false ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {toggleTarget?.is_active !== false ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
