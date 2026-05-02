import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { FileUp, FileDown, FilePlus, FileEdit, Trash2, Share2, User, Stethoscope, FlaskConical, GraduationCap, Building2, Bot, Server, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useResourceProvenance, useUserProvenance } from "@/hooks/useDataProvenance";
import type { ProvenanceRecord, ActivityType, AgentType } from "@/lib/provenanceTracker";
import { getActivityDisplayName, getAgentDisplayName, getSourceSystemDisplayName } from "@/lib/provenanceTracker";

interface ProvenanceTimelineProps {
  resourceType?: string;
  resourceId?: string;
  showResourceInfo?: boolean;
  limit?: number;
}

const activityIcons: Record<ActivityType, React.ElementType> = { create: FilePlus, update: FileEdit, delete: Trash2, import: FileUp, export: FileDown, share: Share2 };
const activityColors: Record<ActivityType, string> = { create: "bg-green-500", update: "bg-blue-500", delete: "bg-red-500", import: "bg-purple-500", export: "bg-orange-500", share: "bg-teal-500" };
const agentIcons: Record<AgentType, React.ElementType> = { patient: User, doctor: Stethoscope, pathologist: FlaskConical, researcher: GraduationCap, hospital: Building2, system: Bot, external_ehr: Server };

function ProvenanceItem({ record, showResourceInfo }: { record: ProvenanceRecord; showResourceInfo?: boolean }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ActivityIcon = activityIcons[record.activity_type] || FileEdit;
  const AgentIcon = agentIcons[record.agent_type] || User;
  const colorClass = activityColors[record.activity_type] || "bg-gray-500";

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border last:hidden" />
      <div className={`absolute left-0 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center`}><ActivityIcon className="h-3 w-3 text-white" /></div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{getActivityDisplayName(record.activity_type)}</span>
              {showResourceInfo && <Badge variant="outline" className="text-xs">{record.target_resource_type}</Badge>}
              <span className="text-muted-foreground text-sm">{t("provenance.by")} <span className="inline-flex items-center gap-1"><AgentIcon className="h-3 w-3" />{record.agent_name || getAgentDisplayName(record.agent_type)}</span></span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{format(new Date(record.recorded_at), "MMM d, yyyy 'at' h:mm a")}</span>
              {record.source_system && <><span>•</span><span>{getSourceSystemDisplayName(record.source_system)}</span></>}
            </div>
          </div>
          <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-3">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">{t("provenance.resourceType")}</span><span className="ml-2 font-medium">{record.target_resource_type}</span></div>
              <div><span className="text-muted-foreground">{t("provenance.resourceId")}</span><span className="ml-2 font-mono text-xs">{record.target_resource_id.slice(0, 8)}...</span></div>
              {record.source_document && <div className="col-span-2"><span className="text-muted-foreground">{t("provenance.sourceDocument")}</span><span className="ml-2">{record.source_document}</span></div>}
              {record.source_version && <div><span className="text-muted-foreground">{t("provenance.formatVersion")}</span><span className="ml-2">{record.source_version}</span></div>}
              {record.policy_reference && <div className="col-span-2"><span className="text-muted-foreground">{t("provenance.policyReference")}</span><span className="ml-2">{record.policy_reference}</span></div>}
            </div>
            {record.metadata && Object.keys(record.metadata).length > 0 && (
              <div className="border-t pt-2 mt-2"><span className="text-muted-foreground">{t("provenance.additionalDetails")}</span><pre className="mt-1 text-xs bg-background p-2 rounded overflow-x-auto">{JSON.stringify(record.metadata, null, 2)}</pre></div>
            )}
            {record.signature && <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><Info className="h-4 w-4" /><span>{t("provenance.digitallySigned")}</span></div>}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ProvenanceTimelineSkeleton() {
  return (<div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="pl-8 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>))}</div>);
}

export function ProvenanceTimeline({ resourceType, resourceId, showResourceInfo = true, limit = 50 }: ProvenanceTimelineProps) {
  const { t } = useTranslation();
  const resourceQuery = useResourceProvenance(resourceType || "", resourceId || null);
  const userQuery = useUserProvenance(limit);
  const isResourceMode = !!(resourceType && resourceId);
  const { data: records, isLoading, error } = isResourceMode ? resourceQuery : userQuery;

  if (isLoading) return <ProvenanceTimelineSkeleton />;
  if (error) return <div className="text-center py-8 text-muted-foreground"><p>{t("provenance.failedToLoad")}</p></div>;
  if (!records || records.length === 0) return (
    <div className="text-center py-8 text-muted-foreground"><FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("provenance.noRecords")}</p><p className="text-sm mt-1">{t("provenance.auditCompliance")}</p></div>
  );

  return (<div className="relative">{records.map((record) => (<ProvenanceItem key={record.id} record={record} showResourceInfo={showResourceInfo && !isResourceMode} />))}</div>);
}

interface ProvenanceTimelineCardProps { title?: string; resourceType?: string; resourceId?: string; limit?: number; }

export function ProvenanceTimelineCard({ title, resourceType, resourceId, limit = 10 }: ProvenanceTimelineCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2"><FileUp className="h-4 w-4" />{title || t("provenance.title")}</CardTitle>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent className="max-w-xs"><p>{t("provenance.tooltipDesc")}</p></TooltipContent></Tooltip></TooltipProvider>
      </CardHeader>
      <CardContent><ProvenanceTimeline resourceType={resourceType} resourceId={resourceId} limit={limit} /></CardContent>
    </Card>
  );
}

export default ProvenanceTimeline;