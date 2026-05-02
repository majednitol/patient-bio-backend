import { useState } from "react";
import { useAutoApproveRules } from "@/hooks/useAutoApproveRules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";

const DISEASE_CATEGORIES = [
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "general", label: "General" },
];

const REQUESTER_TYPES = [
  { value: "any", label: "Any provider" },
  { value: "doctor", label: "Doctors only" },
  { value: "researcher", label: "Researchers only" },
  { value: "pathologist", label: "Pathologists only" },
  { value: "pharmacy", label: "Pharmacies only" },
  { value: "lab", label: "Labs only" },
];

export const AutoApproveRulesCard = () => {
  const { rules, isLoading, createRule, toggleRule, deleteRule, isCreating } = useAutoApproveRules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [requesterType, setRequesterType] = useState("any");
  const [requireAnonymized, setRequireAnonymized] = useState(true);
  const [requireConnected, setRequireConnected] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleCreate = () => {
    if (!ruleName.trim()) return;
    createRule(
      {
        rule_name: ruleName.trim(),
        requester_type: requesterType,
        require_anonymized: requireAnonymized,
        require_connected_provider: requireConnected,
        disease_categories: selectedCategories.length > 0 ? selectedCategories : null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setRuleName("");
          setRequesterType("any");
          setRequireAnonymized(true);
          setRequireConnected(false);
          setSelectedCategories([]);
        },
      }
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:pb-3 sm:p-6 space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 bg-primary/10 rounded-lg shrink-0">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs sm:text-base leading-tight">Auto-Approve Rules</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs leading-tight mt-0.5">
              Auto-approve matching requests
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 sm:h-7 text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-2 sm:px-3 shrink-0">
                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span>Add Rule</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Auto-Approve Rule</DialogTitle>
                <DialogDescription>
                  Requests matching this rule will be automatically approved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    placeholder="e.g., Approve researcher requests"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider Type</Label>
                  <Select value={requesterType} onValueChange={setRequesterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUESTER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Conditions</Label>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      Require anonymized data only
                    </Label>
                    <Switch checked={requireAnonymized} onCheckedChange={setRequireAnonymized} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Only from connected providers</Label>
                    <Switch checked={requireConnected} onCheckedChange={setRequireConnected} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Disease Categories (optional filter)</Label>
                  <div className="flex flex-wrap gap-2">
                    {DISEASE_CATEGORIES.map((cat) => (
                      <label
                        key={cat.value}
                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCategories.includes(cat.value)}
                          onCheckedChange={() => toggleCategory(cat.value)}
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!ruleName.trim() || isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <p className="text-xs sm:text-sm text-muted-foreground">Loading rules...</p>
        ) : rules.length === 0 ? (
          <p className="text-[11px] sm:text-sm text-muted-foreground text-center py-2 sm:py-4">
            No rules configured. Create one to auto-approve matching requests.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{rule.rule_name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                      {rule.requester_type === "any" ? "All" : rule.requester_type}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {rule.require_anonymized && (
                      <Badge variant="secondary" className="text-[10px]">Anonymized</Badge>
                    )}
                    {rule.require_connected_provider && (
                      <Badge variant="secondary" className="text-[10px]">Connected only</Badge>
                    )}
                    {rule.disease_categories?.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] capitalize">
                        {c.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) =>
                      toggleRule({ ruleId: rule.id, isActive: checked })
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{rule.rule_name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteRule(rule.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
