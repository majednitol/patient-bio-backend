import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, Users, Calendar, FileText } from "lucide-react";
import { subDays, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  hospitalId: string;
}

interface DepartmentLoad {
  id: string;
  name: string;
  staffCount: number;
  appointmentCount: number;
  admissionCount: number;
  referralCount: number;
  totalLoad: number;
  loadLevel: "low" | "medium" | "high" | "critical";
}

export default function DepartmentLoadHeatmap({ hospitalId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["department-load-heatmap", hospitalId],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);

      const [deptsRes, staffRes, appointmentsRes, admissionsRes, referralsRes] = await Promise.all([
        supabase
          .from("hospital_departments")
          .select("id, name")
          .eq("hospital_id", hospitalId)
          .eq("is_active", true),
        supabase
          .from("hospital_staff")
          .select("id, department_id")
          .eq("hospital_id", hospitalId)
          .eq("is_active", true),
        supabase
          .from("appointments")
          .select("id, doctor_id, hospital_id")
          .eq("hospital_id", hospitalId)
          .gte("appointment_date", thirtyDaysAgo.toISOString()),
        supabase
          .from("admissions")
          .select("id, admitting_doctor_id")
          .eq("hospital_id", hospitalId)
          .gte("admission_date", thirtyDaysAgo.toISOString()),
        supabase
          .from("department_referrals")
          .select("id, to_department_id, from_department_id")
          .eq("hospital_id", hospitalId)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const departments = deptsRes.data || [];
      const staff = staffRes.data || [];
      const appointments = appointmentsRes.data || [];
      const admissions = admissionsRes.data || [];
      const referrals = referralsRes.data || [];

      // Get staff-to-department mapping to link appointments/admissions
      const staffDeptMap = new Map<string, string>();
      staff.forEach((s) => {
        if (s.department_id) staffDeptMap.set(s.id, s.department_id);
      });

      const deptLoads: DepartmentLoad[] = departments.map((dept) => {
        const deptStaff = staff.filter((s) => s.department_id === dept.id);
        const deptReferrals = referrals.filter(
          (r) => r.to_department_id === dept.id || r.from_department_id === dept.id
        );

        // Simple load estimation
        const staffCount = deptStaff.length;
        const appointmentCount = Math.round(appointments.length * (staffCount / Math.max(staff.length, 1)));
        const admissionCount = Math.round(admissions.length * (staffCount / Math.max(staff.length, 1)));
        const referralCount = deptReferrals.length;
        const totalLoad = appointmentCount + admissionCount + referralCount;

        let loadLevel: DepartmentLoad["loadLevel"] = "low";
        if (totalLoad > 50) loadLevel = "critical";
        else if (totalLoad > 30) loadLevel = "high";
        else if (totalLoad > 10) loadLevel = "medium";

        return {
          id: dept.id,
          name: dept.name,
          staffCount,
          appointmentCount,
          admissionCount,
          referralCount,
          totalLoad,
          loadLevel,
        };
      });

      return deptLoads.sort((a, b) => b.totalLoad - a.totalLoad);
    },
    enabled: !!hospitalId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Department Load
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Department Load
          </CardTitle>
          <CardDescription>30-day activity heatmap</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No departments configured. Add departments to see load distribution.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getLoadStyles = (level: DepartmentLoad["loadLevel"]) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400";
      case "high":
        return "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-400";
      case "medium":
        return "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400";
      case "low":
        return "bg-green-500/10 border-green-500/25 text-green-700 dark:text-green-400";
    }
  };

  const getLoadLabel = (level: DepartmentLoad["loadLevel"]) => {
    switch (level) {
      case "critical": return "Critical";
      case "high": return "High";
      case "medium": return "Medium";
      case "low": return "Low";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Department Load Heatmap
            </CardTitle>
            <CardDescription>30-day activity distribution across departments</CardDescription>
          </div>
          <div className="flex gap-1.5 items-center">
            {(["low", "medium", "high", "critical"] as const).map((level) => (
              <div key={level} className="flex items-center gap-1">
                <div
                  className={`h-3 w-3 rounded-sm border ${getLoadStyles(level)}`}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{level}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.map((dept) => (
              <Tooltip key={dept.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-3 rounded-lg border cursor-default transition-all hover:scale-[1.02] ${getLoadStyles(
                      dept.loadLevel
                    )}`}
                  >
                    <p className="text-sm font-semibold truncate">{dept.name}</p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {getLoadLabel(dept.loadLevel)} • {dept.totalLoad} events
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] opacity-70">
                      <span className="flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" />
                        {dept.staffCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {dept.appointmentCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <FileText className="h-2.5 w-2.5" />
                        {dept.referralCount}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{dept.name}</p>
                  <p>{dept.staffCount} staff • {dept.appointmentCount} appts • {dept.admissionCount} admissions • {dept.referralCount} referrals</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
