import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useBroadcastRequests } from "@/hooks/useBroadcastRequests";
import { useShareDataCompleteness } from "@/hooks/useShareDataCompleteness";
import { useAuth } from "@/contexts/AuthContext";
import RequestPatientDataDialog from "@/components/researcher/RequestPatientDataDialog";
import ResearcherPatientDataDialog from "@/components/researcher/ResearcherPatientDataDialog";
import ExportDataDialog from "@/components/researcher/ExportDataDialog";
import DataQualityBadge from "@/components/researcher/DataQualityBadge";
import StudyReportGenerator from "@/components/researcher/StudyReportGenerator";
import ShareInsightsPanel from "@/components/researcher/ShareInsightsPanel";
import CohortDriftAlert from "@/components/researcher/CohortDriftAlert";
import CohortClinicalSummary from "@/components/researcher/CohortClinicalSummary";
import ClinicalComparisonPanel from "@/components/researcher/ClinicalComparisonPanel";
import { ScheduledReportConfig } from "@/components/researcher/ScheduledReportConfig";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  Clock, 
  Eye, 
  CheckCircle, 
  FlaskConical,
  RefreshCw,
  Radio,
  Users,
  XCircle,
  FolderOpen,
  Download,
  Heart,
  FileBarChart,
  Pill,
  Stethoscope,
  GitCompare,
  Calendar,
  ChevronDown,
} from "lucide-react";

