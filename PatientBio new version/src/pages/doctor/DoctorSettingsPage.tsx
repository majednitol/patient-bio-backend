import { useState, useEffect, useMemo } from "react";
import { useDoctorSettings } from "@/hooks/useDoctorSettings";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Bell, Clock, MessageSquare, Save } from "lucide-react";

const TIMEZONES = [
  "Asia/Dhaka", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Pacific/Auckland", "Australia/Sydney",
];

export default function DoctorSettingsPage() {
  const { settings, isLoading, upsertSettings } = useDoctorSettings();
  const { data: doctorProfile } = useDoctorProfile();
  const specialtyConfig = useMemo(() => getSpecialtyConfig(doctorProfile?.specialty), [doctorProfile?.specialty]);

  const [form, setForm] = useState({
    default_consultation_minutes: specialtyConfig.defaultConsultationMinutes,
    timezone: "Asia/Dhaka",
    email_digest_enabled: true,
    notification_new_patient: true,
    notification_appointment: true,
    notification_prescription: true,
    notification_referral: true,
    auto_reply_enabled: false,
    auto_reply_message: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_consultation_minutes: settings.default_consultation_minutes,
        timezone: settings.timezone,
        email_digest_enabled: settings.email_digest_enabled,
        notification_new_patient: settings.notification_new_patient,
        notification_appointment: settings.notification_appointment,
        notification_prescription: settings.notification_prescription,
        notification_referral: settings.notification_referral,
        auto_reply_enabled: settings.auto_reply_enabled,
        auto_reply_message: settings.auto_reply_message || "",
      });
    } else if (!isLoading) {
      // Pre-fill from specialty config for new doctors (no saved settings yet)
      setForm(f => ({ ...f, default_consultation_minutes: specialtyConfig.defaultConsultationMinutes }));
    }
  }, [settings, isLoading, specialtyConfig.defaultConsultationMinutes]);

  const handleSave = () => {
    upsertSettings.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-7 sm:w-7" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">Manage your practice preferences</p>
      </div>

      {/* Consultation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Consultation Settings
          </CardTitle>
          <CardDescription>Configure default appointment settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Consultation Duration (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={180}
                value={form.default_consultation_minutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_consultation_minutes: parseInt(e.target.value) || 30 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Digest</Label>
              <p className="text-sm text-muted-foreground">Receive a summary email</p>
            </div>
            <Switch
              checked={form.email_digest_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, email_digest_enabled: v }))}
            />
          </div>
          <Separator />
          {[
            { key: "notification_new_patient" as const, label: "New Patient Connections", desc: "When a patient connects with you" },
            { key: "notification_appointment" as const, label: "Appointments", desc: "Bookings, cancellations, and reminders" },
            { key: "notification_prescription" as const, label: "Prescriptions", desc: "Prescription-related updates" },
            { key: "notification_referral" as const, label: "Referrals", desc: "Doctor-to-doctor referral notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={form[item.key]}
                onCheckedChange={(v) => setForm((f) => ({ ...f, [item.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auto-Reply */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Auto-Reply
          </CardTitle>
          <CardDescription>Set an automatic reply when you're unavailable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-Reply</Label>
              <p className="text-sm text-muted-foreground">Automatically respond to new messages</p>
            </div>
            <Switch
              checked={form.auto_reply_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, auto_reply_enabled: v }))}
            />
          </div>
          {form.auto_reply_enabled && (
            <div className="space-y-2">
              <Label>Auto-Reply Message</Label>
              <Textarea
                value={form.auto_reply_message}
                onChange={(e) => setForm((f) => ({ ...f, auto_reply_message: e.target.value }))}
                placeholder="I'm currently unavailable. I'll respond as soon as possible."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsertSettings.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {upsertSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
