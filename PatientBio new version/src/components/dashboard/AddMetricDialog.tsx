import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHealthMetrics, METRIC_TYPES } from "@/hooks/useHealthMetrics";
import { Plus, Loader2, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddMetricDialogProps {
  trigger?: React.ReactNode;
  defaultMetricType?: string;
}

export const AddMetricDialog = ({
  trigger,
  defaultMetricType,
}: AddMetricDialogProps) => {
  const [open, setOpen] = useState(false);
  const { addMetric, isAdding } = useHealthMetrics();

  const [formData, setFormData] = useState({
    metric_type: defaultMetricType || "",
    value: "",
    measured_at: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const selectedMetricDef = METRIC_TYPES.find(
    (m) => m.type === formData.metric_type
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.metric_type || !formData.value) {
      toast.error("Please fill in all required fields");
      return;
    }

    const value = parseFloat(formData.value);
    if (isNaN(value)) {
      toast.error("Please enter a valid number");
      return;
    }

    addMetric(
      {
        metric_type: formData.metric_type,
        value,
        unit: selectedMetricDef?.unit || "",
        measured_at: new Date(formData.measured_at).toISOString(),
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setFormData({
            metric_type: defaultMetricType || "",
            value: "",
            measured_at: new Date().toISOString().slice(0, 16),
            notes: "",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Reading
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Record Health Metric
          </DialogTitle>
          <DialogDescription>
            Log a new health measurement to track your trends
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric_type">
              Metric Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.metric_type}
              onValueChange={(value) =>
                setFormData({ ...formData, metric_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPES.map((m) => (
                  <SelectItem key={m.type} value={m.type}>
                    <span className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              Value <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="value"
                type="number"
                step="any"
                placeholder="Enter value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                className="flex-1"
              />
              {selectedMetricDef && (
                <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                  {selectedMetricDef.unit}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="measured_at">Date & Time</Label>
            <Input
              id="measured_at"
              type="datetime-local"
              value={formData.measured_at}
              onChange={(e) =>
                setFormData({ ...formData, measured_at: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Reading"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
