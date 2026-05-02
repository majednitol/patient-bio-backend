import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Trash2, Loader2 } from "lucide-react";
import { clearOfflineData } from "@/lib/offlineDB";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function StorageUsage() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const fetchUsage = useCallback(async () => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const est = await navigator.storage.estimate();
      setUsage({ used: est.usage || 0, quota: est.quota || 0 });
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleClear = async () => {
    setIsClearing(true);
    await clearOfflineData();
    await fetchUsage();
    setIsClearing(false);
  };

  const percent = usage ? Math.min((usage.used / usage.quota) * 100, 100) : 0;

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-5 w-5 text-primary" />
          Storage Usage
        </CardTitle>
        <CardDescription>Offline cache and app data on this device</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">{formatBytes(usage.used)} / {formatBytes(usage.quota)}</span>
              </div>
              <Progress value={percent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {percent < 1 ? "<1" : percent.toFixed(0)}% of available storage
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                  {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear cached data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear offline cache?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all locally cached health data. Your actual records are safe in the cloud and will re-sync when online.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Storage info not available</p>
        )}
      </CardContent>
    </Card>
  );
}
