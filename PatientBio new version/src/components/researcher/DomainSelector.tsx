import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const RESEARCH_DOMAINS = [
  { value: "oncology", label: "Oncology" },
  { value: "cardiology", label: "Cardiology" },
  { value: "neurology", label: "Neurology" },
  { value: "genomics", label: "Genomics" },
  { value: "epidemiology", label: "Epidemiology" },
  { value: "pharmacology", label: "Pharmacology" },
  { value: "immunology", label: "Immunology" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "pulmonology", label: "Pulmonology" },
  { value: "infectious_disease", label: "Infectious Disease" },
  { value: "rare_diseases", label: "Rare Diseases" },
  { value: "public_health", label: "Public Health" },
  { value: "mental_health", label: "Mental Health" },
  { value: "pediatrics", label: "Pediatrics" },
] as const;

export type ResearchDomain = typeof RESEARCH_DOMAINS[number]["value"];

interface DomainSelectorProps {
  value: string[];
  onChange: (domains: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
}

export const DomainSelector = ({
  value,
  onChange,
  multiple = true,
  placeholder = "Select research domain(s)",
  className,
}: DomainSelectorProps) => {
  const toggle = (domain: string) => {
    if (!multiple) {
      onChange(value.includes(domain) ? [] : [domain]);
      return;
    }
    onChange(
      value.includes(domain)
        ? value.filter((d) => d !== domain)
        : [...value, domain]
    );
  };

  const selectedLabels = RESEARCH_DOMAINS.filter((d) => value.includes(d.value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedLabels.length > 0 ? (
              selectedLabels.slice(0, 3).map((d) => (
                <Badge key={d.value} variant="secondary" className="text-xs">
                  {d.label}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(d.value);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selectedLabels.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{selectedLabels.length - 3} more
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {RESEARCH_DOMAINS.map((domain) => (
              <button
                key={domain.value}
                onClick={() => toggle(domain.value)}
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted text-sm text-left"
              >
                <Checkbox checked={value.includes(domain.value)} />
                <span>{domain.label}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

interface SingleDomainSelectorProps {
  value: string | null;
  onChange: (domain: string | null) => void;
  className?: string;
}

export const SingleDomainSelector = ({ value, onChange, className }: SingleDomainSelectorProps) => {
  return (
    <DomainSelector
      value={value ? [value] : []}
      onChange={(domains) => onChange(domains[0] || null)}
      multiple={false}
      placeholder="Select primary domain"
      className={className}
    />
  );
};
