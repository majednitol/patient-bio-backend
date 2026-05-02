import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, User, Heart, AlertTriangle, Pill, FileText, Phone, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SharedScopes {
  all: boolean;
  profile: boolean;
  health_summary: boolean;
  allergies: boolean;
  medications: boolean;
  records: boolean;
  record_ids: string[];
  categories: string[];
  emergency_contact: boolean;
  clinical_records: boolean;
}

export const DEFAULT_SCOPES: SharedScopes = {
  all: true,
  profile: true,
  health_summary: true,
  allergies: true,
  medications: true,
  records: true,
  record_ids: [],
  categories: [],
  emergency_contact: false,
  clinical_records: true,
};

interface DataScopeSelectorProps {
  scopes: SharedScopes;
  onChange: (scopes: SharedScopes) => void;
  compact?: boolean;
}

const SCOPE_ITEMS = [
  { key: "profile" as const, label: "Profile Info", description: "Name, age, gender, location", icon: User },
  { key: "health_summary" as const, label: "Health Summary", description: "Blood group, height, chronic conditions", icon: Heart },
  { key: "allergies" as const, label: "Allergies", description: "Known allergies and sensitivities", icon: AlertTriangle },
  { key: "medications" as const, label: "Medications", description: "Current medications", icon: Pill },
  { key: "records" as const, label: "Medical Records", description: "Uploaded prescriptions and documents", icon: FileText },
  { key: "emergency_contact" as const, label: "Emergency Contact", description: "Emergency contact details", icon: Phone },
  { key: "clinical_records" as const, label: "Clinical Records", description: "Diagnoses, comorbidities, investigations, treatments, care team", icon: ClipboardList },
];

const DataScopeSelector = ({ scopes, onChange, compact = false }: DataScopeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(!compact);

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onChange({ ...DEFAULT_SCOPES, all: true });
    } else {
      onChange({
        ...scopes,
        all: false,
      });
    }
  };

  const handleToggleScope = (key: keyof SharedScopes, checked: boolean) => {
    const newScopes = { ...scopes, [key]: checked, all: false };
    // Check if all individual scopes are enabled
    const allEnabled = SCOPE_ITEMS.every(item => 
      item.key === key ? checked : newScopes[item.key]
    );
    if (allEnabled) {
      newScopes.all = true;
    }
    onChange(newScopes);
  };

  const enabledCount = scopes.all 
    ? SCOPE_ITEMS.length 
    : SCOPE_ITEMS.filter(item => scopes[item.key]).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Data to Share</span>
            <Badge variant="secondary" className="text-xs">
              {scopes.all ? "All Data" : `${enabledCount}/${SCOPE_ITEMS.length}`}
            </Badge>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        {/* Share All Toggle */}
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="share-all" className="text-sm font-medium cursor-pointer">
            Share Everything
          </Label>
          <Switch
            id="share-all"
            checked={scopes.all}
            onCheckedChange={handleToggleAll}
          />
        </div>

        {!scopes.all && (
          <div className="space-y-2 border-t pt-3">
            {SCOPE_ITEMS.map(({ key, label, description, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between py-1.5 sm:py-2 px-1"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs sm:text-sm font-medium">{label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={!!scopes[key]}
                  onCheckedChange={(checked) => handleToggleScope(key, checked)}
                />
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DataScopeSelector;
