import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSyncEvents, subscribeSyncEvents, type SyncEvent } from "@/lib/syncUtils";
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, RefreshCw, XCircle, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<SyncEvent["type"], React.ReactNode> = {
  incoming: <ArrowDownLeft className="h-3.5 w-3.5 text-primary" />,
  outgoing: <ArrowUpRight className="h-3.5 w-3.5 text-primary" />,
  conflict: <AlertTriangle className="h-3.5 w-3.5 text-accent-foreground" />,
  retry: <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

const badgeVariantMap: Record<SyncEvent["type"], "default" | "secondary" | "destructive" | "outline"> = {
  incoming: "secondary",
  outgoing: "default",
  conflict: "outline",
  retry: "secondary",
  error: "destructive",
};

export function SyncActivityTimeline() {
  const { t } = useTranslation();
  const events = useSyncExternalStore(subscribeSyncEvents, getSyncEvents, getSyncEvents);
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const displayed = expanded ? events.slice(0, 20) : events.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          {t("pwa.syncActivity")}
          <Badge variant="secondary" className="text-xs">{events.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {displayed.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-2.5 py-1.5 text-sm"
            >
              <div className="mt-0.5 shrink-0">{iconMap[ev.type]}</div>
              <div className="min-w-0 flex-1">
                <span className="text-foreground">{ev.detail}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  · {ev.table}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
        {events.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t("common.showLess") : t("common.showMore")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
