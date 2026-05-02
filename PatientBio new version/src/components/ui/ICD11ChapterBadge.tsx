import { Tag } from "lucide-react";
import { getICD11ChapterByCode } from "@/lib/icd11-mapping";
import { cn } from "@/lib/utils";

interface ICD11ChapterBadgeProps {
  chapterCode?: string | null;
  icdCode?: string | null;
  icdStandard?: string | null;
  className?: string;
  showLabel?: boolean;
}

export function ICD11ChapterBadge({
  chapterCode,
  icdCode,
  icdStandard,
  className,
  showLabel = true,
}: ICD11ChapterBadgeProps) {
  if (!chapterCode && !icdCode) return null;

  const chapter = chapterCode ? getICD11ChapterByCode(chapterCode) : null;
  const isICD11 = icdStandard === "icd11";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold flex-shrink-0",
        isICD11
          ? "bg-chart-2/20 text-chart-2 dark:bg-chart-2/15 dark:text-chart-2"
          : "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary",
        className
      )}
    >
      <Tag className="h-2.5 w-2.5" />
      {icdCode || chapterCode}
      {showLabel && chapter && (
        <span className="font-sans font-normal ml-0.5 opacity-80">
          {chapter.name}
        </span>
      )}
    </span>
  );
}