const ResearcherDataPage = () => {
  const { user } = useAuth();
  const { 
    researcherShares, 
    isLoading, 
    refetch, 
    updateShareStatus,
    isUpdating 
  } = usePatientResearcherShares();
   
   const {
     broadcastRequests,
     isLoading: loadingBroadcasts,
     cancelBroadcast,
     isCancelling,
     refetch: refetchBroadcasts
   } = useBroadcastRequests();

  // Data completeness for share cards
  const shareIds = researcherShares.map((s) => s.id);
  const { completeness } = useShareDataCompleteness(shareIds);
  
  const [activeTab, setActiveTab] = useState("broadcasts");
  const [viewDataShare, setViewDataShare] = useState<{ id: string; diseaseCategory?: string } | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const pendingShares = researcherShares.filter((s) => s.status === "pending");
  const viewedShares = researcherShares.filter((s) => s.status === "viewed");
  const completedShares = researcherShares.filter((s) => s.status === "completed");
 
   const activeBroadcasts = broadcastRequests.filter((b) => b.status === "active");

  const handleMarkViewed = (shareId: string) => {
    updateShareStatus({ shareId, status: "viewed" });
  };

  const handleMarkCompleted = (shareId: string) => {
    updateShareStatus({ shareId, status: "completed" });
  };
 
  const handleViewData = (shareId: string, diseaseCategory?: string) => {
    setViewDataShare({ id: shareId, diseaseCategory });
  };

   const handleRefresh = () => {
     refetch();
     refetchBroadcasts();
   };

  const renderShareCards = (shares: typeof researcherShares, emptyMessage: string) => {
    if (shares.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <FlaskConical className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mb-3" />
            <h3 className="text-base sm:text-lg font-medium">No data shares</h3>
            <p className="text-muted-foreground text-xs sm:text-sm text-center">{emptyMessage}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-3 sm:gap-4">
        {shares.map((share) => {
          const comp = completeness[share.id];
          return (
          <Card key={share.id}>
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm sm:text-base leading-tight">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="line-clamp-1">{share.disease_category || "General Medical Data"}</span>
                  </CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DataQualityBadge share={share} />
                    <Badge
                      variant={
                        share.status === "pending"
                          ? "destructive"
                          : share.status === "viewed"
                          ? "secondary"
                          : "default"
                      }
                      className="text-[10px]"
                    >
                      {share.status}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-[11px] sm:text-xs leading-snug">
                  Shared {new Date(share.shared_at).toLocaleDateString()}
                  {share.is_anonymized && " • Anonymized"}
                  {share.expires_at && ` • Exp ${new Date(share.expires_at).toLocaleDateString()}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 sm:pt-0 space-y-3">
              {/* Data Completeness Badges */}
              {comp && (
                <div className="flex flex-wrap gap-1">
                  {comp.hasHealthData && (
                    <Badge variant="outline" className="text-[10px] gap-1 h-5">
                      <Heart className="h-2.5 w-2.5" /> Health
                    </Badge>
                  )}
                  {comp.recordsCount > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 h-5">
                      <FileBarChart className="h-2.5 w-2.5" /> {comp.recordsCount}
                    </Badge>
                  )}
                  {comp.hasClinicalRecords && (
                    <Badge variant="outline" className="text-[10px] gap-1 h-5">
                      <Stethoscope className="h-2.5 w-2.5" /> Clinical
                    </Badge>
                  )}
                  {comp.prescriptionCount > 0 && (
                    <Badge variant="outline" className="text-[10px] gap-1 h-5">
                      <Pill className="h-2.5 w-2.5" /> {comp.prescriptionCount} Rx
                    </Badge>
                  )}
                </div>
              )}

              {share.research_purpose && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                  <p className="text-xs sm:text-sm line-clamp-2">{share.research_purpose}</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1.5 pt-1">
                {share.status === "pending" && (
                  <>
                    <Button 
                      onClick={() => handleViewData(share.id, share.disease_category || undefined)}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <FolderOpen className="h-3.5 w-3.5 mr-1" />
                      View Data
                    </Button>
                    <Button 
                      onClick={() => handleMarkViewed(share.id)}
                      disabled={isUpdating}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Reviewed
                    </Button>
                  </>
                )}
                {share.status === "viewed" && (
                  <>
                    <Button 
                      onClick={() => handleViewData(share.id, share.disease_category || undefined)}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <FolderOpen className="h-3.5 w-3.5 mr-1" />
                      View Data
                    </Button>
                    <Button 
                      onClick={() => handleMarkCompleted(share.id)}
                      disabled={isUpdating}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Complete
                    </Button>
                  </>
                )}
                {share.status === "completed" && share.completed_at && (
                  <>
                    <Button 
                      onClick={() => handleViewData(share.id, share.disease_category || undefined)}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <FolderOpen className="h-3.5 w-3.5 mr-1" />
                      View Data
                    </Button>
                    <p className="text-[11px] text-muted-foreground flex items-center">
                      Done {new Date(share.completed_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold">Research Data</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Patient data shared for research</p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            className="h-8 w-8 shrink-0 sm:hidden"
            onClick={handleRefresh} 
            disabled={isLoading || loadingBroadcasts}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || loadingBroadcasts ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <RequestPatientDataDialog />
          <StudyReportGenerator
            shareIds={researcherShares.map((s) => s.id)}
            totalShares={researcherShares.length}
          />
          <Button 
            variant="outline" 
            onClick={() => setShowExportDialog(true)}
            disabled={researcherShares.length === 0}
            size="sm"
            className="h-8 text-xs sm:h-9 sm:text-sm"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isLoading || loadingBroadcasts}
            size="sm"
            className="h-8 text-xs sm:h-9 sm:text-sm hidden sm:inline-flex"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isLoading || loadingBroadcasts ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cohort Clinical Summary */}
      <CohortClinicalSummary />

      {/* Cohort Drift Alert */}
      {user?.id && <CohortDriftAlert shares={researcherShares} userId={user.id} />}

      {/* Smart Share Insights Panel */}
      <ShareInsightsPanel shares={researcherShares} broadcasts={broadcastRequests} />

      {/* Clinical Comparison & Scheduled Reports */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-9 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Clinical Comparison
              </span>
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ClinicalComparisonPanel shares={researcherShares} />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-9 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Scheduled Reports
              </span>
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ScheduledReportConfig />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 h-auto">
           <TabsTrigger value="broadcasts" className="flex items-center gap-1 text-[11px] sm:text-sm px-1.5 sm:px-3 py-2">
             <Radio className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
             <span className="hidden sm:inline">My Requests</span>
             <span className="sm:hidden">Requests</span>
             {activeBroadcasts.length > 0 && (
               <Badge variant="secondary" className="h-4 text-[9px] px-1 sm:h-5 sm:text-xs sm:px-1.5">{activeBroadcasts.length}</Badge>
             )}
           </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-1 text-[11px] sm:text-sm px-1.5 sm:px-3 py-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">New Data</span>
            <span className="sm:hidden">New</span>
            {pendingShares.length > 0 && (
              <Badge variant="destructive" className="h-4 text-[9px] px-1 sm:h-5 sm:text-xs sm:px-1.5">{pendingShares.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="viewed" className="flex items-center gap-1 text-[11px] sm:text-sm px-1.5 sm:px-3 py-2">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">In Progress</span>
            <span className="sm:hidden">Active</span>
            {viewedShares.length > 0 && (
              <Badge variant="secondary" className="h-4 text-[9px] px-1 sm:h-5 sm:text-xs sm:px-1.5">{viewedShares.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1 text-[11px] sm:text-sm px-1.5 sm:px-3 py-2">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Completed</span>
            <span className="sm:hidden">Done</span>
            {completedShares.length > 0 && (
              <Badge variant="outline" className="h-4 text-[9px] px-1 sm:h-5 sm:text-xs sm:px-1.5">{completedShares.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

         {/* Broadcasts Tab */}
         <TabsContent value="broadcasts" className="mt-4 sm:mt-6">
           {broadcastRequests.length === 0 ? (
             <Card>
               <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                 <Radio className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mb-3" />
                 <h3 className="text-base sm:text-lg font-medium">No broadcast requests yet</h3>
                 <p className="text-muted-foreground text-xs sm:text-sm text-center max-w-md mt-1.5">
                   Click "Request Patient Data" to broadcast a research request to all patients with specific disease category data.
                 </p>
               </CardContent>
             </Card>
           ) : (
             <div className="grid gap-3 sm:gap-4">
               {broadcastRequests.map((broadcast) => (
                 <Card key={broadcast.id}>
                   <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                     <div className="flex items-start justify-between gap-2">
                       <div className="min-w-0">
                         <CardTitle className="flex items-center gap-1.5 text-sm sm:text-base">
                           <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                           <span className="truncate">{broadcast.disease_category.charAt(0).toUpperCase() + broadcast.disease_category.slice(1).replace('_', ' ')} Research</span>
                         </CardTitle>
                         <CardDescription className="text-[11px] sm:text-xs">
                           Broadcast {new Date(broadcast.created_at).toLocaleDateString()}
                         </CardDescription>
                       </div>
                       <Badge
                         variant={
                           broadcast.status === "active"
                             ? "default"
                             : broadcast.status === "cancelled"
                             ? "destructive"
                             : "secondary"
                         }
                         className="text-[10px] shrink-0"
                       >
                         {broadcast.status}
                       </Badge>
                     </div>
                   </CardHeader>
                   <CardContent className="p-4 sm:p-6 pt-2 sm:pt-0 space-y-3">
                     <div>
                       <p className="text-xs font-medium text-muted-foreground">Purpose</p>
                       <p className="text-xs sm:text-sm mt-0.5 line-clamp-2">{broadcast.research_purpose}</p>
                     </div>
                     
                     <div className="flex items-center gap-3 sm:gap-6 text-[11px] sm:text-sm">
                       <div className="flex items-center gap-1 sm:gap-2">
                         <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                         <span>{broadcast.patients_notified} sent</span>
                       </div>
                       <div className="flex items-center gap-1 sm:gap-2 text-primary">
                         <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                         <span>{broadcast.patients_approved} ok</span>
                       </div>
                       <div className="flex items-center gap-1 sm:gap-2 text-destructive">
                         <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                         <span>{broadcast.patients_rejected} no</span>
                       </div>
                     </div>
 
                     {broadcast.status === "active" && (
                       <div className="pt-1">
                         <Button 
                           variant="outline" 
                           size="sm"
                           className="h-8 text-xs"
                           onClick={() => cancelBroadcast(broadcast.id)}
                           disabled={isCancelling}
                         >
                           Cancel Request
                         </Button>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
         </TabsContent>
 
         {/* Data Shares Tabs */}
        <TabsContent value="pending" className="mt-4 sm:mt-6">
          {renderShareCards(pendingShares, "When patients approve your requests, their data will appear here")}
        </TabsContent>

        <TabsContent value="viewed" className="mt-4 sm:mt-6">
          {renderShareCards(viewedShares, "Data you're currently analyzing will appear here")}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 sm:mt-6">
          {renderShareCards(completedShares, "Completed research data will appear here")}
        </TabsContent>
      </Tabs>

      {/* View Data Dialog */}
      <ResearcherPatientDataDialog
        open={!!viewDataShare}
        onOpenChange={(open) => !open && setViewDataShare(null)}
        shareId={viewDataShare?.id || ""}
        diseaseCategory={viewDataShare?.diseaseCategory}
      />

      {/* Export Data Dialog */}
      <ExportDataDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        shares={researcherShares.map((s) => ({
          id: s.id,
          patient_id: s.patient_id,
          is_anonymized: s.is_anonymized,
          disease_category: s.disease_category,
          status: s.status,
          shared_at: s.shared_at,
          viewed_at: s.viewed_at || null,
          completed_at: s.completed_at || null,
          expires_at: s.expires_at || null,
          research_purpose: s.research_purpose || null,
        }))}
      />
    </div>
  );
};

export default ResearcherDataPage;
