import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  ClipboardList, 
  FileText, 
  History, 
  Microscope,
  Heart,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { PathologistDataImportDialog } from "@/components/pathologist/PathologistDataImportDialog";
import { ReportsDataSummaryStrip } from "@/components/pathologist/ReportsDataSummaryStrip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const IMPORT_CARDS = [
  {
    id: "test_catalog",
    title: "Test Catalog",
    description: "Import your lab's test menu with prices, reference ranges, and turnaround times",
    icon: ClipboardList,
    color: "bg-teal-500",
  },
  {
    id: "report_templates",
    title: "Custom Templates",
    description: "Import lab-specific report structures beyond the built-in templates",
    icon: FileText,
    color: "bg-cyan-500",
  },
  {
    id: "historical_reports",
    title: "Historical Reports",
    description: "Import past report metadata for patient reference and continuity",
    icon: History,
    color: "bg-emerald-500",
  },
];

const PathologistDataImportPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [retryImportId, setRetryImportId] = useState<string | null>(null);
  const { user } = useAuth();

  const itemsPerPage = 10;

  const { data: recentImports } = useQuery({
    queryKey: ["pathologist-imports", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_import_logs")
        .select("id, provider_id, provider_type, import_type, source_filename, total_records, imported_records, skipped_records, error_records, status, created_at")
        .eq("provider_id", user?.id)
        .eq("provider_type", "pathologist")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: allImports } = useQuery({
    queryKey: ["pathologist-imports-full", user?.id, historyPage],
    queryFn: async () => {
      const offset = (historyPage - 1) * itemsPerPage;
      const { data, count } = await supabase
        .from("provider_import_logs")
        .select("*", { count: "exact" })
        .eq("provider_id", user?.id)
        .eq("provider_type", "pathologist")
        .order("created_at", { ascending: false })
        .range(offset, offset + itemsPerPage - 1);
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.id && showFullHistory,
  });

  const totalPages = allImports ? Math.ceil(allImports.count / itemsPerPage) : 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ReportsDataSummaryStrip />
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Import Data</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <Heart className="h-4 w-4" />
            Bulk import your lab's catalog and reports
          </p>
        </div>
      </div>

      {/* Quick Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {IMPORT_CARDS.map((card) => (
          <Card 
            key={card.id}
            className="diagnostic-card hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => {
              setPreselectedType(card.id);
              setDialogOpen(true);
            }}
          >
            <CardContent className="p-6">
              <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{card.description}</p>
              <div className="flex items-center text-[hsl(var(--diagnostic-primary))] text-sm font-medium group-hover:gap-2 transition-all">
                <span>Import Now</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open Import Dialog Button */}
      <Card className="diagnostic-card">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[hsl(var(--diagnostic-primary))]/10">
              <Upload className="h-6 w-6 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <h3 className="font-semibold">Start New Import</h3>
              <p className="text-sm text-muted-foreground">
                Upload CSV files with your test catalog, templates, or historical data
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                  CSV Supported
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                  FHIR — Coming Soon
                </Badge>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="diagnostic-gradient text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </CardContent>
      </Card>

      {/* Recent Imports */}
      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            {showFullHistory ? "All Imports" : "Recent Imports"}
          </CardTitle>
          <CardDescription>
            {showFullHistory ? "Complete import history with pagination" : "Your import history"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showFullHistory && recentImports && recentImports.length > 0 ? (
            <div className="space-y-3">
              {recentImports.map((log: any) => (
                <ImportHistoryRow key={log.id} log={log} onRetry={() => {
                  setRetryImportId(log.id);
                  setDialogOpen(true);
                }} />
              ))}
            </div>
          ) : showFullHistory && allImports?.data && allImports.data.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {allImports.data.map((log: any) => (
                  <ImportHistoryRow key={log.id} log={log} onRetry={() => {
                    setRetryImportId(log.id);
                    setDialogOpen(true);
                  }} />
                ))}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                  disabled={historyPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {historyPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(Math.min(totalPages, historyPage + 1))}
                  disabled={historyPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No imports yet</p>
              <p className="text-sm">Start by importing your test catalog</p>
            </div>
          )}
          
          {!showFullHistory && recentImports && recentImports.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowFullHistory(true);
                setHistoryPage(1);
              }}
            >
              View All History
            </Button>
          )}
          
          {showFullHistory && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowFullHistory(false)}
            >
              Hide Full History
            </Button>
          )}
        </CardContent>
      </Card>

      <PathologistDataImportDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setPreselectedType(null);
            setRetryImportId(null);
          }
        }}
        defaultImportType={preselectedType}
        retryImportId={retryImportId}
      />
    </div>
  );
};

interface ImportHistoryRowProps {
  log: any;
  onRetry: () => void;
}

function ImportHistoryRow({ log, onRetry }: ImportHistoryRowProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "test_catalog":
        return <ClipboardList className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />;
      case "report_templates":
        return <FileText className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />;
      default:
        return <History className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-primary))]/10">
          {getIcon(log.import_type)}
        </div>
        <div>
          <p className="font-medium text-sm capitalize">
            {log.import_type?.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
          className={log.status === "completed" ? "bg-green-600" : ""}
        >
          {log.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {log.imported_records || 0} imported
        </span>
        {log.status === "failed" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            title="Retry import"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default PathologistDataImportPage;
