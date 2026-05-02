import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface GlobalPoolFiltersProps {
  filters: {
    diseaseCategory?: string;
    ageRange?: string;
    gender?: string;
    jurisdiction?: string;
    dataCategory?: string;
  };
  onFiltersChange: (filters: Record<string, string | undefined>) => void;
  availableDiseases: string[];
  availableJurisdictions: string[];
}

const AGE_RANGES = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90+"];
const DATA_CATS = ["prescriptions", "diagnoses", "vitals", "lab_results", "allergies", "demographics"];

export const GlobalPoolFilters = ({ filters, onFiltersChange, availableDiseases, availableJurisdictions }: GlobalPoolFiltersProps) => {
  const hasFilters = Object.values(filters).some(v => v);

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Disease</label>
        <Select value={filters.diseaseCategory || ""} onValueChange={v => onFiltersChange({ ...filters, diseaseCategory: v || undefined })}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All diseases" /></SelectTrigger>
          <SelectContent>
            {availableDiseases.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Age Range</label>
        <Select value={filters.ageRange || ""} onValueChange={v => onFiltersChange({ ...filters, ageRange: v || undefined })}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All ages" /></SelectTrigger>
          <SelectContent>
            {AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Gender</label>
        <Select value={filters.gender || ""} onValueChange={v => onFiltersChange({ ...filters, gender: v || undefined })}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Jurisdiction</label>
        <Select value={filters.jurisdiction || ""} onValueChange={v => onFiltersChange({ ...filters, jurisdiction: v || undefined })}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            {availableJurisdictions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Data Type</label>
        <Select value={filters.dataCategory || ""} onValueChange={v => onFiltersChange({ ...filters, dataCategory: v || undefined })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            {DATA_CATS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onFiltersChange({})}>
          <RotateCcw className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
};
