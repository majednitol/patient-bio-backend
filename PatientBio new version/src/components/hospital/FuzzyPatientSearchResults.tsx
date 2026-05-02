import { useFuzzyPatientSearch } from "@/hooks/useFuzzyPatientSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User } from "lucide-react";

interface FuzzyPatientSearchResultsProps {
  nameQuery: string;
  enabled?: boolean;
}

export function FuzzyPatientSearchResults({ nameQuery, enabled = true }: FuzzyPatientSearchResultsProps) {
  const { results, isSearching } = useFuzzyPatientSearch(nameQuery, enabled);

  if (!results.length || isSearching) return null;

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Similar patients found — check before registering
        </div>
        {results.map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-background/60">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{p.display_name}</span>
            {p.phone && <span className="text-muted-foreground">{p.phone}</span>}
            {p.date_of_birth && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                DOB: {p.date_of_birth}
              </Badge>
            )}
            {p.patient_passport_id && (
              <span className="text-[10px] text-muted-foreground font-mono">{p.patient_passport_id}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
