import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@/types/hospital";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, Users, Bed, Banknote, CalendarDays, 
  Activity, UserCheck, Clock, Download
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

type DateRange = "7d" | "30d" | "90d";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const getDaysFromRange = (range: DateRange) => {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
  }
};

const useHospitalAnalytics = (hospitalId: string, dateRange: DateRange) => {
  const days = getDaysFromRange(dateRange);
  return useQuery({
    queryKey: ["hospital-analytics", hospitalId, dateRange],
    queryFn: async () => {
      const today = new Date();
      const startDate = subDays(today, days);

      const [admissionsRes, invoicesRes, appointmentsRes, bedsRes, wardsRes, allAdmissionsRes] = await Promise.all([
        supabase
          .from("admissions")
          .select("id, admission_date, actual_discharge, status, bed_id")
          .eq("hospital_id", hospitalId)
          .gte("admission_date", startDate.toISOString()),
        supabase
          .from("invoices")
          .select("id, invoice_date, total_amount, amount_paid, status")
          .eq("hospital_id", hospitalId)
          .gte("invoice_date", startDate.toISOString()),
        supabase
          .from("appointments")
          .select("id, appointment_date, status, doctor_id, doctor_profile:doctor_profiles(full_name)")
          .eq("hospital_id", hospitalId)
          .gte("appointment_date", startDate.toISOString()),
        supabase
          .from("beds")
          .select("id, status")
          .eq("hospital_id", hospitalId),
        supabase
          .from("wards")
          .select("id, name, type")
          .eq("hospital_id", hospitalId)
          .eq("is_active", true),
        // Fetch all admissions with discharge data for bed turnover calculation
        supabase
          .from("admissions")
          .select("id, admission_date, actual_discharge, bed_id, status")
          .eq("hospital_id", hospitalId)
          .not("actual_discharge", "is", null)
          .order("actual_discharge", { ascending: true }),
      ]);

      // Calculate bed turnover: average time between discharge and next admission per bed
      const dischargedAdmissions = allAdmissionsRes.data || [];
      const bedTurnoverTimes: number[] = [];
      const bedDischarges = new Map<string, string[]>();
      
      dischargedAdmissions.forEach((a) => {
        if (a.bed_id && a.actual_discharge) {
          if (!bedDischarges.has(a.bed_id)) bedDischarges.set(a.bed_id, []);
          bedDischarges.get(a.bed_id)!.push(a.actual_discharge);
        }
      });

      // For each bed, find gaps between discharge and next admission
      const allAdmissionsByBed = new Map<string, { admission_date: string; actual_discharge: string | null }[]>();
      [...(admissionsRes.data || []), ...dischargedAdmissions].forEach((a) => {
        if (a.bed_id) {
          if (!allAdmissionsByBed.has(a.bed_id)) allAdmissionsByBed.set(a.bed_id, []);
          allAdmissionsByBed.get(a.bed_id)!.push(a);
        }
      });

      allAdmissionsByBed.forEach((admList) => {
        const sorted = admList
          .filter((a) => a.actual_discharge)
          .sort((a, b) => new Date(a.actual_discharge!).getTime() - new Date(b.actual_discharge!).getTime());
        
        for (let i = 0; i < sorted.length - 1; i++) {
          const dischargeTime = new Date(sorted[i].actual_discharge!).getTime();
          const nextAdmissionTime = new Date(sorted[i + 1].admission_date).getTime();
          if (nextAdmissionTime > dischargeTime) {
            bedTurnoverTimes.push((nextAdmissionTime - dischargeTime) / (1000 * 60 * 60)); // hours
          }
        }
      });

      const avgTurnoverHours = bedTurnoverTimes.length > 0
        ? Math.round(bedTurnoverTimes.reduce((s, t) => s + t, 0) / bedTurnoverTimes.length)
        : 0;

      return {
        admissions: admissionsRes.data || [],
        invoices: invoicesRes.data || [],
        appointments: appointmentsRes.data || [],
        beds: bedsRes.data || [],
        wards: wardsRes.data || [],
        avgTurnoverHours,
        turnoverSamples: bedTurnoverTimes.length,
      };
    },
    enabled: !!hospitalId,
  });
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function HospitalAnalyticsPage() {
  const { hospital } = useOutletContext<HospitalContext>();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { data, isLoading } = useHospitalAnalytics(hospital.id, dateRange);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading analytics...</div>;
  }

  const { admissions, invoices, appointments, beds, wards, avgTurnoverHours, turnoverSamples } = data || {
    admissions: [], invoices: [], appointments: [], beds: [], wards: [], avgTurnoverHours: 0, turnoverSamples: 0,
  };

  const totalAdmissions = admissions.length;
  const currentAdmissions = admissions.filter(a => a.status === "admitted").length;
  const dischargedThisMonth = admissions.filter(a => a.status === "discharged").length;
  
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const collectedRevenue = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const pendingRevenue = totalRevenue - collectedRevenue;

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter(b => b.status === "occupied").length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === "completed").length;
  const cancelledAppointments = appointments.filter(a => a.status === "cancelled").length;

  const days = getDaysFromRange(dateRange);
  const trendDays = Math.min(days, 14);
  const trendInterval = eachDayOfInterval({
    start: subDays(new Date(), trendDays - 1),
    end: new Date(),
  });

  const admissionsTrend = trendInterval.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const count = admissions.filter(a => format(new Date(a.admission_date), "yyyy-MM-dd") === dayStr).length;
    return { date: format(day, "MMM d"), admissions: count };
  });

  const revenueTrend = trendInterval.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayRevenue = invoices
      .filter(inv => format(new Date(inv.invoice_date), "yyyy-MM-dd") === dayStr)
      .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    return { date: format(day, "MMM d"), revenue: dayRevenue };
  });

  const appointmentDistribution = [
    { name: "Completed", value: completedAppointments, color: "#10b981" },
    { name: "Scheduled", value: appointments.filter(a => a.status === "scheduled").length, color: "hsl(var(--primary))" },
    { name: "Confirmed", value: appointments.filter(a => a.status === "confirmed").length, color: "#3b82f6" },
    { name: "Cancelled", value: cancelledAppointments, color: "#ef4444" },
    { name: "No Show", value: appointments.filter(a => a.status === "no_show").length, color: "#f59e0b" },
  ].filter(item => item.value > 0);

  const bedDistribution = [
    { name: "Available", value: beds.filter(b => b.status === "available").length, color: "#10b981" },
    { name: "Occupied", value: occupiedBeds, color: "hsl(var(--primary))" },
    { name: "Maintenance", value: beds.filter(b => b.status === "maintenance").length, color: "#f59e0b" },
    { name: "Reserved", value: beds.filter(b => b.status === "reserved").length, color: "#8b5cf6" },
  ].filter(item => item.value > 0);

  // Staff performance data
  const doctorPerformance = (() => {
    const map = new Map<string, { name: string; total: number; completed: number; cancelled: number }>();
    appointments.forEach((appt: any) => {
      const doctorId = appt.doctor_id;
      const doctorName = appt.doctor_profile?.full_name || "Unknown";
      if (!map.has(doctorId)) {
        map.set(doctorId, { name: doctorName, total: 0, completed: 0, cancelled: 0 });
      }
      const entry = map.get(doctorId)!;
      entry.total++;
      if (appt.status === "completed") entry.completed++;
      if (appt.status === "cancelled") entry.cancelled++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const handleExportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Date Range", dateRange],
      ["Total Admissions", totalAdmissions.toString()],
      ["Current Admissions", currentAdmissions.toString()],
      ["Total Revenue", totalRevenue.toString()],
      ["Collected Revenue", collectedRevenue.toString()],
      ["Pending Revenue", pendingRevenue.toString()],
      ["Bed Occupancy Rate", `${occupancyRate}%`],
      ["Total Appointments", totalAppointments.toString()],
      ["Completed Appointments", completedAppointments.toString()],
      ["Cancelled Appointments", cancelledAppointments.toString()],
      [],
      ["Staff Performance"],
      ["Doctor", "Total Appts", "Completed", "Cancelled", "Completion Rate"],
      ...doctorPerformance.map(d => [
        d.name, d.total.toString(), d.completed.toString(), d.cancelled.toString(),
        d.total > 0 ? `${Math.round((d.completed / d.total) * 100)}%` : "0%",
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${hospital.name}-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Hospital performance metrics and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === r.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Admissions</p>
                <p className="text-3xl font-bold">{currentAdmissions}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalAdmissions} total ({dateRange})</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bed Occupancy</p>
                <p className="text-3xl font-bold">{occupancyRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{occupiedBeds} of {totalBeds} beds</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Bed className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Collected</p>
                <p className="text-3xl font-bold text-green-600">৳{(collectedRevenue / 1000).toFixed(1)}K</p>
                <p className="text-xs text-muted-foreground mt-1">৳{(pendingRevenue / 1000).toFixed(1)}K pending</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="text-3xl font-bold">{totalAppointments}</p>
                <p className="text-xs text-muted-foreground mt-1">{completedAppointments} completed</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="admissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="admissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Admissions Trend
              </CardTitle>
              <CardDescription>Daily patient admissions (last {trendDays} days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={admissionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="admissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Daily revenue collected (last {trendDays} days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `৳${value / 1000}K`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bed className="h-5 w-5" />Bed Status Distribution</CardTitle>
                <CardDescription>Current bed availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {bedDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bedDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {bedDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No bed data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Summary</CardTitle>
                <CardDescription>Key occupancy metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Total Beds</p><p className="text-2xl font-bold">{totalBeds}</p></div>
                  <Bed className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Currently Occupied</p><p className="text-2xl font-bold text-primary">{occupiedBeds}</p></div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Available Now</p><p className="text-2xl font-bold text-green-600">{beds.filter(b => b.status === "available").length}</p></div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Bed Turnover</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {avgTurnoverHours > 0 ? `${avgTurnoverHours}h` : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">{turnoverSamples} turnover events</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Appointment Status</CardTitle>
                <CardDescription>Breakdown for selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {appointmentDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={appointmentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {appointmentDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No appointment data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Appointment Metrics</CardTitle>
                <CardDescription>Performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Total Appointments</p><p className="text-2xl font-bold">{totalAppointments}</p></div>
                  <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold text-green-600">{totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0}%</p></div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Cancellation Rate</p><p className="text-2xl font-bold text-red-600">{totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0}%</p></div>
                  <Clock className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Staff Performance</CardTitle>
              <CardDescription>Per-doctor appointment statistics for selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {doctorPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Doctor</th>
                        <th className="text-center py-3 px-2 font-medium">Total</th>
                        <th className="text-center py-3 px-2 font-medium">Completed</th>
                        <th className="text-center py-3 px-2 font-medium">Cancelled</th>
                        <th className="text-center py-3 px-2 font-medium">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPerformance.map((doc, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3 px-2 font-medium">{doc.name}</td>
                          <td className="text-center py-3 px-2">{doc.total}</td>
                          <td className="text-center py-3 px-2 text-green-600">{doc.completed}</td>
                          <td className="text-center py-3 px-2 text-red-600">{doc.cancelled}</td>
                          <td className="text-center py-3 px-2">
                            <span className={`font-semibold ${doc.total > 0 && (doc.completed / doc.total) >= 0.7 ? "text-green-600" : "text-amber-600"}`}>
                              {doc.total > 0 ? Math.round((doc.completed / doc.total) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No appointment data for this period</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
