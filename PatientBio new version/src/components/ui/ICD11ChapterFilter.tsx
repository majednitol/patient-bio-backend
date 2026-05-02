import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ICD11_CHAPTERS } from "@/lib/icd11-mapping";
import { Tag } from "lucide-react";

interface ICD11ChapterFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Dropdown filter for ICD-11 chapters. Use in patient records, researcher cohort builder,
 * and pathologist data views to filter by ICD-11 chapter.
 */
export function ICD11ChapterFilter({ value, onChange, className }: ICD11ChapterFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-1.5 flex-nowrap">
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="ICD-11 Chapter" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Chapters</SelectItem>
        {ICD11_CHAPTERS.map((ch) => (
          <SelectItem key={ch.code} value={ch.code}>
            <span className="font-mono text-xs mr-1.5">{ch.code}</span>
            {ch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
