import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBatchConfirmAppointments } from "@/hooks/useBatchConfirmAppointments";
import { useBatchCancelAppointments } from "@/hooks/useBatchCancelAppointments";
import { Appointment, AppointmentStatus, APPOINTMENT_STATUS_OPTIONS } from "@/types/hospital";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { DoctorPatientDetailsDialog } from "@/components/doctor/DoctorPatientDetailsDialog";
import { DoctorCreateAppointmentDialog } from "@/components/doctor/DoctorCreateAppointmentDialog";
import { AppointmentStatusFilter } from "@/components/appointments/AppointmentStatusFilter";
import { AppointmentSettingsCard } from "@/components/doctor/AppointmentSettingsCard";
import { AvailabilityEditor } from "@/components/appointments/AvailabilityEditor";
import { TimeOffManager } from "@/components/appointments/TimeOffManager";
import { MiniCalendarHeatmap } from "@/components/doctor/MiniCalendarHeatmap";
import { SlotRecommendationsCard } from "@/components/appointments/SlotRecommendationsCard";
import { FollowUpGapCard } from "@/components/appointments/FollowUpGapCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { generateSchedulePDF } from "@/utils/generateSchedulePDF";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { 
  format, 
  startOfToday, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  Calendar,
  Search,
  Printer,
  X,
  Plus,
  Settings,
  ListChecks,
  Ban,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Layers,
} from "lucide-react";

type ViewRange = "today" | "week" | "month" | "upcoming";

