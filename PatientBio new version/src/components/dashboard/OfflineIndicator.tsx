import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
  compact?: boolean;
}

export const OfflineIndicator = ({ showSyncButton = false, compact = false }: OfflineIndicatorProps) => {
  const { isOnline, pendingSyncCount, lastSyncAt, isSyncing, syncPendingChanges } = useOfflineMode();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        )}
        {pendingSyncCount > 0 && isOnline && (
          <Badge variant="outline" className="text-muted-foreground">
            {pendingSyncCount} pending
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        {isOnline ? (
          <div className="flex items-center gap-2 text-primary">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline Mode</span>
          </div>
        )}
        
        {lastSyncAt && (
          <span className="text-xs text-muted-foreground">
            Last synced {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
          </span>
        )}

        {pendingSyncCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {pendingSyncCount} pending changes
          </Badge>
        )}
      </div>

      {showSyncButton && isOnline && pendingSyncCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={syncPendingChanges}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Sync
            </>
          )}
        </Button>
      )}
    </div>
  );
};
