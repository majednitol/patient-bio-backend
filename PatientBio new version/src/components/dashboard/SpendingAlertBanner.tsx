import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, AlertTriangle, Settings2, X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function SpendingAlertBanner() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { useSpendingHistory } = useCostEstimation();
  const { data: spending } = useSpendingHistory();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [threshold, setThreshold] = useState("");

  const currentThreshold = (profile as any)?.spending_alert_threshold as number | null;

  // Calculate current month spending
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthSpending = spending?.byMonth.find((m) => m.month === currentMonth)?.total || 0;

  const isOverThreshold = currentThreshold && monthSpending >= currentThreshold;
  const isNearThreshold = currentThreshold && monthSpending >= currentThreshold * 0.8 && !isOverThreshold;

  const handleSave = async () => {
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) return;
    await supabase
      .from("user_profiles")
      .update({ spending_alert_threshold: val } as any)
      .eq("user_id", user!.id);
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    toast({ title: "Threshold set", description: `You'll be alerted when monthly spending exceeds ৳${val.toLocaleString("en-BD")}` });
    setEditing(false);
  };

  if (!currentThreshold && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-dashed border-muted-foreground/30 hover:border-primary/40"
      >
        <Settings2 className="h-3 w-3" />
        Set monthly spending alert
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="number"
          placeholder="e.g. 5000"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="h-8 w-32 text-sm"
          autoFocus
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (!isOverThreshold && !isNearThreshold) return null;

  return (
    <Alert variant={isOverThreshold ? "destructive" : "default"} className={isNearThreshold ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800" : ""}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm">
        {isOverThreshold ? "Spending limit exceeded" : "Approaching spending limit"}
      </AlertTitle>
      <AlertDescription className="text-xs">
        You've spent ৳{monthSpending.toLocaleString("en-BD")} this month
        {currentThreshold ? ` (limit: ৳${currentThreshold.toLocaleString("en-BD")})` : ""}.
      </AlertDescription>
    </Alert>
  );
}
