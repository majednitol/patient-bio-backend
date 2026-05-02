import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useStaffShifts, useShiftMutations, SHIFT_TYPES, StaffShift } from "@/hooks/useStaffShifts";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarClock, Users } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

const getWeekStart = (date: Date) => startOfWeek(date, { weekStartsOn: 1 }); // Monday

export default function HospitalShiftsPage() {
  const { hospital, isAdmin } = useOutletContext<HospitalContext>();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedShiftType, setSelectedShiftType] = useState("regular");
  const [shiftNotes, setShiftNotes] = useState("");

  const { data: shifts, isLoading: shiftsLoading } = useStaffShifts(hospital.id, currentWeekStart);
  const { data: staff, isLoading: staffLoading } = useHospitalStaff(hospital.id);
  const { createShift, deleteShift } = useShiftMutations(hospital.id);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const navigateWeek = (dir: number) => {
    setCurrentWeekStart((prev) => addDays(prev, dir * 7));
  };

  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()));

  const getShiftsForDay = (date: Date): StaffShift[] =>
    shifts?.filter((s) => isSameDay(new Date(s.shift_date + "T00:00:00"), date)) || [];

  const getStaffName = (shift: StaffShift) =>
    shift.staff?.doctor_profile?.full_name ||
    shift.staff?.user_profile?.display_name ||
    "Staff Member";

  const getShiftTypeConfig = (type: string) =>
    SHIFT_TYPES.find((t) => t.value === type) || SHIFT_TYPES[3];

  const handleOpenAdd = (date: Date) => {
    setSelectedDate(date);
    setSelectedStaffId("");
    setSelectedShiftType("regular");
    setShiftNotes("");
    setAddDialogOpen(true);
  };

  const handleCreateShift = async () => {
    if (!selectedDate || !selectedStaffId) return;
    const config = getShiftTypeConfig(selectedShiftType);
    const [start, end] = (config.time !== "Flexible" ? config.time : "09:00-17:00").split("-");

    await createShift.mutateAsync({
      staff_id: selectedStaffId,
      shift_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: start + ":00",
      end_time: end + ":00",
      shift_type: selectedShiftType,
      notes: shiftNotes || undefined,
    });
    setAddDialogOpen(false);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  // Stats
  const totalShiftsThisWeek = shifts?.length || 0;
  const uniqueStaffScheduled = new Set(shifts?.map((s) => s.staff_id)).size;
  const totalStaff = staff?.length || 0;
  const unscheduledStaff = totalStaff - uniqueStaffScheduled;

  if (shiftsLoading || staffLoading) return <PageSkeleton type="dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Shift Planner</h1>
          <p className="text-muted-foreground">Weekly shift assignment and scheduling</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-3xl font-bold">{totalShiftsThisWeek}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Scheduled</p>
                <p className="text-3xl font-bold text-green-600">{uniqueStaffScheduled}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unscheduled</p>
                <p className="text-3xl font-bold text-amber-600">{unscheduledStaff > 0 ? unscheduledStaff : 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-3xl font-bold">{totalStaff}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-semibold ml-2">
            {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
        </div>
        {/* Shift type legend */}
        <div className="hidden md:flex items-center gap-3">
          {SHIFT_TYPES.map((t) => (
            <div key={t.value} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 rounded-full ${t.color}`} />
              <span className="text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const today = isToday(day);

          return (
            <Card
              key={day.toISOString()}
              className={`min-h-[200px] ${today ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium">
                    <span className="text-muted-foreground">{format(day, "EEE")}</span>
                    <br />
                    <span className={`text-lg ${today ? "text-primary font-bold" : ""}`}>
                      {format(day, "d")}
                    </span>
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleOpenAdd(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {dayShifts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No shifts</p>
                )}
                {dayShifts.map((shift) => {
                  const config = getShiftTypeConfig(shift.shift_type);
                  return (
                    <div
                      key={shift.id}
                      className="group relative p-2 rounded-md bg-muted/50 border text-xs space-y-0.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${config.color} flex-shrink-0`} />
                        <span className="font-medium truncate">{getStaffName(shift)}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between">
                        <span>
                          {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">
                          {shift.staff?.role || "staff"}
                        </Badge>
                      </div>
                      {shift.notes && (
                        <p className="text-muted-foreground truncate">{shift.notes}</p>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => deleteShift.mutate(shift.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Assign Shift — {selectedDate ? format(selectedDate, "EEEE, MMM d") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.display_name || s.doctor_profile?.full_name || "Staff"} — {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift Type</Label>
              <Select value={selectedShiftType} onValueChange={setSelectedShiftType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        {t.label} ({t.time})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                placeholder="e.g., covering for Dr. Ahmed"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateShift}
              disabled={!selectedStaffId || createShift.isPending}
            >
              {createShift.isPending ? "Assigning..." : "Assign Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