type GroupBy = "date" | "status";

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const { effectiveDoctorId, isStaff } = useStaffAccess();
  const { selectedHospitalId } = useDoctorHospitalContext();
  const [viewRange, setViewRange] = useState<ViewRange>("today");
  const [activeTab, setActiveTab] = useState<"appointments" | "availability" | "settings">("appointments");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("date");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null);
  const { appointments, isLoading, updateAppointmentStatus, rescheduleAppointment, updateAppointmentNotes } = useDoctorAppointments(selectedHospitalId || undefined, effectiveDoctorId || undefined);
  const { availability } = useDoctorAvailability(selectedHospitalId || undefined);
  const { data: doctorProfile } = useDoctorProfile(effectiveDoctorId || undefined);
  const batchConfirm = useBatchConfirmAppointments();
  const batchCancel = useBatchCancelAppointments();

  // Query reminder statuses for visible appointments
  const appointmentIds = useMemo(() => appointments.map(a => a.id), [appointments]);
  const { data: reminderStatuses } = useQuery({
    queryKey: ["appointment-reminders", appointmentIds],
    queryFn: async () => {
      if (appointmentIds.length === 0) return {};
      const { data, error } = await supabase
        .from("appointment_reminders")
        .select("appointment_id, status")
        .in("appointment_id", appointmentIds.slice(0, 100));
      if (error) throw error;
      const map: Record<string, "sent" | "failed" | "pending"> = {};
      for (const r of data || []) {
        // If any reminder was sent, mark as sent; failed takes precedence only if none sent
        if (r.status === "sent") map[r.appointment_id] = "sent";
        else if (r.status === "failed" && map[r.appointment_id] !== "sent") map[r.appointment_id] = "failed";
        else if (!map[r.appointment_id]) map[r.appointment_id] = r.status as "pending";
      }
      return map;
    },
    enabled: appointmentIds.length > 0,
    staleTime: 30_000,
  });

  const getDateRange = () => {
    const today = startOfToday();
    switch (viewRange) {
      case "today":
        return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
      case "week":
        return { from: format(startOfWeek(today), "yyyy-MM-dd"), to: format(endOfWeek(today), "yyyy-MM-dd") };
      case "month":
        return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") };
      case "upcoming":
        return { from: format(today, "yyyy-MM-dd"), to: null };
      default:
        return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    }
  };

  const dateRange = getDateRange();

  // Date-filtered appointments (before status/search filters)
  const dateFilteredAppointments = useMemo(() => 
    appointments.filter((appt) => {
      return appt.appointment_date >= dateRange.from && 
        (dateRange.to === null || appt.appointment_date <= dateRange.to);
    }),
    [appointments, dateRange.from, dateRange.to]
  );

  // Apply status + search filters
  const filteredAppointments = useMemo(() => {
    let result = dateFilteredAppointments;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        (a.patient_profile?.display_name || "").toLowerCase().includes(q) ||
        (a.reason || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [dateFilteredAppointments, statusFilter, searchQuery]);

  // Calendar date filter
  const calendarFiltered = useMemo(() => {
    if (!calendarSelectedDate) return filteredAppointments;
    const dateStr = format(calendarSelectedDate, "yyyy-MM-dd");
    return filteredAppointments.filter((a) => a.appointment_date === dateStr);
  }, [filteredAppointments, calendarSelectedDate]);

  const groupedAppointments = useMemo(() => {
    const source = calendarFiltered;
    if (groupBy === "status") {
      return source.reduce((acc, appt) => {
        const status = APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === appt.status)?.label || appt.status || "Unknown";
        if (!acc[status]) acc[status] = [];
        acc[status].push(appt);
        return acc;
      }, {} as Record<string, Appointment[]>);
    }
    return source.reduce((acc, appt) => {
      const date = appt.appointment_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(appt);
      return acc;
    }, {} as Record<string, Appointment[]>);
  }, [calendarFiltered, groupBy]);

  const handleStatusChange = (id: string, status: Appointment["status"]) => {
    updateAppointmentStatus.mutate({ id, status });
  };

  const handleReschedule = (id: string, date: string, startTime: string, endTime: string) => {
    rescheduleAppointment.mutate({ id, appointment_date: date, start_time: startTime, end_time: endTime });
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    updateAppointmentNotes.mutate({ id, notes });
  };

  const handlePrintSchedule = () => {
    const rangeLabels: Record<ViewRange, string> = {
      today: "Today",
      week: "This Week",
      month: "This Month",
      upcoming: "All Upcoming",
    };
    generateSchedulePDF({
      appointments: filteredAppointments,
      doctorName: doctorProfile?.full_name || "Doctor",
      dateLabel: rangeLabels[viewRange],
    });
  };

  const handleViewRangeChange = (range: ViewRange) => {
    setViewRange(range);
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Bulk action handlers
  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkConfirm = () => {
    const ids = Array.from(selectedIds);
    batchConfirm.mutate(ids, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setSelectMode(false);
      },
    });
  };

  const handleBulkCancel = () => {
    const ids = Array.from(selectedIds);
    batchCancel.mutate(ids, {
      onSuccess: () => {
        setSelectedIds(new Set());
        setSelectMode(false);
      },
    });
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
  };

  const getStats = () => {
    const today = format(startOfToday(), "yyyy-MM-dd");
    const todayAppointments = appointments.filter(a => a.appointment_date === today);
    const confirmed = todayAppointments.filter((a) => a.status === "confirmed").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const totalUpcoming = appointments.filter(
      (a) => a.appointment_date >= today && (a.status === "scheduled" || a.status === "confirmed")
    ).length;
    return { confirmed, completed, totalUpcoming, todayTotal: todayAppointments.length };
  };

  const stats = getStats();
  const hasAvailability = availability.length > 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Appointments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your schedule and patient appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={toggleSelectMode}>
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">{selectMode ? "Cancel Select" : "Select"}</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Appointment</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {!hasAvailability && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">No availability configured</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Set up your weekly schedule so patients can book appointments with you.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { icon: CalendarDays, value: stats.todayTotal, label: "Today", gradient: "from-blue-500/15 to-blue-600/5", iconColor: "text-blue-600 dark:text-blue-400", borderColor: "border-blue-200/60 dark:border-blue-800/40" },
          { icon: Clock, value: stats.totalUpcoming, label: "Upcoming", gradient: "from-amber-500/15 to-amber-600/5", iconColor: "text-amber-600 dark:text-amber-400", borderColor: "border-amber-200/60 dark:border-amber-800/40" },
          { icon: CheckCircle2, value: stats.confirmed, label: "Confirmed", gradient: "from-emerald-500/15 to-emerald-600/5", iconColor: "text-emerald-600 dark:text-emerald-400", borderColor: "border-emerald-200/60 dark:border-emerald-800/40" },
          { icon: CheckCircle2, value: stats.completed, label: "Completed", gradient: "from-violet-500/15 to-violet-600/5", iconColor: "text-violet-600 dark:text-violet-400", borderColor: "border-violet-200/60 dark:border-violet-800/40" },
        ].map((stat) => (
          <Card key={stat.label} className={`border ${stat.borderColor} overflow-hidden`}>
            <CardContent className={`pt-3 pb-2.5 sm:pt-4 sm:pb-3 bg-gradient-to-br ${stat.gradient}`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${stat.iconColor} bg-background/80 shadow-sm flex items-center justify-center`}>
                  <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold leading-none">{stat.value}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        {!isStaff && (
          <TabsList>
            <TabsTrigger value="appointments" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <Clock className="h-4 w-4" />
              My Availability
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="appointments" className="space-y-4 mt-4">
          <div className="flex gap-4">
            {/* Mini Calendar Heatmap Sidebar - hidden on mobile */}
            <div className="hidden lg:block w-64 shrink-0 space-y-3">
              <Card>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-sm font-medium">{format(calendarMonth, "MMMM yyyy")}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <MiniCalendarHeatmap
                    appointments={appointments}
                    currentMonth={calendarMonth}
                    selectedDate={calendarSelectedDate}
                    onDateClick={(date) => {
                      if (calendarSelectedDate && format(calendarSelectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")) {
                        setCalendarSelectedDate(null);
                      } else {
                        setCalendarSelectedDate(date);
                        setViewRange("month");
                      }
                    }}
                  />
                  {calendarSelectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={() => setCalendarSelectedDate(null)}
                    >
                      <X className="h-3 w-3 mr-1" /> Clear date filter
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Smart Slot Recommendations */}
              {effectiveDoctorId && <SlotRecommendationsCard doctorId={effectiveDoctorId} />}

              {/* Follow-Up Gap Detector */}
              {effectiveDoctorId && <FollowUpGapCard doctorId={effectiveDoctorId} />}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Sticky filter bar */}
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-3 -mx-1 px-1 space-y-3">
                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
                    {(["today", "week", "month", "upcoming"] as ViewRange[]).map((range) => (
                      <button
                        key={range}
                        onClick={() => { handleViewRangeChange(range); setCalendarSelectedDate(null); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewRange === range
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="hidden sm:inline">{range === "today" ? "Today" : range === "week" ? "This Week" : range === "month" ? "This Month" : "All Upcoming"}</span>
                        <span className="sm:hidden">{range === "today" ? "Today" : range === "week" ? "Week" : range === "month" ? "Month" : "All"}</span>
                      </button>
                    ))}
                  </div>

                  {/* Group By toggle */}
                  <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setGroupBy("date")}
                      className={`p-1.5 rounded-md transition-colors ${groupBy === "date" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Group by date"
                    >
                      <LayoutList className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setGroupBy("status")}
                      className={`p-1.5 rounded-md transition-colors ${groupBy === "status" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      title="Group by status"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative flex-1 min-w-[140px] sm:min-w-[200px] max-w-xs ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient or reason..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-9"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintSchedule} disabled={calendarFiltered.length === 0}>
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Print Schedule</span>
                  </Button>
                </div>

                {/* Status Filter Chips */}
                <AppointmentStatusFilter
                  selectedStatus={statusFilter}
                  onStatusChange={setStatusFilter}
                  appointments={dateFilteredAppointments}
                />
              </div>

              {/* Appointments List */}
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : calendarFiltered.length === 0 ? (
                <Card>
                  <CardContent className="py-8 sm:py-12 text-center">
                    <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      {calendarSelectedDate ? `No appointments on ${format(calendarSelectedDate, "MMM d, yyyy")}` :
                       searchQuery ? "No appointments match your search" :
                       viewRange === "today" ? "No appointments scheduled for today" : "No appointments found for this period"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedAppointments)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([groupKey, appts]) => (
                       <div key={groupKey}>
                        <h3 className="font-medium mb-3 flex items-center gap-2 sticky top-[120px] sm:top-[120px] z-10 bg-background/95 backdrop-blur-md py-2 -mx-1 px-1">
                          {groupBy === "date" ? (
                            <>
                              <CalendarDays className="h-4 w-4" />
                              <span className="sm:hidden">{isToday(new Date(groupKey)) ? "Today" : format(new Date(groupKey), "EEE, MMM d")}</span>
                              <span className="hidden sm:inline">{isToday(new Date(groupKey)) ? "Today" : format(new Date(groupKey), "EEEE, MMMM d, yyyy")}</span>
                            </>
                          ) : (
                            <span>{groupKey}</span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {(appts as Appointment[]).length}
                          </Badge>
                        </h3>
                        <div className="space-y-3">
                          {(appts as Appointment[])
                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                            .map((appointment) => (
                              <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                viewType="doctor"
                                onStatusChange={handleStatusChange}
                                onViewDetails={() => setSelectedAppointment(appointment)}
                                onReschedule={handleReschedule}
                                onUpdateNotes={handleUpdateNotes}
                                isRescheduling={rescheduleAppointment.isPending}
                                isSavingNote={updateAppointmentNotes.isPending}
                                selectable={selectMode}
                                selected={selectedIds.has(appointment.id)}
                                onSelect={handleToggleSelect}
                                reminderStatus={reminderStatuses?.[appointment.id] || "none"}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {!isStaff && (
          <TabsContent value="availability" className="space-y-6 mt-4">
            <AvailabilityEditor hospitalId={selectedHospitalId || undefined} />
            <TimeOffManager />
          </TabsContent>
        )}

        {!isStaff && (
          <TabsContent value="settings" className="space-y-6 mt-4">
            <AppointmentSettingsCard />
          </TabsContent>
        )}
      </Tabs>

      {/* Floating Bulk Action Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border border-border shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleBulkConfirm}
            disabled={batchConfirm.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirm All
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={handleBulkCancel}
            disabled={batchCancel.isPending}
          >
            <Ban className="h-3.5 w-3.5" />
            Cancel Selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSelectedIds(new Set()); setSelectMode(false); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <DoctorCreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        hospitalId={selectedHospitalId || undefined}
      />

      <DoctorPatientDetailsDialog
        open={!!selectedAppointment}
        onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}
        patient={selectedAppointment ? {
          patient_id: selectedAppointment.patient_id,
          display_name: selectedAppointment.patient_profile?.display_name || null,
          gender: null,
          date_of_birth: null,
        } : null}
      />
    </div>
  );
}
