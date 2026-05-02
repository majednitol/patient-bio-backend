import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PoolEntry {
  disease_categories: string[];
}

interface ComorbidityHeatmapProps {
  poolData: PoolEntry[];
}

export const ComorbidityHeatmap = ({ poolData }: ComorbidityHeatmapProps) => {
  const { matrix, diseases } = useMemo(() => {
    // Get top diseases by frequency
    const freq: Record<string, number> = {};
    poolData.forEach(d => d.disease_categories.forEach(dc => { freq[dc] = (freq[dc] || 0) + 1; }));
    const topDiseases = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    if (topDiseases.length < 2) return { matrix: [], diseases: topDiseases };

    // Build co-occurrence matrix
    const coMatrix: Record<string, Record<string, number>> = {};
    topDiseases.forEach(a => {
      coMatrix[a] = {};
      topDiseases.forEach(b => { coMatrix[a][b] = 0; });
    });

    poolData.forEach(d => {
      const cats = d.disease_categories.filter(dc => topDiseases.includes(dc));
      for (let i = 0; i < cats.length; i++) {
        for (let j = 0; j < cats.length; j++) {
          coMatrix[cats[i]][cats[j]]++;
        }
      }
    });

    // Convert to percentages (row-relative)
    const result: { row: string; col: string; value: number; count: number }[] = [];
    topDiseases.forEach(row => {
      const rowTotal = coMatrix[row][row] || 1;
      topDiseases.forEach(col => {
        const pct = row === col ? 100 : Math.round((coMatrix[row][col] / rowTotal) * 100);
        result.push({ row, col, value: pct, count: coMatrix[row][col] });
      });
    });

    return { matrix: result, diseases: topDiseases };
  }, [poolData]);

  if (diseases.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comorbidity Heatmap</CardTitle>
          <CardDescription>Need at least 2 disease categories with data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground text-sm">Not enough disease data</p>
        </CardContent>
      </Card>
    );
  }

  const getColor = (value: number, isSelf: boolean) => {
    if (isSelf) return "bg-muted";
    if (value >= 70) return "bg-destructive/80 text-destructive-foreground";
    if (value >= 50) return "bg-destructive/50 text-destructive-foreground";
    if (value >= 30) return "bg-primary/50 text-primary-foreground";
    if (value >= 15) return "bg-primary/25 text-foreground";
    if (value > 0) return "bg-primary/10 text-foreground";
    return "bg-muted/30 text-muted-foreground";
  };

  const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + "…" : s;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comorbidity Heatmap</CardTitle>
        <CardDescription>Co-occurrence rates between disease categories (row → "X% of patients with [row] also have [col]")</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Column headers */}
              <div className="flex">
                <div className="w-24 shrink-0" />
                {diseases.map(col => (
                  <div key={col} className="w-16 shrink-0 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight block" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 64 }}>
                      {truncate(col, 12)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {diseases.map(row => (
                <div key={row} className="flex items-center">
                  <div className="w-24 shrink-0 pr-2 text-right">
                    <span className="text-[10px] font-medium text-muted-foreground truncate block">{truncate(row, 14)}</span>
                  </div>
                  {diseases.map(col => {
                    const cell = matrix.find(m => m.row === row && m.col === col);
                    const isSelf = row === col;
                    return (
                      <Tooltip key={col}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "w-16 h-10 shrink-0 flex items-center justify-center text-[10px] font-semibold border border-background/50 rounded-sm cursor-default transition-colors",
                            getColor(cell?.value || 0, isSelf)
                          )}>
                            {isSelf ? "—" : `${cell?.value || 0}%`}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSelf ? (
                            <p className="text-xs">{row}: {cell?.count || 0} total patients</p>
                          ) : (
                            <p className="text-xs">{cell?.value || 0}% of {row} patients also have {col} ({cell?.count || 0} patients)</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
