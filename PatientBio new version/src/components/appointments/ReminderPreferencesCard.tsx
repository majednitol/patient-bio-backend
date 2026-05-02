import { useState, useEffect } from "react";
import { useReminderPreferences } from "@/hooks/useReminderPreferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail, MessageSquare, Clock, Loader2 } from "lucide-react";

const REMINDER_OPTIONS = [
  { hours: 1, label: "1 hour before" },
  { hours: 2, label: "2 hours before" },
  { hours: 6, label: "6 hours before" },
  { hours: 12, label: "12 hours before" },
  { hours: 24, label: "24 hours before" },
  { hours: 48, label: "48 hours before" },
];

export function ReminderPreferencesCard() {
  const { preferences, isLoading, upsertPreferences } = useReminderPreferences();
  
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [selectedHours, setSelectedHours] = useState<number[]>([24]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.email_enabled);
      setSmsEnabled(preferences.sms_enabled);
      setSelectedHours(preferences.reminder_hours);
    }
  }, [preferences]);

  useEffect(() => {
    if (preferences) {
      const changed =
        emailEnabled !== preferences.email_enabled ||
        smsEnabled !== preferences.sms_enabled ||
        JSON.stringify(selectedHours.sort()) !== JSON.stringify([...preferences.reminder_hours].sort());
      setHasChanges(changed);
    } else {
      setHasChanges(emailEnabled || smsEnabled);
    }
  }, [emailEnabled, smsEnabled, selectedHours, preferences]);

  const handleHoursToggle = (hours: number) => {
    setSelectedHours((prev) =>
      prev.includes(hours) ? prev.filter((h) => h !== hours) : [...prev, hours]
    );
  };

  const handleSave = () => {
    upsertPreferences.mutate({
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
      reminder_hours: selectedHours.length > 0 ? selectedHours : [24],
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Appointment Reminders
        </CardTitle>
        <CardDescription>
          Configure how you'd like to receive appointment reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Channels</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="email-toggle">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive reminders via email</p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="sms-toggle">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive reminders via text message</p>
              </div>
            </div>
            <Switch
              id="sms-toggle"
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>
        </div>

        {/* Reminder Timing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Reminder Timing</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Select when you'd like to receive reminders
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {REMINDER_OPTIONS.map((option) => (
              <div key={option.hours} className="flex items-center space-x-2">
                <Checkbox
                  id={`hours-${option.hours}`}
                  checked={selectedHours.includes(option.hours)}
                  onCheckedChange={() => handleHoursToggle(option.hours)}
                  disabled={!emailEnabled && !smsEnabled}
                />
                <Label
                  htmlFor={`hours-${option.hours}`}
                  className={!emailEnabled && !smsEnabled ? "text-muted-foreground" : ""}
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || upsertPreferences.isPending}
          className="w-full"
        >
          {upsertPreferences.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>

        {!emailEnabled && !smsEnabled && selectedHours.length > 0 && (
          <p className="text-sm text-destructive text-center">
            ⚠️ All notifications are disabled. You won't receive appointment reminders.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
