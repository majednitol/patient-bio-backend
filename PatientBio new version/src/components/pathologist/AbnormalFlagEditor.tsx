import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, X, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface AbnormalFlag {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  severity: "low" | "high" | "critical";
  direction: "high" | "low" | "normal";
}

interface AbnormalFlagEditorProps {
  flags: AbnormalFlag[];
  onChange: (flags: AbnormalFlag[]) => void;
  readOnly?: boolean;
}

const severityColors = {
  low: "bg-warning/10 text-warning border-warning/20",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const severityLabels = {
  low: "Mildly Abnormal",
  high: "Moderately Abnormal",
  critical: "Critical",
};

const DirectionIcon = ({ direction }: { direction: AbnormalFlag["direction"] }) => {
  switch (direction) {
    case "high":
      return <TrendingUp className="h-3 w-3" />;
    case "low":
      return <TrendingDown className="h-3 w-3" />;
    default:
      return <Minus className="h-3 w-3" />;
  }
};

export function AbnormalFlagEditor({ flags, onChange, readOnly = false }: AbnormalFlagEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFlag, setNewFlag] = useState<Partial<AbnormalFlag>>({
    name: "",
    value: "",
    unit: "",
    reference_range: "",
    severity: "low",
    direction: "high",
  });

  const handleAddFlag = () => {
    if (newFlag.name && newFlag.value) {
      onChange([...flags, newFlag as AbnormalFlag]);
      setNewFlag({
        name: "",
        value: "",
        unit: "",
        reference_range: "",
        severity: "low",
        direction: "high",
      });
      setIsAdding(false);
    }
  };

  const handleRemoveFlag = (index: number) => {
    const updated = flags.filter((_, i) => i !== index);
    onChange(updated);
  };

  if (readOnly && flags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Abnormal Results
        </Label>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus className="h-3 w-3 mr-1" />
            Flag Result
          </Button>
        )}
      </div>

      {/* Existing flags */}
      {flags.length > 0 && (
        <div className="space-y-2">
          {flags.map((flag, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${severityColors[flag.severity]}`}
            >
              <div className="flex items-center gap-3">
                <DirectionIcon direction={flag.direction} />
                <div>
                  <span className="font-medium">{flag.name}</span>
                  <span className="mx-2">:</span>
                  <span className="font-bold">{flag.value}</span>
                  <span className="text-sm ml-1">{flag.unit}</span>
                  {flag.reference_range && (
                    <span className="text-sm ml-2 opacity-75">
                      (ref: {flag.reference_range})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={severityColors[flag.severity]}>
                  {severityLabels[flag.severity]}
                </Badge>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveFlag(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new flag form */}
      {isAdding && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Parameter Name *</Label>
              <Input
                placeholder="e.g., Hemoglobin"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Value *</Label>
              <Input
                placeholder="e.g., 8.5"
                value={newFlag.value}
                onChange={(e) => setNewFlag({ ...newFlag, value: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Input
                placeholder="e.g., g/dL"
                value={newFlag.unit}
                onChange={(e) => setNewFlag({ ...newFlag, unit: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference Range</Label>
              <Input
                placeholder="e.g., 12.0-16.0"
                value={newFlag.reference_range}
                onChange={(e) => setNewFlag({ ...newFlag, reference_range: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Severity</Label>
              <Select
                value={newFlag.severity}
                onValueChange={(value: AbnormalFlag["severity"]) =>
                  setNewFlag({ ...newFlag, severity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Mildly Abnormal</SelectItem>
                  <SelectItem value="high">Moderately Abnormal</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <Select
                value={newFlag.direction}
                onValueChange={(value: AbnormalFlag["direction"]) =>
                  setNewFlag({ ...newFlag, direction: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Above Normal ↑</SelectItem>
                  <SelectItem value="low">Below Normal ↓</SelectItem>
                  <SelectItem value="normal">Abnormal Pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddFlag}
              disabled={!newFlag.name || !newFlag.value}
            >
              Add Flag
            </Button>
          </div>
        </div>
      )}

      {flags.length === 0 && !isAdding && !readOnly && (
        <p className="text-xs text-muted-foreground">
          No abnormal results flagged. Click "Flag Result" to highlight out-of-range values.
        </p>
      )}
    </div>
  );
}

export function AbnormalFlagBadge({ flags }: { flags: AbnormalFlag[] }) {
  if (flags.length === 0) return null;

  const hasCritical = flags.some((f) => f.severity === "critical");
  const hasHigh = flags.some((f) => f.severity === "high");

  const severity = hasCritical ? "critical" : hasHigh ? "high" : "low";

  return (
    <Badge className={`${severityColors[severity]} flex items-center gap-1`}>
      <AlertTriangle className="h-3 w-3" />
      {flags.length} Abnormal
    </Badge>
  );
}
