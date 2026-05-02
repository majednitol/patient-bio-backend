import { useLabOrdersForPathologist } from "@/hooks/useLabOrdersForPathologist";
import { usePathologistInvoices } from "@/hooks/usePathologistInvoices";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, FlaskConical, FileSpreadsheet, Receipt } from "lucide-react";

const LabOperationsSummaryStrip = () => {
  const { orders } = useLabOrdersForPathologist();
  const { data: invoices } = usePathologistInvoices();
  const location = useLocation();

  const pendingOrders = orders.filter(
    (o) => o.status === "ordered" || o.status === "sample_collected"
  ).length;

  const samplesInTransit = orders.filter(
    (o) => !o.received_at && (o.status === "sample_collected" || o.status === "ordered")
  ).length;

  const unpaidInvoices = invoices?.filter(
    (i) => i.status === "pending" || i.status === "partial"
  ).length || 0;

  const metrics = [
    {
      label: "Pending Orders",
      value: pendingOrders,
      icon: ClipboardList,
      path: "/pathologist/hospital-orders",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Samples in Transit",
      value: samplesInTransit,
      icon: FlaskConical,
      path: "/pathologist/sample-tracking",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Unpaid Invoices",
      value: unpaidInvoices,
      icon: Receipt,
      path: "/pathologist/billing",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {metrics.map((m) => {
        const isActive = location.pathname === m.path;
        const Icon = m.icon;
        return (
          <Link
            key={m.path}
            to={m.path}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors hover:bg-muted ${
              isActive ? "border-primary/30 bg-primary/5" : "border-border"
            }`}
          >
            <div className={`h-6 w-6 rounded-full ${m.bg} flex items-center justify-center`}>
              <Icon className={`h-3.5 w-3.5 ${m.color}`} />
            </div>
            <span className="text-muted-foreground">{m.label}</span>
            <Badge variant={m.value > 0 ? "default" : "secondary"} className="text-xs px-1.5 py-0">
              {m.value}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
};

export { LabOperationsSummaryStrip };
