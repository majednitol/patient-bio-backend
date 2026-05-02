import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { DoctorProfile, DoctorAvailability, DAYS_OF_WEEK } from "@/types/hospital";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope, BadgeCheck, Clock, CalendarDays, Users, Building2,
  Briefcase, ArrowLeft, Hash, DollarSign, UserCheck, Star, Globe,
} from "lucide-react";
import { format } from "date-fns";
import type { TFunction } from "i18next";

function formatTime12(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getOnlineStatus(profile: DoctorProfile, t: TFunction) {
  if (profile.is_online) {
    const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at) : null;
    if (lastSeen && Date.now() - lastSeen.getTime() < 5 * 60 * 1000)
      return { label: t("doctorProfile.online"), dotColor: "bg-green-500", badgeVariant: "default" as const };
  }
  if (profile.last_seen_at) {
    const diff = Date.now() - new Date(profile.last_seen_at).getTime();
    if (diff < 30 * 60 * 1000)
      return { label: t("doctorProfile.recentlyActive"), dotColor: "bg-yellow-500", badgeVariant: "secondary" as const };
  }
  return { label: t("doctorProfile.offline"), dotColor: "bg-muted-foreground/40", badgeVariant: "outline" as const };
}

/** Group consecutive days with identical time ranges */
function groupAvailability(availability: DoctorAvailability[]) {
  if (availability.length === 0) return [];

  const sorted = [...availability].sort((a, b) => a.day_of_week - b.day_of_week);
  const groups: { days: number[]; start: string; end: string }[] = [];

  for (const slot of sorted) {
    const timeKey = `${slot.start_time}-${slot.end_time}`;
    const lastGroup = groups[groups.length - 1];
    const lastTimeKey = lastGroup ? `${lastGroup.start}-${lastGroup.end}` : null;
    const lastDay = lastGroup ? lastGroup.days[lastGroup.days.length - 1] : -2;

    if (lastGroup && lastTimeKey === timeKey && (slot.day_of_week === lastDay + 1 || (lastDay === 6 && slot.day_of_week === 0))) {
      lastGroup.days.push(slot.day_of_week);
    } else {
      groups.push({ days: [slot.day_of_week], start: slot.start_time, end: slot.end_time });
    }
  }

  return groups.map((g) => {
    const dayLabel = (d: number) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label.slice(0, 3) || "";
    const daysStr = g.days.length === 1
      ? dayLabel(g.days[0])
      : `${dayLabel(g.days[0])} - ${dayLabel(g.days[g.days.length - 1])}`;
    return `${daysStr}: ${formatTime12(g.start)} - ${formatTime12(g.end)}`;
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

const DoctorPublicProfilePage = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-doctor-profile", doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("id, user_id, full_name, specialty, avatar_url, license_number, experience_years, is_verified, consultation_fee, bio, qualification, phone, is_online, last_seen_at, practice_type, diseases_treated, follow_up_fee, follow_up_window_days, languages_spoken, created_at, updated_at")
        .eq("user_id", doctorId!)
        .maybeSingle();
      if (error) throw error;
      return data as DoctorProfile | null;
    },
    enabled: !!doctorId,
  });

  const { data: hospital } = useQuery({
    queryKey: ["doctor-hospital", doctorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_staff")
        .select("hospitals!inner(name)")
        .eq("user_id", doctorId!)
        .eq("is_active", true)
        .eq("role", "doctor")
        .maybeSingle();
      if (data) {
        const h = data.hospitals as unknown as { name: string };
        return h?.name || null;
      }
      return null;
    },
    enabled: !!doctorId,
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["doctor-public-availability", doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_availability")
        .select("*")
        .eq("doctor_id", doctorId!)
        .eq("is_active", true)
        .order("day_of_week");
      if (error) throw error;
      return data as DoctorAvailability[];
    },
    enabled: !!doctorId,
  });

  const { data: patientsAttended = 0 } = useQuery({
    queryKey: ["doctor-patients-attended", doctorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctorId!)
        .eq("status", "completed");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!doctorId,
  });

  // Fetch reviews from consultation_feedback
  const { data: reviews = [] } = useQuery({
    queryKey: ["doctor-reviews", doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_feedback")
        .select("id, rating, tags, comment, is_anonymous, created_at")
        .eq("doctor_id", doctorId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!doctorId,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 space-y-4">
        <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="text-lg font-medium">{t("doctorProfile.doctorNotFound")}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/find-doctor">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("doctorProfile.backToDirectory")}
          </Link>
        </Button>
      </div>
    );
  }

  const status = getOnlineStatus(profile, t);
  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = profile.created_at
    ? format(new Date(profile.created_at), "d MMM yyyy")
    : null;

  const availabilityDisplay = groupAvailability(availability);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard/find-doctor" className="inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          {t("doctorProfile.backToDirectory")}
        </Link>
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background ${status.dotColor}`} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">{formatDoctorName(profile.full_name)}</h1>
                  {profile.is_verified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
                  <Badge variant={status.badgeVariant} className="text-xs">{status.label}</Badge>
                </div>
                {profile.qualification && (
                  <p className="text-sm text-muted-foreground">{profile.qualification}</p>
                )}
                {profile.specialty && (
                  <Badge variant="secondary" className="text-xs">{profile.specialty}</Badge>
                )}
                {hospital && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {t("doctorProfile.workingAt", { hospital })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              {profile.consultation_fee != null && (
                <div className="text-left sm:text-right">
                  <p className="text-xs text-muted-foreground">{t("doctorProfile.consultationFee")}</p>
                  <p className="text-2xl font-bold text-primary">৳{profile.consultation_fee}</p>
                  <p className="text-[10px] text-muted-foreground">{t("doctorProfile.inclVat")}</p>
                </div>
              )}
              <Button asChild className="whitespace-nowrap">
                <Link to={`/dashboard/appointments?doctor=${profile.user_id}`} className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {t("doctorProfile.bookAppointment")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {profile.experience_years != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <strong className="text-foreground">{profile.experience_years}+</strong> {t("doctorProfile.yearsExperience")}
              </span>
            )}
            {profile.license_number && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-4 w-4" />
                BMDC: <strong className="text-foreground">{profile.license_number}</strong>
              </span>
            )}
            {joinedDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {t("doctorProfile.joined")} <strong className="text-foreground">{joinedDate}</strong>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              {t("doctorProfile.rating")} <strong className="text-foreground">
                {reviews.length > 0 ? `${avgRating.toFixed(1)} (${reviews.length})` : "—"}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="info">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="info">{t("doctorProfile.info")}</TabsTrigger>
          <TabsTrigger value="experience">{t("doctorProfile.experience")}</TabsTrigger>
          <TabsTrigger value="reviews">{t("doctorProfile.reviews", { count: reviews.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("doctorProfile.about", { name: formatDoctorName(profile.full_name) })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {profile.bio || t("doctorProfile.noBio")}
                </p>
                {profile.languages_spoken && profile.languages_spoken.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> {t("doctorProfile.languages")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.languages_spoken.map((lang) => (
                        <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("doctorProfile.availability")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availabilityDisplay.length > 0 ? (
                    <div className="space-y-1.5">
                      {availabilityDisplay.map((line, i) => (
                        <p key={i} className="text-sm">{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("doctorProfile.noSchedule")}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("doctorProfile.atAGlance")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">৳{profile.consultation_fee ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("doctorProfile.consultationFee")}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">৳{profile.follow_up_fee ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("doctorProfile.followUpFee", { days: profile.follow_up_window_days })}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{patientsAttended}</p>
                      <p className="text-[10px] text-muted-foreground">{t("doctorProfile.patientsAttended")}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <UserCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{profile.is_verified ? "✓" : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("doctorProfile.verified")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Practice Type */}
              <div>
                <p className="text-sm font-medium mb-1">{t("doctorProfile.practiceType")}</p>
                <div className="flex gap-1.5">
                  {(profile.practice_type === "private" || profile.practice_type === "both") && (
                    <Badge variant="outline" className="gap-1 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950">
                      <Briefcase className="h-3 w-3" /> {t("doctorProfile.privatePractice")}
                    </Badge>
                  )}
                  {(profile.practice_type === "hospital" || profile.practice_type === "both") && (
                    <Badge variant="outline" className="gap-1 border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950">
                      <Building2 className="h-3 w-3" /> {t("doctorProfile.hospitalPractice")}
                    </Badge>
                  )}
                </div>
              </div>

              {profile.experience_years != null && (
                <div>
                  <p className="text-sm font-medium mb-1">{t("doctorProfile.yearsOfExperience")}</p>
                  <p className="text-sm text-muted-foreground">{t("doctorProfile.yearsCount", { count: profile.experience_years })}</p>
                </div>
              )}

              {profile.qualification && (
                <div>
                  <p className="text-sm font-medium mb-1">{t("doctorProfile.qualification")}</p>
                  <p className="text-sm text-muted-foreground">{profile.qualification}</p>
                </div>
              )}

              {profile.languages_spoken && profile.languages_spoken.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> {t("doctorProfile.languagesSpoken")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.languages_spoken.map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.diseases_treated && profile.diseases_treated.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t("doctorProfile.diseasesConditions")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.diseases_treated.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("doctorProfile.noReviewsYet")}</p>
                <p className="text-sm mt-1">{t("doctorProfile.beFirstReview")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Summary card */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
                      <StarRating rating={Math.round(avgRating)} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(reviews.length !== 1 ? "doctorProfile.reviewCount_plural" : "doctorProfile.reviewCount", { count: reviews.length })}
                      </p>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r) => r.rating === star).length;
                        const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-muted-foreground">{star}</span>
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-6 text-right text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual reviews */}
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d MMM yyyy")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("doctorProfile.aPatient")}
                      </span>
                    </div>
                    {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {review.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorPublicProfilePage;
