import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { usePathologistProfileCompletion } from "@/hooks/usePathologistProfileCompletion";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Microscope, Heart, Shield, Check, AlertTriangle, FileText, Clock, Users, QrCode, LayoutDashboard, Upload } from "lucide-react";
import { VerificationStatusCard } from "@/components/provider/VerificationStatusCard";
import { PathologistAvatarUpload } from "@/components/pathologist/PathologistAvatarUpload";

const specializations = [
  "Clinical Pathology",
  "Anatomic Pathology",
  "Hematology",
  "Microbiology",
  "Immunology",
  "Molecular Pathology",
  "Cytopathology",
  "Dermatopathology",
  "Forensic Pathology",
  "Other",
];

const PHONE_REGEX = /^[+]?[\d\s\-()]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface LabHours {
  [day: string]: { open: string; close: string; closed: boolean };
}

const defaultLabHours: LabHours = Object.fromEntries(
  DAYS.map((d) => [d, { open: "09:00", close: "18:00", closed: d === "Sunday" }])
);

interface ValidationErrors {
  full_name?: string;
  phone?: string;
  email?: string;
  total_experience?: string;
  license_number?: string;
}

const PathologistProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to profile-completion section when navigated with hash
  useEffect(() => {
    if (location.hash === "#profile-completion") {
      setTimeout(() => {
        document.getElementById("profile-completion")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [location.hash]);
  const { profile, isLoading, updateProfile, isUpdating, isUpdateSuccess, resetUpdateStatus, refetch } = usePathologistProfile();
  const { percentage, completedCount, totalCount } = usePathologistProfileCompletion();
  const { reports } = usePathologistReports();
  const { receivedShares } = useDoctorPathologistShares();
  const [showSaved, setShowSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    specialization_area: "",
    total_experience: "",
    phone: "",
    email: "",
    lab_name: "",
    lab_address: "",
    certifications: "",
  });

  const [labHours, setLabHours] = useState<LabHours>(defaultLabHours);
  const [initialFormData, setInitialFormData] = useState(formData);
  const [initialLabHours, setInitialLabHours] = useState<LabHours>(defaultLabHours);

  useEffect(() => {
    if (profile) {
      const data = {
        full_name: profile.full_name || "",
        license_number: profile.license_number || "",
        specialization_area: profile.specialization_area || "",
        total_experience: profile.total_experience?.toString() || "",
        phone: profile.phone || "",
        email: profile.email || "",
        lab_name: profile.lab_name || "",
        lab_address: profile.lab_address || "",
        certifications: (profile as any).certifications || "",
      };
      setFormData(data);
      setInitialFormData(data);
      setAvatarUrl(profile.avatar_url);
      const hours = (profile as any).lab_hours as LabHours | null;
      if (hours && typeof hours === "object") {
        setLabHours({ ...defaultLabHours, ...hours });
        setInitialLabHours({ ...defaultLabHours, ...hours });
      }
    }
  }, [profile]);

  // Activity stats
  const activityStats = useMemo(() => {
    const totalReports = reports.length;
    const activeCases = receivedShares.filter((s) => s.status !== "completed").length;
    const connectedDoctors = new Set(receivedShares.map((s) => s.doctor_id)).size;
    // Average TAT from reports with timestamps
    const completedReports = reports.filter((r) => r.created_at && r.updated_at);
    let avgTAT = 0;
    if (completedReports.length > 0) {
      const totalHours = completedReports.reduce((sum, r) => {
        const created = new Date(r.created_at).getTime();
        const updated = new Date(r.updated_at).getTime();
        return sum + (updated - created) / (1000 * 60 * 60);
      }, 0);
      avgTAT = Math.round(totalHours / completedReports.length);
    }
    return { totalReports, activeCases, connectedDoctors, avgTAT };
  }, [reports, receivedShares]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
      JSON.stringify(labHours) !== JSON.stringify(initialLabHours);
  }, [formData, initialFormData, labHours, initialLabHours]);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Success animation
  useEffect(() => {
    if (isUpdateSuccess) {
      setShowSaved(true);
      refetch();
      const timer = setTimeout(() => {
        setShowSaved(false);
        resetUpdateStatus();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess, refetch, resetUpdateStatus]);

  // Validation
  const errors = useMemo<ValidationErrors>(() => {
    const e: ValidationErrors = {};
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      e.full_name = "Full name must be at least 2 characters";
    }
    if (formData.phone && !PHONE_REGEX.test(formData.phone)) {
      e.phone = "Invalid phone format";
    }
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      e.email = "Invalid email format";
    }
    if (formData.total_experience) {
      const exp = parseInt(formData.total_experience);
      if (isNaN(exp) || exp < 0 || exp > 70) {
        e.total_experience = "Must be between 0 and 70";
      }
    }
    if (formData.license_number && formData.license_number.trim().length < 3) {
      e.license_number = "Must be at least 3 characters";
    }
    return e;
  }, [formData]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    updateProfile({
      full_name: formData.full_name,
      license_number: formData.license_number || null,
      specialization_area: formData.specialization_area || null,
      total_experience: formData.total_experience ? parseInt(formData.total_experience) : null,
      phone: formData.phone || null,
      email: formData.email || null,
      lab_name: formData.lab_name || null,
      lab_address: formData.lab_address || null,
      certifications: formData.certifications || null,
      lab_hours: labHours,
    } as any);
  };

  const handleAvatarUpload = useCallback((url: string) => {
    setAvatarUrl(url);
    refetch();
  }, [refetch]);

  const updateLabHour = (day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setLabHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--diagnostic-primary))]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            <Heart className="h-4 w-4" />
            Your professional identity matters
          </p>
        </div>
      </div>

      {/* Activity Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          className="diagnostic-stat-card cursor-pointer hover:border-[hsl(var(--diagnostic-primary)/0.3)] transition-colors"
          onClick={() => navigate("/pathologist/reports")}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-primary)/0.1)]">
              <FileText className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reports</p>
              <p className="text-lg font-bold">{activityStats.totalReports}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="diagnostic-stat-card cursor-pointer hover:border-[hsl(var(--diagnostic-primary)/0.3)] transition-colors"
          onClick={() => navigate("/pathologist/patients")}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Cases</p>
              <p className="text-lg font-bold">{activityStats.activeCases}</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="diagnostic-stat-card cursor-pointer hover:border-[hsl(var(--diagnostic-primary)/0.3)] transition-colors"
          onClick={() => navigate("/pathologist/from-doctors")}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-accent)/0.1)]">
              <Users className="h-4 w-4 text-[hsl(var(--diagnostic-accent))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doctors</p>
              <p className="text-lg font-bold">{activityStats.connectedDoctors}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[hsl(var(--diagnostic-primary)/0.1)]">
              <Clock className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg TAT</p>
              <p className="text-lg font-bold">{activityStats.avgTAT}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/pathologist/qr-code")} className="border-[hsl(var(--diagnostic-primary)/0.3)]">
          <QrCode className="h-4 w-4 mr-2" /> View My QR
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/pathologist")} className="border-[hsl(var(--diagnostic-primary)/0.3)]">
          <LayoutDashboard className="h-4 w-4 mr-2" /> Go to Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/pathologist/bulk-entry")} className="border-[hsl(var(--diagnostic-primary)/0.3)]">
          <Upload className="h-4 w-4 mr-2" /> Import Data
        </Button>
      </div>

      {/* Avatar Upload */}
      <Card className="diagnostic-card">
        <CardContent className="flex justify-center py-6">
          {user?.id && (
            <PathologistAvatarUpload
              userId={user.id}
              currentAvatarUrl={avatarUrl}
              fullName={formData.full_name}
              onUploadComplete={handleAvatarUpload}
            />
          )}
        </CardContent>
      </Card>

      {/* Profile Completion */}
      <Card id="profile-completion" className="diagnostic-card overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
              <span className="font-medium">Profile Completion</span>
            </div>
            <span className="text-sm font-bold text-[hsl(var(--diagnostic-primary))]">{percentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full diagnostic-gradient transition-all duration-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {completedCount} of {totalCount} fields complete — profiles build more trust with doctors and patients
          </p>
        </CardContent>
      </Card>

      {/* Verification Status Card */}
      <VerificationStatusCard providerType="pathologist" />

      <Card className="diagnostic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Professional Information
          </CardTitle>
          <CardDescription>
            This information helps doctors and patients trust your expertise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-1">
                  Full Name <span className="text-[hsl(var(--diagnostic-primary))]">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                {errors.license_number ? (
                  <p className="text-xs text-destructive">{errors.license_number}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Helps verify your credentials</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={formData.specialization_area}
                  onValueChange={(value) => setFormData({ ...formData, specialization_area: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="70"
                  value={formData.total_experience}
                  onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                {errors.total_experience && (
                  <p className="text-xs text-destructive">{errors.total_experience}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_name">Lab/Center Name</Label>
                <Input
                  id="lab_name"
                  value={formData.lab_name}
                  onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
                <p className="text-xs text-muted-foreground">Displayed on reports and in search</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab_address">Lab Address</Label>
              <Textarea
                id="lab_address"
                value={formData.lab_address}
                onChange={(e) => setFormData({ ...formData, lab_address: e.target.value })}
                rows={3}
                className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications">Certifications & Accreditations</Label>
              <Textarea
                id="certifications"
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                rows={3}
                placeholder="e.g., NABL Accredited, ISO 15189:2022, CAP Certified..."
                className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
              />
              <p className="text-xs text-muted-foreground">List your lab certifications, one per line</p>
            </div>

            {/* Lab Operating Hours */}
            <div className="space-y-3">
              <Label>Lab Operating Hours</Label>
              <div className="border rounded-lg overflow-hidden">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 even:bg-muted/30"
                  >
                    <span className="text-sm font-medium w-24 shrink-0">{day}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={!labHours[day]?.closed}
                        onChange={(e) => updateLabHour(day, "closed", !e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-xs text-muted-foreground">Open</span>
                    </label>
                    {!labHours[day]?.closed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={labHours[day]?.open || "09:00"}
                          onChange={(e) => updateLabHour(day, "open", e.target.value)}
                          className="h-8 text-xs w-28"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={labHours[day]?.close || "18:00"}
                          onChange={(e) => updateLabHour(day, "close", e.target.value)}
                          className="h-8 text-xs w-28"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Unsaved changes banner */}
            {isDirty && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                You have unsaved changes
              </div>
            )}

            <Button
              type="submit"
              className="diagnostic-gradient text-white hover:opacity-90"
              disabled={isUpdating || hasErrors}
            >
              {showSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathologistProfilePage;
