import { ICD11ChapterBadge } from "@/components/ui/ICD11ChapterBadge";

interface DiseaseCategoryWithICDProps {
  diseaseCategory?: string | null;
  icd11ChapterCode?: string | null;
  icd11Code?: string | null;
  icdStandard?: string | null;
  className?: string;
}

/**
 * Displays disease category text with an inline ICD-11/ICD-10 badge when available.
 * Use across all portals wherever disease_category is rendered.
 */
export function DiseaseCategoryWithICD({
  diseaseCategory,
  icd11ChapterCode,
  icd11Code,
  icdStandard,
  className,
}: DiseaseCategoryWithICDProps) {
  const label = diseaseCategory
    ? diseaseCategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const hasICD = icd11ChapterCode || icd11Code;

  if (!label && !hasICD) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 flex-nowrap ${className ?? ""}`}>
      {label && <span className="text-sm capitalize">{label}</span>}
      {hasICD && (
        <ICD11ChapterBadge
          chapterCode={icd11ChapterCode}
          icdCode={icd11Code}
          icdStandard={icdStandard}
          showLabel={false}
        />
      )}
    </span>
  );
}
