import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PoolEntry {
  disease_categories: string[];
  anonymized_data: Record<string, unknown>;
}

interface MedDiseaseMatrixProps {
  poolData: PoolEntry[];
}

export const MedDiseaseMatrix = ({ poolData }: MedDiseaseMatrixProps) => {
  const { matrix, drugs, diseases } = useMemo(() => {
    // Extract medication classes and disease categories
    const drugDiseaseMap: Record<string, Record<string, number>> = {};
    const drugFreq: Record<string, number> = {};
    const diseaseFreq: Record<string, number> = {};

    poolData.forEach(entry => {
      const meds = entry.anonymized_data?.medications as Array<{ medication_class?: string }> | undefined;
      if (!meds?.length) return;
      const entryDiseases = entry.disease_categories;
      meds.forEach(med => {
        const drugClass = med.medication_class;
        if (!drugClass) return;
        drugFreq[drugClass] = (drugFreq[drugClass] || 0) + 1;
        if (!drugDiseaseMap[drugClass]) drugDiseaseMap[drugClass] = {};
        entryDiseases.forEach(dc => {
          diseaseFreq[dc] = (diseaseFreq[dc] || 0) + 1;
          drugDiseaseMap[drugClass][dc] = (drugDiseaseMap[drugClass][dc] || 0) + 1;
        });
      });
    });

    const topDrugs = Object.entries(drugFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
    const topDiseases = Object.entries(diseaseFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);

    if (topDrugs.length === 0 || topDiseases.length === 0) return { matrix: [], drugs: [], diseases: [] };

    const result: { drug: string; disease: string; count: number }[] = [];
    topDrugs.forEach(drug => {
      topDiseases.forEach(disease => {
        result.push({ drug, disease, count: drugDiseaseMap[drug]?.[disease] || 0 });
      });
    });

    return { matrix: result, drugs: topDrugs, diseases: topDiseases };
  }, [poolData]);

  if (drugs.length === 0 || diseases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medication-Disease Correlation</CardTitle>
          <CardDescription>Requires anonymized medication data in the pool</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground text-sm">No medication data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...matrix.map(m => m.count), 1);

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/30 text-muted-foreground";
    const ratio = count / maxCount;
    if (ratio >= 0.7) return "bg-primary/80 text-primary-foreground";
    if (ratio >= 0.4) return "bg-primary/50 text-primary-foreground";
    if (ratio >= 0.15) return "bg-primary/25 text-foreground";
    return "bg-primary/10 text-foreground";
  };

  const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + "…" : s;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Medication-Disease Correlation</CardTitle>
        <CardDescription>Which drug classes are most commonly used for which diseases</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Column headers (diseases) */}
              <div className="flex">
                <div className="w-28 shrink-0" />
                {diseases.map(d => (
                  <div key={d} className="w-14 shrink-0 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight block" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 60 }}>
                      {truncate(d, 10)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Rows (drug classes) */}
              {drugs.map(drug => (
                <div key={drug} className="flex items-center">
                  <div className="w-28 shrink-0 pr-2 text-right">
                    <span className="text-[10px] font-medium text-muted-foreground truncate block">{truncate(drug, 16)}</span>
                  </div>
                  {diseases.map(disease => {
                    const cell = matrix.find(m => m.drug === drug && m.disease === disease);
                    return (
                      <Tooltip key={disease}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "w-14 h-9 shrink-0 flex items-center justify-center text-[10px] font-semibold border border-background/50 rounded-sm cursor-default",
                            getIntensity(cell?.count || 0)
                          )}>
                            {cell?.count || 0}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{drug} × {disease}: {cell?.count || 0} patients</p>
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
