import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HardDrive } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BucketStats {
  name: string;
  fileCount: number;
  estimatedSizeMB: number;
}

export default function StorageUsageCard() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-storage-usage-detailed"],
    queryFn: async (): Promise<{ buckets: BucketStats[]; totalFiles: number; totalSizeMB: number }> => {
      const bucketNames = ["health-records", "pathologist-reports", "avatars", "team-profiles", "provider-verifications"];

      const bucketResults = await Promise.all(
        bucketNames.map(async (name) => {
          const { data: files, error } = await supabase.storage.from(name).list("", { limit: 1000 });
          if (error || !files) return null;
          const totalBytes = files.reduce((sum, f) => {
            const meta = f.metadata as Record<string, unknown> | null;
            return sum + ((meta?.size as number) || 50000);
          }, 0);
          return {
            name,
            fileCount: files.length,
            estimatedSizeMB: Math.round(totalBytes / 1024 / 1024 * 10) / 10,
          };
        })
      );
      const buckets = bucketResults.filter((b): b is BucketStats => b !== null);

      const totalFiles = buckets.reduce((s, b) => s + b.fileCount, 0);
      const totalSizeMB = buckets.reduce((s, b) => s + b.estimatedSizeMB, 0);

      return { buckets: buckets.sort((a, b) => b.fileCount - a.fileCount), totalFiles, totalSizeMB };
    },
    staleTime: STALE_TIMES.LONG,
    refetchInterval: 300000,
  });

  const maxFiles = Math.max(...(data?.buckets || []).map((b) => b.fileCount), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          {t("adminHealth.storageUsage")}
        </CardTitle>
        <CardDescription>
          {t("adminHealth.storageDesc", { count: data?.totalFiles || 0, size: data?.totalSizeMB?.toFixed(1) || "0" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.buckets || []).map((b) => (
              <div key={b.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{t("adminHealth.files", { count: b.fileCount })}</span>
                    <Badge variant="outline" className="text-xs">
                      ~{b.estimatedSizeMB} MB
                    </Badge>
                  </div>
                </div>
                <Progress value={(b.fileCount / maxFiles) * 100} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}