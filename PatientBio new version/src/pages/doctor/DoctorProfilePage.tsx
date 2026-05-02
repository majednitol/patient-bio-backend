import { useState, useEffect } from "react";
import { useDoctorProfile, useUpdateDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorProfileCompletion } from "@/hooks/useDoctorProfileCompletion";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { SPECIALTIES, COMMON_DISEASES } from "@/types/hospital";
import { DoctorAvatarUpload } from "@/components/doctor/DoctorAvatarUpload";
import { VerificationStatusCard } from "@/components/provider/VerificationStatusCard";
import { DoctorDataImportDialog } from "@/components/doctor/DoctorDataImportDialog";
import { Loader2, Save, User, Upload, Stethoscope, Award, Clock, Phone, BadgeCheck, Wifi, WifiOff, X, Plus, ExternalLink, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const DoctorProfilePage = () => {
  const { user } = useAuth();
  const { isStaff, effectiveDoctorId } = useStaffAccess();
  const { data: profile, isLoading, refetch } = useDoctorProfile(effectiveDoctorId || undefined);
  const updateProfile = useUpdateDoctorProfile();
  const { percentage, completedCount, totalCount, missingFields } = useDoctorProfileCompletion();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    specialty: "",
    qualification: "",
    experience_years: "",
    consultation_fee: "",
    follow_up_fee: "",
    follow_up_window_days: "14",
    phone: "",
    bio: "",
    practice_type: "private",
  });
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [diseasesTreated, setDiseasesTreated] = useState<string[]>([]);
  const [diseaseInput, setDiseaseInput] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        license_number: profile.license_number || "",
        specialty: profile.specialty || "",
        qualification: profile.qualification || "",
        experience_years: profile.experience_years?.toString() || "",
        consultation_fee: profile.consultation_fee?.toString() || "",
        follow_up_fee: profile.follow_up_fee?.toString() || "",
        follow_up_window_days: profile.follow_up_window_days?.toString() || "14",
        phone: profile.phone || "",
        bio: profile.bio || "",
        practice_type: profile.practice_type || "private",
      });
      setAvatarUrl(profile.avatar_url || null);
      setDiseasesTreated(profile.diseases_treated || []);
      setLanguagesSpoken(profile.languages_spoken || []);
    }
  }, [profile]);

  const handleAvatarUploadComplete = (url: string) => {
    setAvatarUrl(url);
    refetch();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateProfile.mutateAsync({
      full_name: formData.full_name,
      license_number: formData.license_number || null,
      specialty: formData.specialty || null,
      qualification: formData.qualification || null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
      follow_up_fee: formData.follow_up_fee ? parseFloat(formData.follow_up_fee) : null,
      follow_up_window_days: formData.follow_up_window_days ? parseInt(formData.follow_up_window_days) : 14,
      phone: formData.phone || null,
      bio: formData.bio || null,
      practice_type: formData.practice_type,
      diseases_treated: diseasesTreated.length > 0 ? diseasesTreated : null,
      languages_spoken: languagesSpoken.length > 0 ? languagesSpoken : null,
    } as any);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Staff read-only view
  if (isStaff) {
    const initials = profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "DR";

    return (
      <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg">
          <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Doctor Profile</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
              You are viewing your employer's profile (read-only)
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{profile?.full_name || "—"}</h2>
              {profile?.is_verified && (
                <Badge className="bg-green-500 mt-1">
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Specialty:</span>
                <span className="font-medium">{profile?.specialty || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Qualification:</span>
                <span className="font-medium">{profile?.qualification || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Experience:</span>
                <span className="font-medium">{profile?.experience_years ? `${profile.experience_years} years` : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{profile?.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">License:</span>
                <span className="font-medium">{profile?.license_number || "—"}</span>
              </div>
              {profile?.bio && (
                <div className="sm:col-span-2 mt-2">
                  <p className="text-sm text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm">{profile.bio}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg">
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Update your professional information
            </p>
          </div>
        </div>
        {user?.id && (
          <Button variant="outline" size="sm" className="gap-1.5 self-start" asChild>
            <a href={`/dashboard/doctor/${user.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Preview Public Profile
            </a>
          </Button>
        )}
      </div>

      {/* Profile Completion Bar */}
      {!isStaff && percentage < 100 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Profile Completion</p>
              <span className="text-sm font-bold text-primary">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} fields completed
              {missingFields.length > 0 && ` — Missing: ${missingFields.slice(0, 3).map(f => f.label).join(", ")}${missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="desktop-sidebar">
        {/* Left column: Avatar, Verification, Data Import */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Photo</CardTitle>
              <CardDescription>
                Upload a professional photo to build trust with patients
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {user?.id && (
                <DoctorAvatarUpload
                  userId={user.id}
                  currentAvatarUrl={avatarUrl}
                  fullName={formData.full_name}
                  onUploadComplete={handleAvatarUploadComplete}
                />
              )}
            </CardContent>
          </Card>

          <VerificationStatusCard providerType="doctor" />

          {/* Online Availability Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Online Status</CardTitle>
              <CardDescription>
                Toggle your availability for patient consultations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {profile?.is_online ? (
                    <Wifi className="h-4 w-4 text-primary" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {profile?.is_online ? "Available" : "Unavailable"}
                  </span>
                </div>
                <Switch
                  checked={profile?.is_online ?? false}
                  onCheckedChange={async (checked) => {
                    if (!user?.id) return;
                    const { error } = await supabase
                      .from("doctor_profiles")
                      .update({ is_online: checked, last_seen_at: new Date().toISOString() } as any)
                      .eq("user_id", user.id);
                    if (error) {
                      toast.error("Failed to update status");
                    } else {
                      toast.success(checked ? "You are now online" : "You are now offline");
                      refetch();
                    }
                  }}
                />
              </div>
              {profile?.last_seen_at && (
                <p className="text-xs text-muted-foreground">
                  Last active {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true })}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Practice Data</CardTitle>
              <CardDescription>
                Migrate your existing patient lists, prescription templates, and clinical notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Easily import data from your current practice management system or EMR.
              </p>
              <Button onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Professional Information form */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>
              This information will be visible to patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Dr. Majedur Rahman"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_number">BMDC / License Number</Label>
                  <Input
                    id="license_number"
                    placeholder="A-12345"
                    value={formData.license_number}
                    onChange={(e) => handleChange("license_number", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => handleChange("specialty", value)}
                  >
                    <SelectTrigger id="specialty">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    placeholder="MBBS, MD"
                    value={formData.qualification}
                    onChange={(e) => handleChange("qualification", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    max="70"
                    placeholder="5"
                    value={formData.experience_years}
                    onChange={(e) => handleChange("experience_years", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">Consultation Fee (৳)</Label>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min="0"
                    placeholder="500"
                    value={formData.consultation_fee}
                    onChange={(e) => handleChange("consultation_fee", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow_up_fee">Follow-up Fee (৳)</Label>
                  <Input
                    id="follow_up_fee"
                    type="number"
                    min="0"
                    placeholder="300"
                    value={formData.follow_up_fee}
                    onChange={(e) => handleChange("follow_up_fee", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow_up_window_days">Follow-up Window (days)</Label>
                  <Input
                    id="follow_up_window_days"
                    type="number"
                    min="1"
                    max="90"
                    placeholder="14"
                    value={formData.follow_up_window_days}
                    onChange={(e) => handleChange("follow_up_window_days", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Patients returning within this period pay the follow-up fee
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+880 1XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio / About</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell patients about yourself, your experience, and expertise..."
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Practice Type */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="practice_type">Practice Type</Label>
                  <Select
                    value={formData.practice_type}
                    onValueChange={(value) => handleChange("practice_type", value)}
                  >
                    <SelectTrigger id="practice_type">
                      <SelectValue placeholder="Select practice type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private Practice</SelectItem>
                      <SelectItem value="hospital">Hospital Practice</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.practice_type === "private" && "You manage all appointments and data through your Doctor Portal."}
                    {formData.practice_type === "hospital" && "Appointments and data are managed by Hospital Staff."}
                    {formData.practice_type === "both" && "You operate both independently and through a hospital."}
                  </p>
                </div>

                {/* Diseases Treated */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Diseases & Conditions Treated</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {diseasesTreated.map((d, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {d}
                        <button
                          type="button"
                          onClick={() => setDiseasesTreated((prev) => prev.filter((_, j) => j !== i))}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a condition and press Enter..."
                      value={diseaseInput}
                      onChange={(e) => setDiseaseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = diseaseInput.trim().replace(/,$/, "");
                          if (val && !diseasesTreated.includes(val)) {
                            setDiseasesTreated((prev) => [...prev, val]);
                          }
                          setDiseaseInput("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const val = diseaseInput.trim();
                        if (val && !diseasesTreated.includes(val)) {
                          setDiseasesTreated((prev) => [...prev, val]);
                        }
                        setDiseaseInput("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Suggestions */}
                  {diseaseInput.trim() && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {COMMON_DISEASES.filter(
                        (d) =>
                          d.toLowerCase().includes(diseaseInput.toLowerCase()) &&
                          !diseasesTreated.includes(d)
                      )
                        .slice(0, 5)
                        .map((d) => (
                          <Badge
                            key={d}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => {
                              setDiseasesTreated((prev) => [...prev, d]);
                              setDiseaseInput("");
                            }}
                          >
                            + {d}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>

                {/* Languages Spoken */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Languages Spoken
                  </Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {languagesSpoken.map((lang, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {lang}
                        <button
                          type="button"
                          onClick={() => setLanguagesSpoken((prev) => prev.filter((_, j) => j !== i))}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a language and press Enter..."
                      value={languageInput}
                      onChange={(e) => setLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = languageInput.trim().replace(/,$/, "");
                          if (val && !languagesSpoken.includes(val)) {
                            setLanguagesSpoken((prev) => [...prev, val]);
                          }
                          setLanguageInput("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const val = languageInput.trim();
                        if (val && !languagesSpoken.includes(val)) {
                          setLanguagesSpoken((prev) => [...prev, val]);
                        }
                        setLanguageInput("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Common language suggestions */}
                  {languageInput.trim() && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["Bengali", "English", "Hindi", "Arabic", "Urdu", "Spanish", "French", "Mandarin"]
                        .filter(
                          (l) =>
                            l.toLowerCase().includes(languageInput.toLowerCase()) &&
                            !languagesSpoken.includes(l)
                        )
                        .slice(0, 5)
                        .map((l) => (
                          <Badge
                            key={l}
                            variant="outline"
                            className="cursor-pointer hover:bg-secondary"
                            onClick={() => {
                              setLanguagesSpoken((prev) => [...prev, l]);
                              setLanguageInput("");
                            }}
                          >
                            + {l}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateProfile.isPending || !formData.full_name}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <DoctorDataImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
};

export default DoctorProfilePage;
