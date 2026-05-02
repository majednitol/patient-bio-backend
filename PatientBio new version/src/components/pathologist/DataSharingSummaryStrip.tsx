import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { usePatientPathologistShares } from "@/hooks/usePatientPathologistShares";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Send, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  to: string;
  color: string;
}

const Metric = ({ icon, label, count, to, color }: MetricProps) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-${color}-50 dark:hover:bg-${color}-900/20 text-left flex-1 min-w-0`}
    >
      {icon}
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      {count > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-auto flex-shrink-0">
          {count}
        </Badge>
      )}
    </button>
  );
};

export const DataSharingSummaryStrip = () => {
  const { receivedShares } = useDoctorPathologistShares();
  const { pathologistShares } = usePatientPathologistShares();
  const { reports } = usePathologistReports();

  const pendingFromDoctors = receivedShares.filter((s) => s.status === "pending").length;
  const awaitingDoctorView = reports.filter((r) => r.is_shared_with_doctor && !r.doctor_viewed_at).length;
  const pendingPatientShares = pathologistShares.filter((s) => s.status === "pending").length;

  return (
    <Card className="border-dashed">
      <CardContent className="p-2">
        <div className="flex items-center gap-1 divide-x divide-border">
          <Metric
            icon={<Inbox className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />}
            label="From Doctors"
            count={pendingFromDoctors}
            to="/pathologist/from-doctors"
            color="teal"
          />
          <Metric
            icon={<Send className="h-3.5 w-3.5 text-cyan-600 flex-shrink-0" />}
            label="To Doctors"
            count={awaitingDoctorView}
            to="/pathologist/to-doctors"
            color="cyan"
          />
          <Metric
            icon={<Users className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />}
            label="Patient Shares"
            count={pendingPatientShares}
            to="/pathologist/patient-shares"
            color="violet"
          />
        </div>
      </CardContent>
    </Card>
  );
};
