import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Eye, Radio, MapPin, Users, Activity, Sparkles } from "lucide-react";

const ALL_DATA_CATEGORIES = ['prescriptions', 'diagnoses', 'vitals', 'lab_results', 'allergies', 'demographics'];

interface DataCatalogCardProps {
  disease: string;
  count: number;
  totalRecords: number;
  completenessScore: number;
  jurisdictions: string[];
  topComorbidities: string[];
  qualityScore: number;
  freshnessLabel: "Fresh" | "Recent" | "Aging" | "Stale";
  medianAgeDays: number;
  genderSplit: { male: number; female: number; other: number };
  dataCategoryCoverage: Record<string, number>;
  onExplore: () => void;
  onRequestData: () => void;
}

const freshnessColors: Record<string, string> = {
  Fresh: "bg-green-500/15 text-green-700 dark:text-green-400",
  Recent: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Aging: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Stale: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const qualityColor = (score: number) => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

export const DataCatalogCard = ({
  disease,
  count,
  totalRecords,
  completenessScore,
  jurisdictions,
  topComorbidities,
  qualityScore,
  freshnessLabel,
  medianAgeDays,
  genderSplit,
  dataCategoryCoverage,
  onExplore,
  onRequestData,
}: DataCatalogCardProps) => {
  const percentage = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
  const genderTotal = genderSplit.male + genderSplit.female + genderSplit.other || 1;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base capitalize leading-tight">
            {disease.replace(/_/g, " ")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs shrink-0">
            {count} records
          </Badge>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${freshnessColors[freshnessLabel]}`}>
            {freshnessLabel}
          </Badge>
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${qualityColor(qualityScore)}`}>
            <Sparkles className="h-3 w-3" />
            {qualityScore}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {/* Pool share */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pool Share</span>
            <span>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-1.5" />
        </div>

        {/* Data Category Coverage mini-bar */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" /> Data Coverage
          </span>
          <div className="flex gap-0.5">
            {ALL_DATA_CATEGORIES.map((cat) => {
              const pct = dataCategoryCoverage[cat] || 0;
              return (
                <div
                  key={cat}
                  className="flex-1 h-2 rounded-sm bg-muted overflow-hidden"
                  title={`${cat.replace(/_/g, " ")}: ${pct}%`}
                >
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Rx</span><span>Dx</span><span>Vit</span><span>Lab</span><span>Alg</span><span>Dem</span>
          </div>
        </div>

        {/* Gender Distribution mini-bar */}
        <div className="space-y-0.5">
          <span className="text-xs text-muted-foreground">Gender Split</span>
          <div className="flex h-2 rounded-sm overflow-hidden">
            <div className="bg-blue-500/70" style={{ width: `${(genderSplit.male / genderTotal) * 100}%` }} title={`Male: ${genderSplit.male}`} />
            <div className="bg-pink-500/70" style={{ width: `${(genderSplit.female / genderTotal) * 100}%` }} title={`Female: ${genderSplit.female}`} />
            <div className="bg-muted-foreground/40" style={{ width: `${(genderSplit.other / genderTotal) * 100}%` }} title={`Other: ${genderSplit.other}`} />
          </div>
          <div className="flex gap-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500/70 inline-block" />M:{genderSplit.male}</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-500/70 inline-block" />F:{genderSplit.female}</span>
            {genderSplit.other > 0 && <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />O:{genderSplit.other}</span>}
          </div>
        </div>

        {/* Jurisdictions */}
        {jurisdictions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {jurisdictions.slice(0, 3).map((j) => (
              <Badge key={j} variant="outline" className="text-[10px] px-1.5">{j}</Badge>
            ))}
            {jurisdictions.length > 3 && (
              <span className="text-xs text-muted-foreground">+{jurisdictions.length - 3}</span>
            )}
          </div>
        )}

        {/* Comorbidities */}
        {topComorbidities.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Users className="h-3 w-3 text-muted-foreground" />
            {topComorbidities.slice(0, 2).map((c) => (
              <Badge key={c} variant="outline" className="text-[10px] px-1.5 capitalize">
                {c.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onExplore} className="flex-1 gap-1">
            <Eye className="h-3 w-3" /> Explore
          </Button>
          <Button size="sm" onClick={onRequestData} className="flex-1 gap-1">
            <Radio className="h-3 w-3" /> Request
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
