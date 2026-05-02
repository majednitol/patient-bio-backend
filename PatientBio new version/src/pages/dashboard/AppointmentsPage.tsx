import { useState, useMemo, useEffect, useCallback } from "react";
import { OfflineUnavailable } from "@/components/pwa/OfflineUnavailable";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMyAppointments } from "@/hooks/useAppointments";
import { usePatientFeatureEligibility } from "@/hooks/usePatientFeatureEligibility";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { BookAppointmentDialog } from "@/components/appointments/BookAppointmentDialog";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { XCircle as XCircleSwipe, CalendarClock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { FeatureGateBlocker } from "@/components/shared/FeatureGateBlocker";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ReminderPreferencesCard } from "@/components/appointments/ReminderPreferencesCard";
import { NextAppointmentCard } from "@/components/appointments/NextAppointmentCard";
import { CancelAppointmentDialog } from "@/components/appointments/CancelAppointmentDialog";
import { RescheduleAppointmentDialog } from "@/components/appointments/RescheduleAppointmentDialog";
import { PatientAppointmentDetailsDialog } from "@/components/appointments/PatientAppointmentDetailsDialog";
import { VisitSummaryCard } from "@/components/dashboard/VisitSummaryCard";
import { WaitlistCard } from "@/components/appointments/WaitlistCard";
import { PostAppointmentFeedbackPrompt } from "@/components/appointments/PostAppointmentFeedbackPrompt";
import { JoinWaitlistDialog } from "@/components/appointments/JoinWaitlistDialog";
import { FollowUpChecklist } from "@/components/appointments/FollowUpChecklist";
import { WaitTimeHistoryBadge } from "@/components/dashboard/WaitTimeHistoryBadge";
import { LiveQueuePositionCard } from "@/components/dashboard/LiveQueuePositionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentListSkeleton } from "@/components/skeletons/AppointmentListSkeleton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays, Plus, Settings, CalendarCheck, Clock, CheckCircle2,
  TrendingUp, List, CalendarRange, XCircle, Bell, Activity, Stethoscope
} from "lucide-react";
import { format, isPast, isToday, isFuture, parseISO, isSameDay, startOfMonth, endOfMonth, isTomorrow, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Appointment } from "@/types/hospital";

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [initialSymptoms, setInitialSymptoms] = useState<string | undefined>();
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>();
  const [mobileQuickFilter, setMobileQuickFilter] = useState<"all" | "today" | "week">("all");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Read ?doctor= query param from FindDoctorPage deep link
  useEffect(() => {
    const doctorId = searchParams.get("doctor");
    if (doctorId) {
      setPreselectedDoctorId(doctorId);
      setIsBookingOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const symptoms = (location.state as any)?.symptoms;
    const openBooking = (location.state as any)?.openBooking;
    if (symptoms) {
      setInitialSymptoms(symptoms);
      setIsBookingOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (openBooking) {
      setIsBookingOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const eligibility = usePatientFeatureEligibility();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);
  const { appointments, isLoading, cancelAppointment, rescheduleAppointment } = useMyAppointments();
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const { isEligible, isLoading: eligibilityLoading } = eligibility;
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
  }, [queryClient]);

  // Listen for FAB book appointment event
  useEffect(() => {
    const handleFabBook = () => {
      if (eligibilityLoading) return;
      if (isEligible) {
        setIsBookingOpen(true);
      }
    };
    window.addEventListener("fab-book-appointment", handleFabBook);
    return () => window.removeEventListener("fab-book-appointment", handleFabBook);
  }, [isEligible, eligibilityLoading]);

  const handleBookClick = () => {
    if (eligibilityLoading) return;
    setIsBookingOpen(true);
  };

  const doctorIds = [...new Set(appointments.map((a) => a.doctor_id))];
  const { data: doctorFees } = useQuery({
    queryKey: ["doctor-fees-batch", doctorIds.join(",")],
    enabled: doctorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("doctor_profiles")
        .select("user_id, consultation_fee")
        .in("user_id", doctorIds);
      const map = new Map<string, number | null>();
      (data || []).forEach((d) => map.set(d.user_id, d.consultation_fee));
      return map;
    },
  });

  const upcomingAppointments = appointments.filter((a) => {
    const date = parseISO(a.appointment_date);
    return (isFuture(date) || isToday(date)) && a.status !== "cancelled" && a.status !== "completed";
  });

  const pastAppointments = appointments.filter((a) => {
    const date = parseISO(a.appointment_date);
    return isPast(date) && !isToday(date) || a.status === "completed" || a.status === "cancelled";
  });

  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
  const confirmedCount = upcomingAppointments.filter(a => a.status === 'confirmed').length;
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  // Mobile quick-filter applied to upcoming
  const quickFilteredUpcoming = useMemo(() => {
    if (mobileQuickFilter === "all") return upcomingAppointments;
    if (mobileQuickFilter === "today") return upcomingAppointments.filter(a => isToday(parseISO(a.appointment_date)));
    // "week" — next 7 days
    const weekEnd = addDays(new Date(), 7);
    return upcomingAppointments.filter(a => {
      const d = parseISO(a.appointment_date);
      return isWithinInterval(d, { start: startOfDay(new Date()), end: endOfDay(weekEnd) });
    });
  }, [upcomingAppointments, mobileQuickFilter]);

  const todayCheckedIn = useMemo(() => {
    return appointments.filter(a => {
      const date = parseISO(a.appointment_date);
      return isToday(date) && a.checked_in_at && a.status !== "completed" && a.status !== "cancelled";
    });
  }, [appointments]);

  const appointmentDates = useMemo(() => {
    const dates = new Map<string, { count: number; hasUpcoming: boolean }>();
    appointments.forEach(a => {
      const key = a.appointment_date;
      const existing = dates.get(key) || { count: 0, hasUpcoming: false };
      existing.count++;
      if (a.status !== "cancelled" && a.status !== "completed") {
        existing.hasUpcoming = true;
      }
      dates.set(key, existing);
    });
    return dates;
  }, [appointments]);

  const calendarDateAppointments = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return appointments.filter(a =>
      isSameDay(parseISO(a.appointment_date), selectedCalendarDate)
    );
  }, [appointments, selectedCalendarDate]);

  const handleCancelClick = (id: string, status?: Appointment["status"]) => {
    if (status === "cancelled") {
      const appt = appointments.find(a => a.id === id);
      if (appt) setCancellingAppointment(appt);
    }
  };

  const handleConfirmCancel = (id: string) => {
    cancelAppointment.mutate(id);
    setCancellingAppointment(null);
  };

  const groupByDate = (appts: Appointment[]) => {
    return appts.reduce((acc, appt) => {
      const date = appt.appointment_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(appt);
      return acc;
    }, {} as Record<string, Appointment[]>);
  };

  const AppointmentSkeleton = () => (
    <Card className="diagnostic-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  const renderAppointmentList = (appts: Appointment[], emptyMessage: string, emptySub: string) => {
    if (appts.length === 0) {
      return (
        <Card className="diagnostic-card border-dashed">
          <CardContent className="py-10 sm:py-16 text-center">
            <div className="p-4 rounded-full bg-primary/5 w-fit mx-auto mb-4">
              <CalendarDays className="h-10 w-10 text-primary/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{emptyMessage}</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-6">
              {emptySub}
            </p>
            {emptyMessage.includes("upcoming") && (
              <Button onClick={handleBookClick}>
                <Plus className="h-4 w-4 mr-2" />
                {t("appointmentsPage.bookNow")}
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    const grouped = groupByDate(appts);

    return (
      <div className="space-y-6">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dayAppts]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                <div className="h-8 px-3 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/15 uppercase tracking-wider">
                  {isToday(parseISO(date)) ? t("notificationsPage.today") : format(parseISO(date), "EEE, MMM d")}
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {t(dayAppts.length !== 1 ? "appointmentsPage.apptCount_plural" : "appointmentsPage.apptCount", { count: dayAppts.length })}
                </Badge>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="space-y-3">
                {dayAppts
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((appointment) => {
                    const isActive = appointment.status !== "completed" && appointment.status !== "cancelled";
                    return (
                      <SwipeableRow
                        key={appointment.id}
                        leftActions={isActive ? [{
                          icon: <CalendarClock className="h-5 w-5" />,
                          label: t("appointmentsPage.reschedule"),
                          color: "bg-primary",
                          onClick: () => setSelectedAppointment(appointment),
                        }] : []}
                        rightActions={isActive ? [{
                          icon: <XCircleSwipe className="h-5 w-5" />,
                          label: t("common.cancel"),
                          color: "bg-destructive",
                          onClick: () => setCancellingAppointment(appointment),
                        }] : []}
                      >
                        <AppointmentCard
                          appointment={appointment}
                          viewType="patient"
                          onStatusChange={handleCancelClick}
                          onViewDetails={(appt) => setSelectedAppointment(appt)}
                          consultationFee={doctorFees?.get(appointment.doctor_id) ?? null}
                        />
                      </SwipeableRow>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    );
  };

  if (eligibility.isLoading) return <PageSkeleton />;
  if (!eligibility.isEligible) return <FeatureGateBlocker eligibility={eligibility} feature="appointments" />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-3 sm:space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
          <Bell className="h-4 w-4 shrink-0" />
          {t("pwa.viewingCachedAppointments", "Showing saved appointments. Booking requires internet.")}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="truncate">{t("appointmentsPage.title")}</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-muted-foreground text-[11px] sm:text-sm">
              {t("appointmentsPage.subtitle")}
            </p>
            <WaitTimeHistoryBadge />
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-10"
            onClick={() => setIsWaitlistOpen(true)}
            disabled={!isOnline}
            title={!isOnline ? t("pwa.featureUnavailableOffline") : undefined}
          >
            <Bell className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            {t("appointmentsPage.waitlist")}
          </Button>
          <Button onClick={handleBookClick} className="flex-1 sm:flex-initial shadow-md text-xs sm:text-sm h-8 sm:h-10" disabled={!isOnline} title={!isOnline ? t("pwa.featureUnavailableOffline") : undefined}>
            <Plus className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            {t("appointmentsPage.book")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Skeleton className="h-24 sm:h-28 rounded-xl" />
            <Skeleton className="h-24 sm:h-28 rounded-xl" />
            <Skeleton className="h-24 sm:h-28 rounded-xl" />
            <Skeleton className="h-24 sm:h-28 rounded-xl" />
          </div>
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-primary">{upcomingAppointments.length}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{t("appointmentsPage.upcoming")}</p>
                  </div>
                  <div className="hidden sm:block p-2 rounded-xl bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
                  <Clock className="h-16 sm:h-20 w-16 sm:w-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-green-200 dark:border-green-800/40 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{completedCount}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{t("appointmentsPage.done")}</p>
                  </div>
                  <div className="hidden sm:block p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
                  <CheckCircle2 className="h-16 sm:h-20 w-16 sm:w-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-red-200/60 dark:border-red-800/30 bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/10 dark:to-red-900/5">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-red-500 dark:text-red-400">{cancelledCount}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{t("common.cancel")}</p>
                  </div>
                  <div className="hidden sm:block p-2 rounded-xl bg-red-100/60 dark:bg-red-900/20">
                    <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
                  <XCircle className="h-16 sm:h-20 w-16 sm:w-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-violet-200/60 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/50 to-violet-100/30 dark:from-violet-950/10 dark:to-violet-900/5">
              <CardContent className="p-2 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">{appointments.length}</p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{t("appointmentsPage.total")}</p>
                  </div>
                  <div className="hidden sm:block p-2 rounded-xl bg-violet-100/60 dark:bg-violet-900/20">
                    <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 opacity-[0.04]">
                  <Activity className="h-16 sm:h-20 w-16 sm:w-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {todayCheckedIn.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t("appointmentsPage.liveQueue")}
              </h2>
              <div className="space-y-2">
                {todayCheckedIn.map((appt) => (
                  <LiveQueuePositionCard key={appt.id} appointmentId={appt.id} />
                ))}
              </div>
            </div>
          )}

          {nextAppointment && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                {t("appointmentsPage.nextUp")}
              </h2>
              <NextAppointmentCard
                appointment={nextAppointment}
                onCancel={(appt) => setCancellingAppointment(appt)}
                onReschedule={(appt) => setReschedulingAppointment(appt)}
                onViewDetails={(appt) => setSelectedAppointment(appt)}
              />
            </div>
          )}

          <PostAppointmentFeedbackPrompt />

          <WaitlistCard />

          <Tabs defaultValue="upcoming" className="w-full">
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
              <TabsList className="flex-1 justify-start overflow-x-auto hide-scrollbar bg-transparent border-b rounded-none h-auto p-0 gap-3 sm:gap-6">
                <TabsTrigger
                  value="upcoming"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 sm:px-2 py-2 sm:py-3 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                >
                  <CalendarCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t("appointmentsPage.upcoming")}
                  {upcomingAppointments.length > 0 && (
                    <Badge variant="secondary" className="ml-0.5 sm:ml-1 px-1.5 py-0 min-w-[18px] text-[10px] justify-center">
                      {upcomingAppointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 sm:px-2 py-2 sm:py-3 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t("appointmentsPage.history")}
                  {pastAppointments.length > 0 && (
                    <Badge variant="outline" className="ml-0.5 sm:ml-1 px-1.5 py-0 min-w-[18px] text-[10px] justify-center">
                      {pastAppointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 sm:px-2 py-2 sm:py-3 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("appointmentsPage.reminders")}</span>
                  <span className="sm:hidden">{t("appointmentsPage.set")}</span>
                </TabsTrigger>
              </TabsList>

              <div className="hidden sm:flex items-center border rounded-lg p-0.5 bg-muted/30 shrink-0">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-3.5 w-3.5" />
                  {t("appointmentsPage.listView")}
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  {t("appointmentsPage.calendarView")}
                </Button>
              </div>
            </div>

            <TabsContent value="upcoming" className="mt-0 outline-none">
              {/* Mobile Quick-Filter Date Chips */}
              <div className="flex sm:hidden gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
                {([
                  { key: "all" as const, label: t("common.all", "All") },
                  { key: "today" as const, label: t("notificationsPage.today", "Today") },
                  { key: "week" as const, label: t("appointmentsPage.thisWeek", "This Week") },
                ] as const).map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setMobileQuickFilter(chip.key)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      mobileQuickFilter === chip.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Mobile Collapsible Calendar */}
              {isMobile && (
                <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen} className="mb-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors">
                      <CalendarRange className="h-3.5 w-3.5" />
                      <span>{calendarOpen ? t("appointmentsPage.hideCalendar") : t("appointmentsPage.showCalendar")}</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Card className="diagnostic-card">
                      <CardContent className="p-2">
                        <Calendar
                          mode="single"
                          selected={selectedCalendarDate}
                          onSelect={(date) => {
                            setSelectedCalendarDate(date);
                            if (date) setCalendarOpen(false);
                          }}
                          className="pointer-events-auto"
                          modifiers={{
                            hasAppointment: (date) => appointmentDates.has(format(date, "yyyy-MM-dd")),
                          }}
                          modifiersStyles={{
                            hasAppointment: {
                              fontWeight: "bold",
                              textDecoration: "underline",
                              textDecorationColor: "hsl(var(--primary))",
                              textUnderlineOffset: "4px",
                            },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {viewMode === "calendar" && !isMobile ? (
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 sm:gap-6">
                  <Card className="diagnostic-card w-full lg:w-auto">
                    <CardContent className="p-2 sm:p-4">
                      <Calendar
                        mode="single"
                        selected={selectedCalendarDate}
                        onSelect={setSelectedCalendarDate}
                        className="pointer-events-auto"
                        modifiers={{
                          hasAppointment: (date) => appointmentDates.has(format(date, "yyyy-MM-dd")),
                        }}
                        modifiersStyles={{
                          hasAppointment: {
                            fontWeight: "bold",
                            textDecoration: "underline",
                            textDecorationColor: "hsl(var(--primary))",
                            textUnderlineOffset: "4px",
                          },
                        }}
                      />
                    </CardContent>
                  </Card>
                  <div className="space-y-3">
                    {selectedCalendarDate ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm">
                            {isToday(selectedCalendarDate) ? t("notificationsPage.today") : format(selectedCalendarDate, "EEEE, MMM d, yyyy")}
                          </h3>
                          <Badge variant="secondary" className="text-[10px]">
                            {t(calendarDateAppointments.length !== 1 ? "appointmentsPage.apptCount_plural" : "appointmentsPage.apptCount", { count: calendarDateAppointments.length })}
                          </Badge>
                        </div>
                        {calendarDateAppointments.length > 0 ? (
                          calendarDateAppointments.map((appointment) => (
                            <AppointmentCard
                              key={appointment.id}
                              appointment={appointment}
                              viewType="patient"
                              onStatusChange={handleCancelClick}
                              onViewDetails={(appt) => setSelectedAppointment(appt)}
                              consultationFee={doctorFees?.get(appointment.doctor_id) ?? null}
                            />
                          ))
                        ) : (
                          <Card className="diagnostic-card border-dashed">
                            <CardContent className="py-8 text-center">
                              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">{t("appointmentsPage.noAppointmentsOnDate")}</p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card className="diagnostic-card border-dashed">
                        <CardContent className="py-12 text-center">
                          <CalendarRange className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">{t("appointmentsPage.selectDateToView")}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">{t("appointmentsPage.datesUnderlined")}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                renderAppointmentList(
                  isMobile ? quickFilteredUpcoming : upcomingAppointments,
                  t("appointmentsPage.noUpcoming"),
                  t("appointmentsPage.noUpcomingSub")
                )
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-0 outline-none space-y-4 sm:space-y-6">
              <FollowUpChecklist />
              <VisitSummaryCard />
              {renderAppointmentList(
                pastAppointments,
                t("appointmentsPage.noPast"),
                t("appointmentsPage.noPastSub")
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-0 outline-none">
              <ReminderPreferencesCard />
            </TabsContent>
          </Tabs>
        </>
      )}

      <BookAppointmentDialog
        open={isBookingOpen}
        onOpenChange={(open) => {
          setIsBookingOpen(open);
          if (!open) {
            setInitialSymptoms(undefined);
            setPreselectedDoctorId(undefined);
          }
        }}
        preselectedDoctorId={preselectedDoctorId}
        initialSymptoms={initialSymptoms}
      />

      <CancelAppointmentDialog
        appointment={cancellingAppointment}
        open={!!cancellingAppointment}
        onOpenChange={(open) => !open && setCancellingAppointment(null)}
        onConfirm={handleConfirmCancel}
      />
      <JoinWaitlistDialog
        open={isWaitlistOpen}
        onOpenChange={setIsWaitlistOpen}
      />
      <PatientAppointmentDetailsDialog
        appointment={selectedAppointment}
        open={!!selectedAppointment}
        onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}
        onCancel={(appt) => {
          setSelectedAppointment(null);
          setCancellingAppointment(appt);
        }}
        onReschedule={(appt) => {
          setSelectedAppointment(null);
          setReschedulingAppointment(appt);
        }}
        consultationFee={selectedAppointment ? doctorFees?.get(selectedAppointment.doctor_id) ?? null : null}
      />

      {reschedulingAppointment && (
        <RescheduleAppointmentDialog
          open={!!reschedulingAppointment}
          onOpenChange={(open) => { if (!open) setReschedulingAppointment(null); }}
          appointment={reschedulingAppointment}
          isRescheduling={rescheduleAppointment.isPending}
          onReschedule={(date, startTime, endTime) => {
            rescheduleAppointment.mutate({
              id: reschedulingAppointment.id,
              appointment_date: date,
              start_time: startTime,
              end_time: endTime,
            });
            setReschedulingAppointment(null);
          }}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
