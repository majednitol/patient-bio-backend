import { useBeds, useWards } from "@/hooks/useWards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Building2 } from "lucide-react";

interface Props {
  hospitalId: string;
}

export default function HospitalWardOccupancyCard({ hospitalId }: Props) {
  const { data: wards } = useWards(hospitalId);
  const { data: beds } = useBeds(hospitalId);

  if (!wards?.length || !beds?.length) return null;

  const wardStats = wards
    .filter((w) => w.is_active)
    .map((ward) => {
      const wardBeds = beds.filter((b) => b.ward_id === ward.id);
      const occupied = wardBeds.filter((b) => b.status === "occupied").length;
      const total = wardBeds.length;
      const percent = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return { name: ward.name, type: ward.type, occupied, total, percent };
    })
    .filter((w) => w.total > 0);

  if (!wardStats.length) return null;

  const getColor = (percent: number) => {
    if (percent >= 85) return "text-red-600";
    if (percent >= 60) return "text-amber-600";
    return "text-green-600";
  };

  const getBarClass = (percent: number) => {
    if (percent >= 85) return "[&>div]:bg-red-500";
    if (percent >= 60) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-green-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Ward Occupancy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wardStats.map((ward) => (
          <div key={ward.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{ward.name}</span>
              <span className={`text-xs font-semibold ${getColor(ward.percent)}`}>
                {ward.occupied}/{ward.total}
              </span>
            </div>
            <Progress
              value={ward.percent}
              className={`h-2 ${getBarClass(ward.percent)}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
