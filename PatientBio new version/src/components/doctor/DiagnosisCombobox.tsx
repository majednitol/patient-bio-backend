import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDiagnosisHistory } from "@/hooks/useDiagnosisHistory";
import { useICD10Search } from "@/hooks/useICD10Search";
import { useICD11Search } from "@/hooks/useICD11Search";
import { cn } from "@/lib/utils";
import { Clock, Search, Tag } from "lucide-react";

type ICDStandard = "icd10" | "icd11";

export interface ICDCodeSelection {
  description: string;
  code: string;
  standard: "icd10" | "icd11";
  chapter?: string;
}

interface DiagnosisComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCodeSelect?: (selection: ICDCodeSelection | null) => void;
  placeholder?: string;
}

export function DiagnosisCombobox({
  value,
  onChange,
  onCodeSelect,
  placeholder = "e.g., Upper respiratory infection",
}: DiagnosisComboboxProps) {
  const { data: history = [] } = useDiagnosisHistory();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [icdStandard, setIcdStandard] = useState<ICDStandard>("icd10");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: icd10Results = [] } = useICD10Search(
    icdStandard === "icd10" ? inputValue : "",
  );
  const { data: icd11Results = [] } = useICD11Search(
    icdStandard === "icd11" ? inputValue : "",
  );

  const icdResults = icdStandard === "icd10" ? icd10Results : icd11Results;

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = inputValue.trim()
    ? history.filter((h) =>
        h.diagnosis.toLowerCase().includes(inputValue.toLowerCase())
      )
    : history.slice(0, 8);

  const handleSelect = (diagnosis: string, codeSelection?: ICDCodeSelection | null) => {
    setInputValue(diagnosis);
    onChange(diagnosis);
    onCodeSelect?.(codeSelection ?? null);
    setOpen(false);
  };

  const hasHistory = filtered.length > 0;
  const hasICD = icdResults.length > 0;
  const showDropdown = open && (hasHistory || hasICD || inputValue.trim().length >= 2);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
        />
      </div>
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-72 overflow-y-auto">
          {/* ICD Standard Toggle */}
          <div className="px-3 py-2 border-b border-border bg-muted/30 sticky top-0 z-10">
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted w-fit">
              <button
                type="button"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded transition-all",
                  icdStandard === "icd10"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIcdStandard("icd10");
                }}
              >
                ICD-10
              </button>
              <button
                type="button"
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded transition-all",
                  icdStandard === "icd11"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIcdStandard("icd11");
                }}
              >
                ICD-11
              </button>
            </div>
          </div>

          {/* Recent diagnoses section */}
          {hasHistory && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-[42px]">
                Recent Diagnoses
              </div>
              {filtered.map((item) => (
                <button
                  key={item.diagnosis}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-accent transition-colors",
                    item.diagnosis === inputValue && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item.diagnosis);
                  }}
                >
                  <span className="truncate">{item.diagnosis}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-2">
                    <Clock className="h-3 w-3" />
                    {item.count}×
                  </span>
                </button>
              ))}
            </>
          )}

          {/* ICD suggestions section */}
          {hasICD && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-[42px]">
                {icdStandard === "icd10" ? "ICD-10" : "ICD-11"} Codes
              </div>
              {icdResults.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors",
                    item.description === inputValue && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item.description, {
                      description: item.description,
                      code: item.code,
                      standard: icdStandard === "icd10" ? "icd10" : "icd11",
                      chapter: item.chapter,
                    });
                  }}
                >
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold flex-shrink-0",
                    icdStandard === "icd10"
                      ? "bg-primary/10 text-primary"
                      : "bg-chart-2/20 text-chart-2"
                  )}>
                    <Tag className="h-2.5 w-2.5" />
                    {item.code}
                  </span>
                  <span className="truncate">{item.description}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">
                    {item.category}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Empty state */}
          {!hasHistory && !hasICD && inputValue.trim().length >= 2 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No {icdStandard === "icd10" ? "ICD-10" : "ICD-11"} codes found for "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
