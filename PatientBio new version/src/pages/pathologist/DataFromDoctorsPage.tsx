import { useState, useMemo } from "react";
import { useDoctorPathologistShares, DoctorPathologistShare } from "@/hooks/useDoctorPathologistShares";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle, 
  Eye,
  Loader2,
  Stethoscope,
  Heart,
  Search,
  Inbox,
  AlertTriangle
} from "lucide-react";
import { ShareCard } from "@/components/pathologist/ShareCard";
import { PatientDetailsDialog } from "@/components/pathologist/PatientDetailsDialog";
import { DataSharingSummaryStrip } from "@/components/pathologist/DataSharingSummaryStrip";
import { differenceInHours } from "date-fns";

const DataFromDoctorsPage = () => {
  const { 
    receivedShares, 
    isLoading, 
    markAsViewed, 
    markAsCompleted 
  } = useDoctorPathologistShares();

  const [selectedShare, setSelectedShare] = useState<DoctorPathologistShare | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "waiting">("waiting");

  // Disease category colors
  const getCategoryColor = (category: string | null) => {
    if (!category) return "bg-gray-100 text-gray-700";
    const colors: Record<string, string> = {
      cancer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      heart_disease: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      infectious_disease: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      diabetes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      respiratory: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return colors[category] || "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
  };

  // Search against resolved names instead of UUIDs
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return receivedShares;
    const q = searchQuery.toLowerCase();
    return receivedShares.filter(
      (s) =>
        s.disease_category?.toLowerCase().includes(q) ||
        s.doctor_name?.toLowerCase().includes(q) ||
        s.patient_name?.toLowerCase().includes(q)
    );
  }, [receivedShares, searchQuery]);

  const pendingShares = filtered.filter((s) => s.status === "pending");
  const viewedShares = filtered.filter((s) => s.status === "viewed");
  const completedShares = filtered.filter((s) => s.status === "completed");

  // Sort pending shares by waiting time (longest first) if selected
  const sortedPendingShares = useMemo(() => {
    if (sortBy === "waiting") {
      return [...pendingShares].sort((a, b) => {
        const aHours = differenceInHours(new Date(), new Date(a.shared_at));
        const bHours = differenceInHours(new Date(), new Date(b.shared_at));
        return bHours - aHours;
      });
    }
    return pendingShares;
  }, [pendingShares, sortBy]);

  // Stats from all shares (unfiltered)
  const totalCount = receivedShares.length;
  const pendingCount = receivedShares.filter((s) => s.status === "pending").length;
  const inProgressCount = receivedShares.filter((s) => s.status === "viewed").length;
  const completedCount = receivedShares.filter((s) => s.status === "completed").length;

  const handleViewPatient = (share: DoctorPathologistShare) => {
    setSelectedShare(share);
    setDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground">Loading referrals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <DataSharingSummaryStrip />

      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">
          Patients Waiting for You{totalCount > 0 && ` (${totalCount})`}
        </h1>
        <p className="text-muted-foreground">
          Patient data shared by doctors for your expert diagnostic analysis
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={totalCount} icon={<Inbox className="h-4 w-4 text-teal-600" />} bgClass="bg-teal-50" />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="h-4 w-4 text-amber-600" />} bgClass="bg-amber-50" />
        <StatCard label="In Progress" value={inProgressCount} icon={<Eye className="h-4 w-4 text-cyan-600" />} bgClass="bg-cyan-50" />
        <StatCard label="Completed" value={completedCount} icon={<CheckCircle className="h-4 w-4 text-green-600" />} bgClass="bg-green-50" />
      </div>

      {/* Search + Sort */}
      <div className="flex gap-4 items-end">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by doctor, patient, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "recent" | "waiting")}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="recent">Sort: Recent First</option>
          <option value="waiting">Sort: Longest Waiting</option>
        </select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-teal-50/50 border border-teal-100">
          <TabsTrigger 
            value="pending" 
            className="relative data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending
            {pendingShares.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-600 text-white text-xs">
                {pendingShares.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="viewed"
            className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            In Progress
            {viewedShares.length > 0 && (
              <span className="ml-2 text-muted-foreground text-xs">
                ({viewedShares.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed
            {completedShares.length > 0 && (
              <span className="ml-2 text-muted-foreground text-xs">
                ({completedShares.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {sortedPendingShares.length === 0 ? (
            <EmptyState icon={Stethoscope} title="All Caught Up!" description="No pending referrals at the moment. New patient data from doctors will appear here." />
          ) : (
            sortedPendingShares.map((share) => (
              <div key={share.id} className="relative">
                <WaitingTimeBadge sharedAt={share.shared_at} />
                <ShareCard 
                  share={share}
                  categoryColor={getCategoryColor(share.disease_category)}
                  onMarkViewed={markAsViewed}
                  onMarkCompleted={markAsCompleted}
                  onViewPatient={handleViewPatient}
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="viewed" className="space-y-4">
          {viewedShares.length === 0 ? (
            <EmptyState icon={Eye} title="No Cases In Progress" description="Cases you're currently working on will appear here" />
          ) : (
            viewedShares.map((share) => (
              <ShareCard 
                key={share.id} 
                share={share}
                onMarkCompleted={markAsCompleted}
                onViewPatient={handleViewPatient}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedShares.length === 0 ? (
            <EmptyState icon={Heart} title="No Completed Cases Yet" description="Your completed diagnostic work will be recorded here." />
          ) : (
            completedShares.map((share) => (
              <ShareCard 
                key={share.id} 
                share={share} 
                showActions={false}
                onViewPatient={handleViewPatient}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Patient Details Dialog */}
      {selectedShare && (
        <PatientDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          share={selectedShare}
        />
      )}
    </div>
  );
};

// --- Small extracted sub-components ---

function StatCard({ label, value, icon, bgClass }: { label: string; value: number; icon: React.ReactNode; bgClass: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgClass}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WaitingTimeBadge({ sharedAt }: { sharedAt: string }) {
  const hours = differenceInHours(new Date(), new Date(sharedAt));
  if (hours < 24) return null;

  const isUrgent = hours >= 48;
  return (
    <Badge
      className={`absolute -top-2 right-2 z-10 text-[10px] gap-1 ${
        isUrgent
          ? "bg-red-100 text-red-700 hover:bg-red-100"
          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
      }`}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {isUrgent ? `${Math.floor(hours / 24)}d waiting` : "24h+ waiting"}
    </Badge>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <Card className="diagnostic-card">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-teal-300" />
        </div>
        <h3 className="font-medium text-lg text-gray-800">{title}</h3>
        <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

export default DataFromDoctorsPage;
