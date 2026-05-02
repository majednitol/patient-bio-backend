import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorPatients } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format, subDays, startOfMonth, eachDayOfInterval, parseISO, isAfter, getDay, subMonths, endOfMonth, startOfDay, endOfDay } from "date-fns";
import {
  BarChart3,
  Users,
  Pill,
  CalendarDays,
  UserX,
  DollarSign,
  Timer,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PatientGrowthChart } from "@/components/doctor/analytics/PatientGrowthChart";
import { PeakHoursChart } from "@/components/doctor/analytics/PeakHoursChart";
import { RevenueChart } from "@/components/doctor/analytics/RevenueChart";
import { AppointmentOutcomesChart } from "@/components/doctor/analytics/AppointmentOutcomesChart";
import { PrescriptionActivityCharts } from "@/components/doctor/analytics/PrescriptionActivityChart";
import { ConsultationDurationChart } from "@/components/doctor/analytics/ConsultationDurationChart";
import { PatientFeedbackSummaryCard } from "@/components/doctor/PatientFeedbackSummaryCard";
import { RepeatPatientCard } from "@/components/doctor/analytics/RepeatPatientCard";
import { DurationBenchmarkCard } from "@/components/doctor/analytics/DurationBenchmarkCard";
import { ChronicCohortMetrics } from "@/components/doctor/analytics/ChronicCohortMetrics";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PeriodOption = "this_month" | "last_month" | "last_30" | "last_90";

const periodLabels: Record<PeriodOption, string> = {
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  last_90: "Last 90 Days",
};

