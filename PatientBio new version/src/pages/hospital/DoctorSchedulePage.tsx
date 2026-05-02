import { useState } from "react";
import { useParams } from "react-router-dom";
import { format, startOfWeek, addWeeks, subWeeks, isSameWeek } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarCheck, Users, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHospitalDoctorSchedule } from "@/hooks/useHospitalDoctorSchedule";
import { DoctorScheduleGrid } from "@/components/hospital/DoctorScheduleGrid";
import { DoctorScheduleLegend } from "@/components/hospital/DoctorScheduleLegend";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function DoctorSchedulePage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const { doctors, availabilityMap, timeOffMap, isLoading } = useHospitalDoctorSchedule(
    hospitalId,
    weekStart
  );

  const today = new Date();
  const todayDayOfWeek = today.getDay();

  // Calculate summary stats
  const totalDoctors = doctors.length;
  
  const doctorsAvailableToday = doctors.filter((doctor) => {
    const availabilities = availabilityMap.get(doctor.user_id) || [];
    return availabilities.some((a) => a.day_of_week === todayDayOfWeek);
  }).length;

  const doctorsOnLeaveToday = doctors.filter((doctor) => {
    const timeOffs = timeOffMap.get(doctor.user_id) || [];
    return timeOffs.some((to) => {
      const start = new Date(to.start_date);
      const end = new Date(to.end_date);
      return today >= start && today <= end;
    });
  }).length;

  const handlePreviousWeek = () => setWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));
  const handleCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  if (isLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Doctor Schedules
          </h1>
          <p className="text-muted-foreground mt-1">
            View all doctors' weekly availability at a glance
          </p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium min-w-[180px] text-center">
            {format(weekStart, "MMM d")} – {format(addWeeks(weekStart, 1), "MMM d, yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="secondary" size="sm" onClick={handleCurrentWeek}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Doctors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDoctors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              Available Today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{doctorsAvailableToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              On Leave Today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{doctorsOnLeaveToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <DoctorScheduleLegend />

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Showing availability configured specifically for this hospital
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <DoctorScheduleGrid
            doctors={doctors}
            availabilityMap={availabilityMap}
            timeOffMap={timeOffMap}
            weekStart={weekStart}
            hospitalId={hospitalId || ""}
          />
        </CardContent>
      </Card>

      {/* Info Note */}
      <p className="text-xs text-muted-foreground">
        * Doctors may have different schedules at other hospitals or private practice. 
        This view shows only the availability configured for this specific institution.
      </p>
    </div>
  );
}
