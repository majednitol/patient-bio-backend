import { 
  ClipboardList, 
  TestTube, 
  PackageCheck, 
  Loader2, 
  CheckCircle2, 
  FileCheck,
  Send,
  XCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TimelineStage {
  key: string;
  label: string;
  icon: React.ElementType;
  timestamp: string | null;
  status: "completed" | "current" | "pending";
}

interface SampleTimelineProps {
  order: {
    status: string;
    created_at: string;
    sample_collected_at?: string | null;
    received_at?: string | null;
    processing_started_at?: string | null;
    quality_checked_at?: string | null;
    completed_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
  };
  compact?: boolean;
}

export function SampleTimeline({ order, compact = false }: SampleTimelineProps) {
  const getStageStatus = (stageName: string): "completed" | "current" | "pending" => {
    const statusOrder = [
      "ordered",
      "sample_collected",
      "received",
      "processing",
      "qc_passed",
      "completed",
    ];
    
    // Map order status to stage index
    let currentStageIndex = 0;
    
    if (order.completed_at) currentStageIndex = 5;
    else if (order.quality_checked_at) currentStageIndex = 4;
    else if (order.processing_started_at || order.status === "processing") currentStageIndex = 3;
    else if (order.received_at) currentStageIndex = 2;
    else if (order.sample_collected_at || order.status === "sample_collected") currentStageIndex = 1;
    else currentStageIndex = 0;
    
    const stageIndex = statusOrder.indexOf(stageName);
    
    if (stageIndex < currentStageIndex) return "completed";
    if (stageIndex === currentStageIndex) return "current";
    return "pending";
  };

  const isRejected = order.status === "rejected" || !!order.rejected_at;

  const stages: TimelineStage[] = [
    {
      key: "ordered",
      label: "Order Placed",
      icon: ClipboardList,
      timestamp: order.created_at,
      status: getStageStatus("ordered"),
    },
    {
      key: "sample_collected",
      label: "Sample Collected",
      icon: TestTube,
      timestamp: order.sample_collected_at || null,
      status: getStageStatus("sample_collected"),
    },
    {
      key: "received",
      label: "Received at Lab",
      icon: PackageCheck,
      timestamp: order.received_at || null,
      status: getStageStatus("received"),
    },
    {
      key: "processing",
      label: "Processing",
      icon: Loader2,
      timestamp: order.processing_started_at || null,
      status: getStageStatus("processing"),
    },
    {
      key: "qc_passed",
      label: "Quality Check",
      icon: CheckCircle2,
      timestamp: order.quality_checked_at || null,
      status: getStageStatus("qc_passed"),
    },
    ...(isRejected
      ? [{
          key: "rejected",
          label: `Rejected${order.rejection_reason ? `: ${order.rejection_reason}` : ""}`,
          icon: XCircle,
          timestamp: order.rejected_at || null,
          status: "completed" as const,
        }]
      : [{
          key: "completed",
          label: "Report Ready",
          icon: FileCheck,
          timestamp: order.completed_at || null,
          status: getStageStatus("completed"),
        }]
    ),
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  stage.key === "rejected" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  stage.key !== "rejected" && stage.status === "completed" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  stage.key !== "rejected" && stage.status === "current" && "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 ring-2 ring-teal-500",
                  stage.key !== "rejected" && stage.status === "pending" && "bg-muted text-muted-foreground"
                )}
                title={stage.label}
              >
                <Icon className="h-3 w-3" />
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "w-4 h-0.5 mx-0.5",
                    stage.status === "completed" ? "bg-green-400" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        return (
          <div key={stage.key} className="flex gap-3 pb-4 last:pb-0">
            {/* Line connector */}
            <div className="relative flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors",
                  stage.key === "rejected" && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                  stage.key !== "rejected" && stage.status === "completed" && "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  stage.key !== "rejected" && stage.status === "current" && "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 ring-2 ring-teal-500",
                  stage.key !== "rejected" && stage.status === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", stage.status === "current" && stage.key === "processing" && "animate-spin")} />
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute top-8 w-0.5 h-full -mb-4",
                    stage.status === "completed" ? "bg-green-400" : "bg-muted"
                  )}
                />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  stage.status === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </p>
              {stage.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(stage.timestamp), "MMM d, h:mm a")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
