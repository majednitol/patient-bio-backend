import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useDoctorSettings } from "@/hooks/useDoctorSettings";
import { useState, useEffect } from "react";
import { Settings, Clock, CalendarCheck, ShieldCheck, Users } from "lucide-react";

export function AppointmentSettingsCard() {
  const { settings, isLoading, upsertSettings } = useDoctorSettings();

  const [autoConfirm, setAutoConfirm] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [maxPerDay, setMaxPerDay] = useState(0);
  const [minAdvanceHours, setMinAdvanceHours] = useState(0);
  const [defaultMinutes, setDefaultMinutes] = useState(15);

  useEffect(() => {
    if (settings) {
      setAutoConfirm(settings.auto_confirm_appointments ?? false);
      setBufferMinutes(settings.buffer_minutes ?? 0);
      setMaxPerDay(settings.max_appointments_per_day ?? 0);
      setMinAdvanceHours(settings.min_advance_booking_hours ?? 0);
      setDefaultMinutes(settings.default_consultation_minutes ?? 15);
    }
  }, [settings]);

  const handleSave = () => {
    upsertSettings.mutate({
      auto_confirm_appointments: autoConfirm,
      buffer_minutes: bufferMinutes,
      max_appointments_per_day: maxPerDay,
      min_advance_booking_hours: minAdvanceHours,
      default_consultation_minutes: defaultMinutes,
    });
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Appointment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Default slot duration */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label>Default Slot Duration</Label>
              <p className="text-xs text-muted-foreground">Minutes per appointment</p>
            </div>
          </div>
          <Input
            type="number"
            min={5}
            max={120}
            value={defaultMinutes}
            onChange={(e) => setDefaultMinutes(Number(e.target.value))}
            className="w-20 text-center"
          />
        </div>

        {/* Buffer time */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label>Buffer Between Appointments</Label>
              <p className="text-xs text-muted-foreground">Minutes gap between slots</p>
            </div>
          </div>
          <Input
            type="number"
            min={0}
            max={60}
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            className="w-20 text-center"
          />
        </div>

        {/* Max per day */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label>Max Appointments Per Day</Label>
              <p className="text-xs text-muted-foreground">0 = unlimited</p>
            </div>
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(Number(e.target.value))}
            className="w-20 text-center"
          />
        </div>

        {/* Min advance booking */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label>Minimum Advance Booking</Label>
              <p className="text-xs text-muted-foreground">Hours before appointment</p>
            </div>
          </div>
          <Input
            type="number"
            min={0}
            max={168}
            value={minAdvanceHours}
            onChange={(e) => setMinAdvanceHours(Number(e.target.value))}
            className="w-20 text-center"
          />
        </div>

        {/* Auto-confirm */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label>Auto-Confirm Appointments</Label>
              <p className="text-xs text-muted-foreground">Skip manual confirmation step</p>
            </div>
          </div>
          <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
        </div>

        <Button onClick={handleSave} disabled={upsertSettings.isPending} className="w-full">
          {upsertSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
