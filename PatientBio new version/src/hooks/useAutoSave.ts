import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

interface UseAutoSaveOptions {
  form: UseFormReturn<any>;
  save: (values: any) => Promise<any>;
  transformBeforeSave?: (values: any) => any;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({
  form,
  save,
  transformBeforeSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions) {
  const [autoSaved, setAutoSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValuesRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  // Capture initial values after first data load
  useEffect(() => {
    const vals = form.getValues();
    initialValuesRef.current = JSON.stringify(vals);
  }, [form.formState.defaultValues]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((values) => {
      // Skip if pristine (unchanged from loaded data)
      const current = JSON.stringify(values);
      if (initialValuesRef.current && current === initialValuesRef.current) return;
      if (isSavingRef.current) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        try {
          const payload = transformBeforeSave
            ? transformBeforeSave(form.getValues())
            : form.getValues();
          await save(payload);
          setAutoSaved(true);
          setTimeout(() => setAutoSaved(false), 2000);
        } catch {
          // silent fail for auto-save; manual save still available
        } finally {
          isSavingRef.current = false;
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, debounceMs, form, save, transformBeforeSave]);

  return { autoSaved };
}
