import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorAvailability, DAYS_OF_WEEK } from "@/types/hospital";
import { useDoctorAvailability } from "@/hooks/useDoctorAvailability";
import { AvailabilityWeeklyGrid } from "@/components/doctor/AvailabilityWeeklyGrid";
import { Clock, Trash2, Plus, Calendar, LayoutGrid, List } from "lucide-react";

interface AvailabilityEditorProps {
  hospitalId?: string;
}

export function AvailabilityEditor({ hospitalId }: AvailabilityEditorProps) {
  const { availability, isLoading, upsertAvailability, deleteAvailability } = useDoctorAvailability(hospitalId);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [formData, setFormData] = useState({
    start_time: "09:00",
    end_time: "17:00",
    slot_duration_minutes: 30,
  });

  const handleSave = async (dayOfWeek: number) => {
    await upsertAvailability.mutateAsync({
      day_of_week: dayOfWeek,
      start_time: formData.start_time + ":00",
      end_time: formData.end_time + ":00",
      slot_duration_minutes: formData.slot_duration_minutes,
      is_active: true,
    });
    setEditingDay(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAvailability.mutateAsync(id);
  };

  const getAvailabilityForDay = (dayOfWeek: number): DoctorAvailability | undefined => {
    return availability.find((a) => a.day_of_week === dayOfWeek);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleGridDayClick = (dayOfWeek: number) => {
    const existing = getAvailabilityForDay(dayOfWeek);
    if (existing) {
      setFormData({
        start_time: formatTime(existing.start_time),
        end_time: formatTime(existing.end_time),
        slot_duration_minutes: existing.slot_duration_minutes,
      });
    } else {
      setFormData({ start_time: "09:00", end_time: "17:00", slot_duration_minutes: 30 });
    }
    setEditingDay(dayOfWeek);
    setViewMode("list");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>
              Set your available hours for each day of the week
            </CardDescription>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "grid" ? (
          <AvailabilityWeeklyGrid availability={availability} onDayClick={handleGridDayClick} />
        ) : (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayAvailability = getAvailabilityForDay(day.value);
            const isEditing = editingDay === day.value;

            return (
              <div
                key={day.value}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-28 font-medium">{day.label}</div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">From</Label>
                        <Input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">To</Label>
                        <Input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Slot</Label>
                        <Select
                          value={formData.slot_duration_minutes.toString()}
                          onValueChange={(v) => setFormData({ ...formData, slot_duration_minutes: parseInt(v) })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : dayAvailability ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatTime(dayAvailability.start_time)} - {formatTime(dayAvailability.end_time)}
                      </span>
                      <span className="text-muted-foreground">
                        ({dayAvailability.slot_duration_minutes} min slots)
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not available</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSave(day.value)}
                        disabled={upsertAvailability.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDay(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : dayAvailability ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFormData({
                            start_time: formatTime(dayAvailability.start_time),
                            end_time: formatTime(dayAvailability.end_time),
                            slot_duration_minutes: dayAvailability.slot_duration_minutes,
                          });
                          setEditingDay(day.value);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(dayAvailability.id)}
                        disabled={deleteAvailability.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          start_time: "09:00",
                          end_time: "17:00",
                          slot_duration_minutes: 30,
                        });
                        setEditingDay(day.value);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
