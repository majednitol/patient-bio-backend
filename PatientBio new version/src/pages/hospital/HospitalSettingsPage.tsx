import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useUpdateHospital } from "@/hooks/useHospitals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2, ImageIcon, Clock, Bell } from "lucide-react";
import { HospitalLogoUpload } from "@/components/hospital/HospitalLogoUpload";
import { toast } from "@/hooks/use-toast";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface OperatingHours {
  [day: string]: { enabled: boolean; open: string; close: string };
}

interface NotificationPrefs {
  newApplications: boolean;
  lowBedAvailability: boolean;
  overdueInvoices: boolean;
}

const defaultHours: OperatingHours = Object.fromEntries(
  DAYS.map((day, i) => [
    day,
    { enabled: i >= 1 && i <= 5, open: "09:00", close: "17:00" },
  ])
);

const defaultNotifications: NotificationPrefs = {
  newApplications: true,
  lowBedAvailability: true,
  overdueInvoices: true,
};

export default function HospitalSettingsPage() {
  const { hospital } = useOutletContext<HospitalContext>();
  const updateHospital = useUpdateHospital();

  const [logoUrl, setLogoUrl] = useState(hospital.logo_url || "");
  const [formData, setFormData] = useState({
    name: hospital.name,
    registration_number: hospital.registration_number || "",
    address: hospital.address || "",
    city: hospital.city || "",
    state: hospital.state || "",
    country: hospital.country || "Bangladesh",
    phone: hospital.phone || "",
    email: hospital.email || "",
    website: hospital.website || "",
    description: hospital.description || "",
  });

  // Operating hours state (stored locally, saved with hospital update)
  const existingPrefs = (hospital as any).preferences || {};
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(
    existingPrefs.operating_hours || defaultHours
  );
  const [notifications, setNotifications] = useState<NotificationPrefs>(
    existingPrefs.notifications || defaultNotifications
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHospital.mutateAsync({
      id: hospital.id,
      ...formData,
      logo_url: logoUrl || null,
    });
  };

  const handleLogoUpload = (url: string) => {
    setLogoUrl(url);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateDayHours = (day: string, field: string, value: string | boolean) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hospital Settings</h1>
        <p className="text-muted-foreground">Manage your hospital's information</p>
      </div>

      {/* Logo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Hospital Logo
          </CardTitle>
          <CardDescription>Upload your hospital's logo or branding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <HospitalLogoUpload
              hospitalId={hospital.id}
              currentLogoUrl={logoUrl || null}
              hospitalName={hospital.name}
              onUploadComplete={handleLogoUpload}
            />
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              <p>Upload a logo to represent your hospital.</p>
              <p className="mt-1">Accepted formats: JPG, PNG, WebP (max 2MB)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>Set your hospital's daily operating schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const hours = operatingHours[day];
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={hours.enabled}
                        onCheckedChange={(v) => updateDayHours(day, "enabled", v)}
                      />
                      <span className={`text-sm font-medium ${hours.enabled ? "" : "text-muted-foreground"}`}>
                        {day.slice(0, 3)}
                      </span>
                    </div>
                  </div>
                  {hours.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateDayHours(day, "open", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateDayHours(day, "close", e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                  {!hours.enabled && (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Configure email alerts for important events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">New Doctor Applications</p>
                <p className="text-xs text-muted-foreground">Get notified when doctors apply to join</p>
              </div>
              <Switch
                checked={notifications.newApplications}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, newApplications: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Low Bed Availability</p>
                <p className="text-xs text-muted-foreground">Alert when occupancy exceeds 85%</p>
              </div>
              <Switch
                checked={notifications.lowBedAvailability}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, lowBedAvailability: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Overdue Invoices</p>
                <p className="text-xs text-muted-foreground">Alert when invoices pass their due date</p>
              </div>
              <Switch
                checked={notifications.overdueInvoices}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, overdueInvoices: v }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Information
          </CardTitle>
          <CardDescription>Update your hospital's public profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Hospital Name *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input id="registration_number" name="registration_number" value={formData.registration_number} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Location</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" value={formData.state} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" type="url" value={formData.website} onChange={handleChange} />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={updateHospital.isPending}>
              {updateHospital.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
