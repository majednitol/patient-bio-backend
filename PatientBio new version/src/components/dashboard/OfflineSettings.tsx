import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CloudOff, RefreshCw, Trash2, Loader2, Database, CheckCircle } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

export const OfflineSettings = () => {
  const { t } = useTranslation();
  const {
    isOnline, isOfflineCapable, lastSyncAt, pendingSyncCount,
    isSyncing, cacheUserData, syncPendingChanges, clearCache,
  } = useOfflineMode();

  const [isCaching, setIsCaching] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleCacheData = async () => { setIsCaching(true); await cacheUserData(); setIsCaching(false); };
  const handleClearCache = async () => { setIsClearing(true); await clearCache(); setIsClearing(false); };

  const cachedItems = [
    t("offlineAccess.profileInfo"), t("offlineAccess.bloodGroup"), t("offlineAccess.allergies"),
    t("offlineAccess.medications"), t("offlineAccess.emergencyContact"), t("offlineAccess.healthPassportId"),
    t("offlineAccess.prescriptions"), t("offlineAccess.consentRecords"), t("offlineAccess.healthPassport"),
  ];

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudOff className="h-5 w-5 text-primary" />
          {t("offlineAccess.title")}
        </CardTitle>
        <CardDescription>{t("offlineAccess.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">{t("offlineAccess.offlineMode")}</Label>
            <p className="text-sm text-muted-foreground">{t("offlineAccess.cacheHealthData")}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOfflineCapable && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <CheckCircle className="h-3 w-3 mr-1" />{t("offlineAccess.enabled")}
              </Badge>
            )}
            <Switch checked={isOfflineCapable} disabled />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Database className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{isOnline ? t("offlineAccess.connected") : t("offlineAccess.offline")}</p>
            {lastSyncAt && <p className="text-xs text-muted-foreground">{t("offlineAccess.lastCached")} {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}</p>}
          </div>
          {pendingSyncCount > 0 && <Badge variant="outline">{t("offlineAccess.pending", { count: pendingSyncCount })}</Badge>}
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">{t("offlineAccess.cachedData")}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {cachedItems.map((item) => (
              <div key={item} className="flex items-center gap-2 p-2 bg-muted rounded">
                <CheckCircle className="h-3 w-3 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCacheData} disabled={isCaching || !isOnline}>
            {isCaching ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("offlineAccess.caching")}</>) : (<><RefreshCw className="mr-2 h-4 w-4" />{t("offlineAccess.refreshCache")}</>)}
          </Button>
          {pendingSyncCount > 0 && isOnline && (
            <Button variant="default" className="flex-1" onClick={syncPendingChanges} disabled={isSyncing}>
              {isSyncing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("offlineAccess.syncing")}</>) : (<><RefreshCw className="mr-2 h-4 w-4" />{t("offlineAccess.syncChanges", { count: pendingSyncCount })}</>)}
            </Button>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isClearing}>
              {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t("offlineAccess.clearOfflineData")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("offlineAccess.clearTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("offlineAccess.clearDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCache} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("offlineAccess.clearCache")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-xs text-muted-foreground">{t("offlineAccess.privacyNote")}</p>
      </CardContent>
    </Card>
  );
};