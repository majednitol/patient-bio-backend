import { useState, useMemo } from "react";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { useDoctorPathologistNotifications } from "@/hooks/useDoctorPathologistNotifications";
import { DataSharingSummaryStrip } from "@/components/pathologist/DataSharingSummaryStrip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Send, 
  FileText, 
  Loader2, 
  CheckCircle, 
  Search,
  Stethoscope,
  ArrowRight,
  Eye,
  Clock,
  Bell
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ShareToDoctorsPage = () => {
  const { reports, shareWithDoctor, isLoading: reportsLoading } = usePathologistReports();
  const { receivedShares, isLoading: sharesLoading } = useDoctorPathologistShares();
  const { notifyDoctorOfSharedReport } = useDoctorPathologistNotifications();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [sharedFilter, setSharedFilter] = useState<"all" | "awaiting" | "viewed">("all");
  const [sharedPage, setSharedPage] = useState(1);

  const isLoading = reportsLoading || sharesLoading;
  const SHARED_ITEMS_PER_PAGE = 20;

  // Get unique doctors who have referred patients to this pathologist
  const referringDoctors = useMemo(() => {
    const doctorMap = new Map<string, { id: string; name: string | null; shareCount: number }>();
    receivedShares.forEach((share) => {
      if (!doctorMap.has(share.doctor_id)) {
        doctorMap.set(share.doctor_id, { id: share.doctor_id, name: share.doctor_name || null, shareCount: 1 });
      } else {
        const existing = doctorMap.get(share.doctor_id)!;
        doctorMap.set(share.doctor_id, { ...existing, shareCount: existing.shareCount + 1 });
      }
    });
    return Array.from(doctorMap.values());
  }, [receivedShares]);

  const unsharedReports = reports.filter(
    (r) => !r.is_shared_with_doctor
  );

  const sharedReports = reports.filter((r) => r.is_shared_with_doctor);

  const filteredUnshared = unsharedReports.filter(
    (r) =>
      r.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.report_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Filter shared reports by status
  const filteredShared = useMemo(() => {
    if (sharedFilter === "awaiting") {
      return sharedReports.filter((r) => !r.doctor_viewed_at);
    } else if (sharedFilter === "viewed") {
      return sharedReports.filter((r) => r.doctor_viewed_at);
    }
    return sharedReports;
  }, [sharedReports, sharedFilter]);

  // Paginate shared reports
  const paginatedShared = useMemo(() => {
    const start = (sharedPage - 1) * SHARED_ITEMS_PER_PAGE;
    const end = start + SHARED_ITEMS_PER_PAGE;
    return filteredShared.slice(start, end);
  }, [filteredShared, sharedPage]);

  const totalSharedPages = Math.ceil(filteredShared.length / SHARED_ITEMS_PER_PAGE);

  const handleShareWithDoctor = () => {
    if (selectedReport && doctorId) {
      const report = reports.find((r) => r.id === selectedReport);
      shareWithDoctor(
        { reportId: selectedReport, doctorId },
        {
          onSuccess: async () => {
            // Send notification to doctor
            if (report) {
              await notifyDoctorOfSharedReport(
                doctorId,
                report.report_name,
                report.patient_id
              );
            }
            setIsDialogOpen(false);
            setSelectedReport(null);
            setDoctorId("");
          },
        }
      );
    }
  };

  const handleBulkShare = () => {
    if (selectedReports.size === 0 || !doctorId) return;
    selectedReports.forEach((reportId) => {
      const report = reports.find((r) => r.id === reportId);
      shareWithDoctor(
        { reportId, doctorId },
        {
          onSuccess: async () => {
            if (report) {
              await notifyDoctorOfSharedReport(
                doctorId,
                report.report_name,
                report.patient_id
              );
            }
          },
        }
      );
    });
    setSelectedReports(new Set());
    setDoctorId("");
  };

  const toggleReportSelection = (reportId: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleResendNotification = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      // Find the doctor this was shared with - for now we'll trigger a notification
      const share = receivedShares.find((s) => s.id === reportId);
      if (share) {
        notifyDoctorOfSharedReport(share.doctor_id, report.report_name, report.patient_id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Sharing Summary Strip */}
      <DataSharingSummaryStrip />

      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Share to Doctors</h1>
        <p className="text-muted-foreground">
          Send completed diagnostic reports back to referring physicians
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="diagnostic-stat-card border-teal-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-50">
              <FileText className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ready to Share</p>
              <p className="text-2xl font-bold text-gray-900">{unsharedReports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-green-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shared with Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{sharedReports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-cyan-100">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-50">
              <Send className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-gray-200 focus:border-teal-300 focus:ring-teal-200"
        />
      </div>

       {/* Reports to Share */}
       <Card className="diagnostic-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-800">Reports Ready to Share</CardTitle>
              <CardDescription>
                {selectedReports.size > 0 ? (
                  <span className="text-teal-600 font-medium">{selectedReports.size} selected</span>
                ) : (
                  "Select a report to send to the referring doctor"
                )}
              </CardDescription>
            </div>
            {selectedReports.size > 0 && (
              <Button
                onClick={() => {
                  setIsDialogOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Bulk Share ({selectedReports.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredUnshared.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-teal-300" />
              </div>
              <p className="font-medium text-gray-800">No reports pending to share</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create reports from the My Reports page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUnshared.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={selectedReports.has(report.id)}
                      onCheckedChange={() => toggleReportSelection(report.id)}
                    />
                    <div className="p-2.5 rounded-xl bg-teal-50">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{report.report_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50/50">
                          {report.report_type || "General"}
                        </Badge>
                        {report.disease_category && (
                          <Badge variant="secondary" className="text-xs uppercase bg-gray-100">
                            {report.disease_category.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created{" "}
                        {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedReport(report.id);
                      setIsDialogOpen(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white ml-4"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

       {/* Already Shared */}
       {sharedReports.length > 0 && (
         <Card className="diagnostic-card">
           <CardHeader>
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <div>
                   <CardTitle className="text-lg text-gray-800">Recently Shared</CardTitle>
                   <CardDescription>
                     {filteredShared.length} report{filteredShared.length !== 1 ? "s" : ""} {sharedFilter !== "all" && `(${sharedFilter})`}
                   </CardDescription>
                 </div>
               </div>
               {/* Filter Tabs */}
               <div className="flex gap-2 border-b border-gray-200">
                 <button
                   onClick={() => {
                     setSharedFilter("all");
                     setSharedPage(1);
                   }}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                     sharedFilter === "all"
                       ? "border-teal-600 text-teal-600"
                       : "border-transparent text-muted-foreground hover:text-gray-700"
                   }`}
                 >
                   All ({sharedReports.length})
                 </button>
                 <button
                   onClick={() => {
                     setSharedFilter("awaiting");
                     setSharedPage(1);
                   }}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                     sharedFilter === "awaiting"
                       ? "border-teal-600 text-teal-600"
                       : "border-transparent text-muted-foreground hover:text-gray-700"
                   }`}
                 >
                   <Clock className="h-4 w-4" />
                   Awaiting ({sharedReports.filter((r) => !r.doctor_viewed_at).length})
                 </button>
                 <button
                   onClick={() => {
                     setSharedFilter("viewed");
                     setSharedPage(1);
                   }}
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                     sharedFilter === "viewed"
                       ? "border-teal-600 text-teal-600"
                       : "border-transparent text-muted-foreground hover:text-gray-700"
                   }`}
                 >
                   <Eye className="h-4 w-4" />
                   Viewed ({sharedReports.filter((r) => r.doctor_viewed_at).length})
                 </button>
               </div>
             </div>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
                {paginatedShared.map((report) => {
                   const viewedInfo = report.doctor_viewed_at 
                     ? `Viewed ${formatDistanceToNow(new Date(report.doctor_viewed_at), { addSuffix: true })}`
                     : null;
                   return (
                   <div
                     key={report.id}
                     className={`flex items-center justify-between p-4 rounded-xl border ${
                       report.doctor_viewed_at
                         ? "border-green-100 bg-green-50/30"
                         : "border-amber-100 bg-amber-50/30"
                     }`}
                   >
                     <div className="flex items-center gap-4 flex-1">
                       <div className={`p-2.5 rounded-xl ${
                         report.doctor_viewed_at ? "bg-green-100" : "bg-amber-100"
                       }`}>
                         {report.doctor_viewed_at ? (
                           <Eye className="h-5 w-5 text-green-600" />
                         ) : (
                           <Clock className="h-5 w-5 text-amber-600" />
                         )}
                       </div>
                       <div>
                         <h4 className="font-medium text-gray-800">{report.report_name}</h4>
                         <p className="text-xs text-muted-foreground mt-1">
                           Shared with doctor •{" "}
                           {formatDistanceToNow(new Date(report.updated_at), {
                             addSuffix: true,
                           })}
                         </p>
                         {report.doctor_viewed_at && (
                           <p className="text-xs text-green-600 mt-0.5">
                             Viewed {formatDistanceToNow(new Date(report.doctor_viewed_at), { addSuffix: true })}
                           </p>
                         )}
                       </div>
                     </div>
                   <div className="flex items-center gap-2">
                     <Badge className={
                       report.doctor_viewed_at
                         ? "bg-green-100 text-green-700 hover:bg-green-100"
                         : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                     }>
                       {report.doctor_viewed_at ? (
                         <><Eye className="h-3 w-3 mr-1" /> Viewed</>
                       ) : (
                         <><Clock className="h-3 w-3 mr-1" /> Awaiting</>
                       )}
                     </Badge>
                     {!report.doctor_viewed_at && (
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleResendNotification(report.id)}
                         className="h-8 px-2 text-xs"
                       >
                         <Bell className="h-3 w-3 mr-1" />
                         Resend
                       </Button>
                     )}
                   </div>
                  </div>
                   );
                })}
               {filteredShared.length === 0 && (
                 <div className="text-center py-8">
                   <p className="text-sm text-muted-foreground">
                     No reports found for the selected filter
                   </p>
                 </div>
               )}
             </div>
             {totalSharedPages > 1 && (
               <div className="mt-6 pt-6 border-t border-gray-200">
                 <Pagination>
                   <PaginationContent>
                     <PaginationItem>
                       <PaginationPrevious
                         href="#"
                         onClick={(e) => {
                           e.preventDefault();
                           if (sharedPage > 1) setSharedPage(sharedPage - 1);
                         }}
                         className={sharedPage === 1 ? "pointer-events-none opacity-50" : ""}
                       />
                     </PaginationItem>
                     {Array.from({ length: totalSharedPages }, (_, i) => i + 1).map((page) => (
                       <PaginationItem key={page}>
                         <PaginationLink
                           href="#"
                           onClick={(e) => {
                             e.preventDefault();
                             setSharedPage(page);
                           }}
                           isActive={sharedPage === page}
                         >
                           {page}
                         </PaginationLink>
                       </PaginationItem>
                     ))}
                     <PaginationItem>
                       <PaginationNext
                         href="#"
                         onClick={(e) => {
                           e.preventDefault();
                           if (sharedPage < totalSharedPages) setSharedPage(sharedPage + 1);
                         }}
                         className={sharedPage === totalSharedPages ? "pointer-events-none opacity-50" : ""}
                       />
                     </PaginationItem>
                   </PaginationContent>
                 </Pagination>
               </div>
             )}
           </CardContent>
         </Card>
       )}

       {/* Share Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="text-gray-800">
               {selectedReports.size > 0 ? `Share ${selectedReports.size} Reports` : "Share Report with Doctor"}
             </DialogTitle>
             <DialogDescription>
               {selectedReports.size > 0
                 ? "Select a doctor to deliver these reports"
                 : "Select or enter the doctor's ID to deliver this report"}
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             {selectedReports.size === 0 && (
               <div className="p-4 rounded-xl bg-teal-50 flex items-center gap-3 border border-teal-100">
                 <Stethoscope className="h-5 w-5 text-teal-600" />
                 <div>
                   <p className="font-medium text-gray-800">
                     {reports.find((r) => r.id === selectedReport)?.report_name}
                   </p>
                   <p className="text-sm text-muted-foreground">
                     {reports.find((r) => r.id === selectedReport)?.report_type}
                   </p>
                 </div>
               </div>
             )}
             {selectedReports.size > 0 && (
               <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                 <p className="font-medium text-gray-800 mb-2">Reports to share:</p>
                 <ul className="text-sm text-muted-foreground space-y-1">
                   {Array.from(selectedReports)
                     .slice(0, 3)
                     .map((reportId) => (
                       <li key={reportId}>
                         • {reports.find((r) => r.id === reportId)?.report_name}
                       </li>
                     ))}
                   {selectedReports.size > 3 && <li>• +{selectedReports.size - 3} more</li>}
                 </ul>
               </div>
             )}

            {/* Doctor Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700">Select Doctor</Label>
              {referringDoctors.length > 0 ? (
                <Select
                  value={doctorId}
                  onValueChange={(value) => setDoctorId(value)}
                >
                  <SelectTrigger className="border-gray-200 focus:border-teal-300 focus:ring-teal-200">
                    <SelectValue placeholder="Select a referring doctor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {referringDoctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name || doctor.id.substring(0, 8).toUpperCase()}
                        <span className="text-muted-foreground ml-2">
                          ({doctor.shareCount} referral{doctor.shareCount !== 1 ? "s" : ""})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter doctor's UUID"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="border-gray-200 focus:border-teal-300 focus:ring-teal-200"
                />
              )}
              
              {referringDoctors.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Or enter manually:
                  <Input
                    placeholder="Enter doctor's UUID"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="mt-2 border-gray-200 focus:border-teal-300 focus:ring-teal-200"
                  />
                </div>
              )}
            </div>

             <div className="flex gap-3 pt-2">
               <Button
                 variant="outline"
                 className="flex-1 border-gray-200"
                 onClick={() => {
                   setIsDialogOpen(false);
                   if (selectedReports.size > 0) {
                     setSelectedReports(new Set());
                   }
                 }}
               >
                 Cancel
               </Button>
               <Button
                 className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                 onClick={selectedReports.size > 0 ? handleBulkShare : handleShareWithDoctor}
                 disabled={!doctorId}
               >
                 <Send className="h-4 w-4 mr-2" />
                 {selectedReports.size > 0 ? `Share ${selectedReports.size} Reports` : "Share Report"}
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareToDoctorsPage;
