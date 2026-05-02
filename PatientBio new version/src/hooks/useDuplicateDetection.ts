import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type HealthRecord = Tables<"health_records">;

interface DuplicateWarning {
  recordId: string;
  similarRecordId: string;
  similarDate: string;
  reason: string;
}

const DATE_PROXIMITY_DAYS = 7;

export function useDuplicateDetection(records: HealthRecord[]) {
  const duplicates = useMemo(() => {
    const warnings: Map<string, DuplicateWarning> = new Map();

    for (let i = 0; i < records.length; i++) {
      const a = records[i];
      if (!a.record_date) continue;

      for (let j = i + 1; j < records.length; j++) {
        const b = records[j];
        if (!b.record_date) continue;

        // Same disease category
        if (a.disease_category !== b.disease_category) continue;

        // Same record category (lab_result, prescription, etc.)
        if (a.category !== b.category) continue;

        // Date proximity
        const daysDiff = Math.abs(
          differenceInDays(new Date(a.record_date), new Date(b.record_date))
        );
        if (daysDiff > DATE_PROXIMITY_DAYS) continue;

        // Same provider (if both have provider)
        const sameProvider =
          a.provider_name &&
          b.provider_name &&
          a.provider_name.toLowerCase() === b.provider_name.toLowerCase();

        // Similar title
        const similarTitle =
          a.title.toLowerCase().includes(b.title.toLowerCase().split(" ")[0]) ||
          b.title.toLowerCase().includes(a.title.toLowerCase().split(" ")[0]);

        if (sameProvider || similarTitle) {
          // Mark the newer record as potential duplicate
          const [newer, older] =
            new Date(a.record_date) > new Date(b.record_date) ? [a, b] : [b, a];

          if (!warnings.has(newer.id)) {
            warnings.set(newer.id, {
              recordId: newer.id,
              similarRecordId: older.id,
              similarDate: older.record_date!,
              reason: sameProvider
                ? `Similar record from ${older.provider_name}`
                : `Similar record "${older.title}"`,
            });
          }
        }
      }
    }

    return warnings;
  }, [records]);

  const getDuplicateWarning = (recordId: string): DuplicateWarning | undefined =>
    duplicates.get(recordId);

  const hasDuplicates = duplicates.size > 0;

  return { getDuplicateWarning, hasDuplicates, duplicateCount: duplicates.size };
}
