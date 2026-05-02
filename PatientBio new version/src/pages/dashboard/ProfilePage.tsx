import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, UserProfileUpdate } from "@/hooks/useUserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User, Mail, Calendar, MapPin, Phone, Save, Loader2, Copy, Check,
  Shield, QrCode, BadgeCheck, Clock, Briefcase, Home, CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileStickyFormBar } from "@/components/dashboard/MobileStickyFormBar";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import { ProfileAccountSummary } from "@/components/dashboard/ProfileAccountSummary";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading, saving, updateProfile } = useUserProfile();
  const { data: completionMetrics } = useProfileCompletion();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [copiedId, setCopiedId] = useState(false);
  const completionRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<UserProfileUpdate>({
    display_name: "",
    date_of_birth: "",
    gender: "",
    location: "",
    phone: "",
    occupation: "",
    address: "",
    national_id: "",
    notification_email_enabled: true,
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "",
        location: profile.location || "",
        phone: profile.phone || "",
        occupation: (profile as any).occupation || "",
        address: (profile as any).address || "",
        national_id: (profile as any).national_id || "",
        notification_email_enabled: profile.notification_email_enabled ?? true,
      });
    }
  }, [profile]);

  // Scroll to #profile-completion hash
  useEffect(() => {
    if (location.hash === "#profile-completion" && completionRef.current) {
      setTimeout(() => {
        completionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [location.hash, loading]);

  // Dirty state check
  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      (formData.display_name || "") !== (profile.display_name || "") ||
      (formData.date_of_birth || "") !== (profile.date_of_birth || "") ||
      (formData.gender || "") !== (profile.gender || "") ||
      (formData.location || "") !== (profile.location || "") ||
      (formData.phone || "") !== (profile.phone || "") ||
      (formData.occupation || "") !== ((profile as any).occupation || "") ||
      (formData.address || "") !== ((profile as any).address || "") ||
      (formData.national_id || "") !== ((profile as any).national_id || "")
    );
  }, [formData, profile]);

  const handleChange = (field: keyof UserProfileUpdate, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(formData.date_of_birth || null);
  const passportId = profile?.patient_passport_id || null;
  const legacyId = user?.id?.substring(0, 8).toUpperCase() || "N/A";
  const isComplete = completionMetrics?.percentage === 100;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleCopyPassportId = async () => {
    if (!passportId) return;
    try {
      await navigator.clipboard.writeText(passportId);
      setCopiedId(true);
      toast({
        title: t("profilePage.copied"),
        description: t("profilePage.healthPassportCopied"),
      });
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast({
        title: t("profilePage.failedToCopy"),
        description: t("profilePage.copyManually"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 pb-20 sm:pb-6">
      {/* Global Health Passport Card — Redesigned */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-lg px-3 py-2.5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg md:text-xl">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
              {t("profilePage.globalHealthPassport")}
            </CardTitle>
            {isComplete && (
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("profilePage.verified", "Verified")}
              </div>
            )}
          </div>
          <CardDescription className="text-xs sm:text-sm md:text-base">
            {t("profilePage.uniqueHealthId")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3 px-3 sm:pt-6 sm:px-6">
          <div className="space-y-4">
            {/* Passport ID with Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-muted/50 rounded-lg p-2.5 sm:p-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/20 shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={t("profilePage.profilePhoto", "Profile photo")} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {getInitials(profile?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.healthPassportId")}</Label>
                  <div className="font-mono text-base sm:text-xl font-bold text-primary tracking-wider truncate">
                    {passportId || legacyId}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassportId}
                  disabled={!passportId}
                  className="touch-target press-feedback"
                  aria-label={t("profilePage.copyPassportId", "Copy Passport ID")}
                >
                  {copiedId ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/dashboard/qr-code")}
                  className="touch-target press-feedback"
                  aria-label={t("profilePage.showQrCode", "Show QR Code")}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Patient Info Grid — expanded */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 pt-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("profilePage.email")}</Label>
                <div className="flex items-center gap-2 text-sm md:text-base">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>
              {formData.display_name && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.fullName")}</Label>
                  <div className="text-sm md:text-base font-medium">{formData.display_name}</div>
                </div>
              )}
              {age !== null && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.age")}</Label>
                  <div className="text-sm md:text-base">{age} {t("profilePage.yearsOld")}</div>
                </div>
              )}
              {formData.gender && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.gender")}</Label>
                  <div className="text-sm md:text-base capitalize">{t(`profilePage.${formData.gender}`, formData.gender)}</div>
                </div>
              )}
              {formData.location && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.location")}</Label>
                  <div className="flex items-center gap-2 text-sm md:text-base">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{formData.location}</span>
                  </div>
                </div>
              )}
              {formData.phone && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("profilePage.phoneNumber")}</Label>
                  <div className="flex items-center gap-2 text-sm md:text-base">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{formData.phone}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              {t("profilePage.idUsedByProviders")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Summary Strip */}
      <ProfileAccountSummary />

      {/* Profile Completion Section */}
      <div ref={completionRef} id="profile-completion">
        <ProfileCompletionCard />
      </div>

      {/* Editable Profile Form — improved */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <CardTitle>{t("profilePage.editProfile")}</CardTitle>
              <CardDescription>
                {t("profilePage.updatePersonalInfo")}
              </CardDescription>
            </div>
            {profile?.updated_at && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("profilePage.lastUpdated", "Last updated")}{" "}
                {format(new Date(profile.updated_at), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Avatar Upload Section */}
          <div className="flex justify-center pb-3 sm:pb-6 border-b mb-3 sm:mb-6">
            <AvatarUpload
              userId={user?.id || ""}
              currentAvatarUrl={profile?.avatar_url || null}
              displayName={formData.display_name || null}
              onUploadComplete={(url) => {
                updateProfile({ avatar_url: url });
              }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Personal Information Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{t("profilePage.personalInfo", "Personal Information")}</h3>
              <p className="text-xs text-muted-foreground">{t("profilePage.personalInfoDesc", "Your name, date of birth, and gender")}</p>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="display_name">{t("profilePage.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                    id="display_name"
                    placeholder={t("profilePage.namePlaceholder")}
                    className="pl-10"
                    value={formData.display_name || ""}
                    onChange={(e) => handleChange("display_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">{t("profilePage.dateOfBirth")}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date_of_birth"
                      type="date"
                      className="pl-10"
                      value={formData.date_of_birth || ""}
                      onChange={(e) => handleChange("date_of_birth", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t("profilePage.gender")}</Label>
                  <Select
                    value={formData.gender || ""}
                    onValueChange={(value) => handleChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("profilePage.selectGender")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("profilePage.male")}</SelectItem>
                      <SelectItem value="female">{t("profilePage.female")}</SelectItem>
                      <SelectItem value="other">{t("profilePage.other")}</SelectItem>
                      <SelectItem value="prefer_not_to_say">{t("profilePage.preferNotToSay")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>

            {/* Occupation */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="occupation">{t("profilePage.occupation")}</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="occupation"
                  placeholder={t("profilePage.occupationPlaceholder")}
                  className="pl-10"
                  value={formData.occupation || ""}
                  onChange={(e) => handleChange("occupation", e.target.value)}
                />
              </div>
            </div>
            </div>

            <Separator />

            {/* Contact Information Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{t("profilePage.contactInfo", "Contact Information")}</h3>
              <p className="text-xs text-muted-foreground">{t("profilePage.contactInfoDesc", "Your location and phone number")}</p>
            </div>

            <div className="space-y-2 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="location">{t("profilePage.location")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder={t("profilePage.locationPlaceholder")}
                    className="pl-10"
                    value={formData.location || ""}
                    onChange={(e) => handleChange("location", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("profilePage.phoneNumber")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t("profilePage.phonePlaceholder")}
                    className="pl-10"
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="address">{t("profilePage.address")}</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder={t("profilePage.addressPlaceholder")}
                    className="pl-10"
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* National ID Section */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{t("profilePage.nationalId")}</h3>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="national_id"
                  placeholder={t("profilePage.nationalIdPlaceholder")}
                  className="pl-10"
                  value={formData.national_id || ""}
                  onChange={(e) => handleChange("national_id", e.target.value)}
                />
              </div>
            </div>

            {/* Desktop Save button */}
            <div className="hidden lg:block space-y-2 pt-2">
              {isDirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                  {t("profilePage.unsavedChanges", "You have unsaved changes")}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary border-0 touch-target"
                disabled={saving || !isDirty}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("profilePage.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("profilePage.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Mobile sticky save bar */}
      <MobileStickyFormBar
        isDirty={isDirty}
        isSaving={saving}
        onSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
      />
    </div>
  );
};

export default ProfilePage;
