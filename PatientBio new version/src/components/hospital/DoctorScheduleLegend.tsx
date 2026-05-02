import { cn } from "@/lib/utils";

interface LegendItemProps {
  color: string;
  label: string;
  pattern?: boolean;
}

function LegendItem({ color, label, pattern }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-4 h-4 rounded border border-border",
          color,
          pattern && "bg-stripes"
        )}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function DoctorScheduleLegend() {
  return (
    <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
      <LegendItem color="bg-green-500/20" label="Available" />
      <LegendItem color="bg-muted" label="Not Set" />
      <LegendItem color="bg-red-500/20" label="Time Off (Hospital)" />
      <LegendItem color="bg-orange-500/20" label="Time Off (Global)" />
    </div>
  );
}