const DoctorAnalyticsPage = () => {
  const { user } = useAuth();
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: patients, isLoading: patientsLoading } = useDoctorPatients(user?.id);
  const { data: allPrescriptions, isLoading: prescriptionsLoading } = useDoctorPrescriptions();
  const { appointments, isLoading: appointmentsLoading } = useDoctorAppointments(selectedHospitalId || undefined);
  const { data: doctorProfile } = useDoctorProfile();
  const [period, setPeriod] = useState<PeriodOption>("last_30");

  const prescriptions = useMemo(() => {
    if (!allPrescriptions) return undefined;
    if (selectedHospitalId === null) return allPrescriptions;
    return allPrescriptions.filter((rx: any) => rx.hospital_id === selectedHospitalId);
  }, [allPrescriptions, selectedHospitalId]);

  const isLoading = patientsLoading || prescriptionsLoading || appointmentsLoading;
  const consultationFee = doctorProfile?.consultation_fee || 0;

  // Period date range
  const periodRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "this_month": return { start: startOfMonth(now), end: now };
      case "last_month": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "last_30": return { start: subDays(now, 29), end: now };
      case "last_90": return { start: subDays(now, 89), end: now };
    }
  }, [period]);

  // Previous period for comparison
  const prevPeriodRange = useMemo(() => {
    const diff = periodRange.end.getTime() - periodRange.start.getTime();
    const prevEnd = new Date(periodRange.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);
    return { start: prevStart, end: prevEnd };
  }, [periodRange]);

  const isInRange = (dateStr: string, range: { start: Date; end: Date }) => {
    try {
      const d = parseISO(dateStr);
      return d >= range.start && d <= range.end;
    } catch { return false; }
  };

  // Comparison stats
  const comparisonStats = useMemo(() => {
    const currPatients = patients?.filter((p: any) => p.granted_at && isInRange(p.granted_at, periodRange)).length || 0;
    const prevPatients = patients?.filter((p: any) => p.granted_at && isInRange(p.granted_at, prevPeriodRange)).length || 0;

    const currAppts = appointments?.filter((a: any) => isInRange(a.appointment_date, periodRange)).length || 0;
    const prevAppts = appointments?.filter((a: any) => isInRange(a.appointment_date, prevPeriodRange)).length || 0;

    const currRx = prescriptions?.filter((rx: any) => isInRange(rx.created_at, periodRange)).length || 0;
    const prevRx = prescriptions?.filter((rx: any) => isInRange(rx.created_at, prevPeriodRange)).length || 0;

    const currNoShows = appointments?.filter((a: any) => a.status === "no_show" && isInRange(a.appointment_date, periodRange)).length || 0;
    const prevNoShows = appointments?.filter((a: any) => a.status === "no_show" && isInRange(a.appointment_date, prevPeriodRange)).length || 0;
    const currNoShowRate = currAppts > 0 ? (currNoShows / currAppts) * 100 : 0;
    const prevNoShowRate = prevAppts > 0 ? (prevNoShows / prevAppts) * 100 : 0;

    const pctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      patients: { curr: currPatients, prev: prevPatients, change: pctChange(currPatients, prevPatients) },
      appointments: { curr: currAppts, prev: prevAppts, change: pctChange(currAppts, prevAppts) },
      prescriptions: { curr: currRx, prev: prevRx, change: pctChange(currRx, prevRx) },
      noShowRate: { curr: currNoShowRate, prev: prevNoShowRate, change: prevNoShowRate - currNoShowRate }, // inverted: decrease is good
    };
  }, [patients, appointments, prescriptions, periodRange, prevPeriodRange]);

  // Goal tracking
  const goalStats = useMemo(() => {
    const monthlyPatientGoal = 50;
    const monthStart = startOfMonth(new Date());
    const newThisMonth = patients?.filter((p: any) => p.granted_at && isAfter(parseISO(p.granted_at), monthStart)).length || 0;
    const pct = Math.min(100, Math.round((newThisMonth / monthlyPatientGoal) * 100));
    return { goal: monthlyPatientGoal, current: newThisMonth, pct };
  }, [patients]);

  // Patient growth over last 30 days
  const patientGrowthData = useMemo(() => {
    if (!patients) return [];
    const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return last30Days.map((date) => {
      const dateStr = format(date, "MMM d");
      const count = patients.filter((p: any) => {
        if (!p.granted_at) return false;
        return format(parseISO(p.granted_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;
      return { date: dateStr, patients: count };
    });
  }, [patients]);

  const prescriptionTrendData = useMemo(() => {
    if (!prescriptions) return [];
    const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return last30Days.map((date) => {
      const dateStr = format(date, "MMM d");
      const count = prescriptions.filter((rx: any) => {
        if (!rx.created_at) return false;
        return format(parseISO(rx.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;
      return { date: dateStr, prescriptions: count };
    });
  }, [prescriptions]);

  const busiestDaysData = useMemo(() => {
    if (!appointments) return [];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    appointments.forEach((apt: any) => {
      if (apt.appointment_date) dayCounts[getDay(parseISO(apt.appointment_date))]++;
    });
    return DAY_NAMES.map((name, index) => ({ day: name, appointments: dayCounts[index] }));
  }, [appointments]);

  const prescriptionStatusData = useMemo(() => {
    if (!prescriptions) return [];
    const active = prescriptions.filter((rx: any) => rx.is_active).length;
    const completed = prescriptions.filter((rx: any) => !rx.is_active).length;
    return [
      { name: "Active", value: active },
      { name: "Completed", value: completed },
    ];
  }, [prescriptions]);

  const noShowStats = useMemo(() => {
    if (!appointments?.length) return { rate: 0, noShows: 0, total: 0, completed: 0, cancelled: 0 };
    const pastAppointments = appointments.filter((apt: any) =>
      ["completed", "no_show", "cancelled"].includes(apt.status)
    );
    const total = pastAppointments.length;
    const noShows = pastAppointments.filter((a: any) => a.status === "no_show").length;
    const completed = pastAppointments.filter((a: any) => a.status === "completed").length;
    const cancelled = pastAppointments.filter((a: any) => a.status === "cancelled").length;
    return { rate: total > 0 ? (noShows / total) * 100 : 0, noShows, total, completed, cancelled };
  }, [appointments]);

  const appointmentStatusData = useMemo(() => {
    if (!noShowStats.total) return [];
    return [
      { name: "Completed", value: noShowStats.completed },
      { name: "No-Show", value: noShowStats.noShows },
      { name: "Cancelled", value: noShowStats.cancelled },
    ].filter((d) => d.value > 0);
  }, [noShowStats]);

  const avgDuration = useMemo(() => {
    if (!appointments?.length) return 0;
    const completedWithTimes = appointments.filter(
      (apt: any) => apt.status === "completed" && apt.consultation_started_at && apt.consultation_ended_at
    );
    if (!completedWithTimes.length) return 0;
    const totalMinutes = completedWithTimes.reduce((sum: number, apt: any) => {
      try {
        const start = new Date(apt.consultation_started_at).getTime();
        const end = new Date(apt.consultation_ended_at).getTime();
        const mins = (end - start) / 60000;
        return mins > 0 && mins < 120 ? sum + mins : sum;
      } catch { return sum; }
    }, 0);
    return Math.round(totalMinutes / completedWithTimes.length);
  }, [appointments]);

  const durationTrendData = useMemo(() => {
    if (!appointments?.length) return [];
    return appointments
      .filter((apt: any) => apt.status === "completed" && apt.consultation_started_at && apt.consultation_ended_at)
      .sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
      .slice(0, 20)
      .reverse()
      .map((apt: any) => {
        const start = new Date(apt.consultation_started_at).getTime();
        const end = new Date(apt.consultation_ended_at).getTime();
        const mins = Math.round((end - start) / 60000);
        return { date: format(parseISO(apt.appointment_date), "MMM d"), duration: mins > 0 && mins < 120 ? mins : 0 };
      })
      .filter((d: any) => d.duration > 0);
  }, [appointments]);

  const peakHoursData = useMemo(() => {
    if (!appointments?.length) return [];
    const hourCounts: Record<number, number> = {};
    for (let h = 7; h <= 18; h++) hourCounts[h] = 0;
    appointments.forEach((apt: any) => {
      if (apt.start_time) {
        try {
          const hour = parseInt(apt.start_time.split(":")[0], 10);
          if (hour >= 7 && hour <= 18) hourCounts[hour]++;
        } catch {}
      }
    });
    return Object.entries(hourCounts).map(([hour, count]) => {
      const h = parseInt(hour, 10);
      const label = h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
      return { hour: label, appointments: count };
    });
  }, [appointments]);

  const peakHour = useMemo(() => {
    if (!peakHoursData.length) return null;
    return peakHoursData.reduce((max, curr) => (curr.appointments > max.appointments ? curr : max), peakHoursData[0]);
  }, [peakHoursData]);

  // Practice insights
  const insights = useMemo(() => {
    const items: { text: string; type: "positive" | "neutral" | "warning" }[] = [];

    if (comparisonStats.noShowRate.change > 5) {
      items.push({ text: `No-show rate decreased ${Math.abs(comparisonStats.noShowRate.change).toFixed(0)}% vs previous period`, type: "positive" });
    } else if (comparisonStats.noShowRate.change < -5) {
      items.push({ text: `No-show rate increased ${Math.abs(comparisonStats.noShowRate.change).toFixed(0)}% — consider reminder follow-ups`, type: "warning" });
    }

    if (comparisonStats.patients.change > 10) {
      items.push({ text: `Patient base grew ${comparisonStats.patients.change.toFixed(0)}% this period`, type: "positive" });
    }

    if (comparisonStats.appointments.change > 0) {
      items.push({ text: `Appointments up ${comparisonStats.appointments.change.toFixed(0)}% vs previous period`, type: "positive" });
    } else if (comparisonStats.appointments.change < -10) {
      items.push({ text: `Appointment volume dropped ${Math.abs(comparisonStats.appointments.change).toFixed(0)}%`, type: "warning" });
    }

    const peakHr = peakHoursData.length > 0
      ? peakHoursData.reduce((max, curr) => (curr.appointments > max.appointments ? curr : max), peakHoursData[0])
      : null;
    if (peakHr) {
      items.push({ text: `Peak hours: ${peakHr.hour} with ${peakHr.appointments} appointments`, type: "neutral" });
    }

    if (items.length === 0) {
      items.push({ text: "Keep up the consistent practice — metrics are stable", type: "neutral" });
    }

    return items;
  }, [comparisonStats, peakHoursData]);

  const revenueData = useMemo(() => {
    if (!appointments?.length || !consultationFee) return [];
    const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    let cumulative = 0;
    return last30Days.map((date) => {
      const dateStr = format(date, "MMM d");
      const completedCount = appointments.filter((apt: any) => {
        if (apt.status !== "completed" || !apt.appointment_date) return false;
        return format(parseISO(apt.appointment_date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;
      const daily = completedCount * consultationFee;
      cumulative += daily;
      return { date: dateStr, daily, cumulative };
    });
  }, [appointments, consultationFee]);

  const monthRevenue = useMemo(() => {
    if (!appointments?.length || !consultationFee) return 0;
    const monthStart = startOfMonth(new Date());
    return appointments.filter((a: any) => {
      if (a.status !== "completed" || !a.appointment_date) return false;
      return isAfter(parseISO(a.appointment_date), monthStart);
    }).length * consultationFee;
  }, [appointments, consultationFee]);

  const stats = useMemo(() => {
    const totalPatients = patients?.length || 0;
    const newPatientsThisMonth = patients?.filter((p: any) => {
      if (!p.granted_at) return false;
      return isAfter(parseISO(p.granted_at), startOfMonth(new Date()));
    }).length || 0;
    const totalPrescriptions = prescriptions?.length || 0;
    const activePrescriptions = prescriptions?.filter((rx: any) => rx.is_active).length || 0;
    const totalAppointments = appointments?.length || 0;
    const upcomingAppointments = appointments?.filter((apt: any) =>
      apt.status === "scheduled" || apt.status === "confirmed"
    ).length || 0;
    return { totalPatients, newPatientsThisMonth, totalPrescriptions, activePrescriptions, totalAppointments, upcomingAppointments };
  }, [patients, prescriptions, appointments]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const TrendBadge = ({ change, inverted = false }: { change: number; inverted?: boolean }) => {
    const isGood = inverted ? change < 0 : change > 0;
    const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isGood ? "text-primary" : "text-destructive"}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(change).toFixed(0)}%
      </span>
    );
  };

  const statCards = [
    { icon: Users, label: "Patients", value: stats.totalPatients, sub: `+${stats.newPatientsThisMonth} this month`, color: "text-primary bg-primary/10", change: comparisonStats.patients.change },
    { icon: Pill, label: "Prescriptions", value: stats.totalPrescriptions, sub: `${stats.activePrescriptions} active`, color: "text-primary bg-primary/10", change: comparisonStats.prescriptions.change },
    { icon: CalendarDays, label: "Appointments", value: stats.totalAppointments, sub: `${stats.upcomingAppointments} upcoming`, color: "text-primary bg-primary/10", change: comparisonStats.appointments.change },
    { icon: UserX, label: "No-Show Rate", value: `${noShowStats.rate.toFixed(1)}%`, sub: `${noShowStats.noShows} of ${noShowStats.total}`, color: noShowStats.rate > 15 ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10", change: comparisonStats.noShowRate.change, inverted: true },
    { icon: Timer, label: "Avg Duration", value: `${avgDuration}m`, sub: "per consultation", color: "text-primary bg-primary/10" },
    ...(selectedHospitalId ? [] : [{ icon: DollarSign, label: "Revenue", value: `৳${monthRevenue.toLocaleString()}`, sub: "this month", color: "text-primary bg-primary/10" }]),
  ];

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              {selectedHospitalId ? "Track your practice performance and patient trends" : "Track your practice performance, patient trends, and revenue"}
            </p>
          </div>
        </div>
        {/* Period Comparison Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.keys(periodLabels) as PeriodOption[]).map((key) => (
            <Button
              key={key}
              variant={period === key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setPeriod(key)}
            >
              {periodLabels[key]}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Insights Card */}
      <Card className="border-primary/20 bg-primary/5 animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Key Insights
            <Badge variant="secondary" className="text-[10px]">{periodLabels[period]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${
                  insight.type === "positive" ? "bg-primary/10 text-primary" :
                  insight.type === "warning" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {insight.type === "positive" ? <TrendingUp className="h-3 w-3" /> :
                 insight.type === "warning" ? <TrendingDown className="h-3 w-3" /> : null}
                {insight.text}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goal Tracking */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Monthly Patient Goal</span>
            </div>
            <span className="text-sm font-bold">{goalStats.current}/{goalStats.goal}</span>
          </div>
          <Progress value={goalStats.pct} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {goalStats.pct >= 100 ? "🎉 Goal achieved!" : `${goalStats.pct}% achieved — ${goalStats.goal - goalStats.current} more to go`}
          </p>
        </CardContent>
      </Card>

      {/* Summary Stats with Trend Badges */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-in" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {statCards.map((stat) => (
          <Card key={stat.label} className="transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xl font-bold leading-none">{stat.value}</p>
                    {stat.change !== undefined && stat.change !== 0 && (
                      <TrendBadge change={stat.change} inverted={stat.inverted} />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Patient Growth + Peak Hours */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-2 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <PatientGrowthChart data={patientGrowthData} />
        <PeakHoursChart data={peakHoursData} peakHour={peakHour} />
      </div>

      {/* Charts Row 2: Revenue + Outcomes */}
      <div className={`grid gap-3 sm:gap-6 ${selectedHospitalId ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} animate-fade-in`} style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        {selectedHospitalId ? (
          <Card className="border-dashed">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <div className="bg-muted p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Revenue is managed at the hospital level</p>
              <p className="text-xs text-muted-foreground">
                Financial reports for this hospital are available in the Hospital Admin dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <RevenueChart data={revenueData} consultationFee={consultationFee} />
        )}
        <AppointmentOutcomesChart data={appointmentStatusData} noShowRate={noShowStats.rate} />
      </div>

      {/* Charts Row 3: Prescription Activity + Busiest Days + Rx Status */}
      <PrescriptionActivityCharts
        trendData={prescriptionTrendData}
        busiestDaysData={busiestDaysData}
        statusData={prescriptionStatusData}
      />

      {/* Consultation Duration Trend + Benchmark */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
        <div className="lg:col-span-2">
          <ConsultationDurationChart data={durationTrendData} avgDuration={avgDuration} />
        </div>
        <DurationBenchmarkCard avgDuration={avgDuration} specialty={doctorProfile?.specialty} />
      </div>

      {/* Patient Loyalty Section */}
      <div className="animate-fade-in" style={{ animationDelay: "0.28s", animationFillMode: "both" }}>
        <RepeatPatientCard doctorId={user?.id} />
      </div>

      {/* Chronic Care Cohort */}
      <div className="animate-fade-in" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
        <ChronicCohortMetrics />
      </div>

      {/* Patient Feedback Section */}
      <div className="animate-fade-in" style={{ animationDelay: "0.33s", animationFillMode: "both" }}>
        <PatientFeedbackSummaryCard />
      </div>
    </div>
  );
};

export default DoctorAnalyticsPage;
