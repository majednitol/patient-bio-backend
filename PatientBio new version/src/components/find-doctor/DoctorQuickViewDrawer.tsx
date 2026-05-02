import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BadgeCheck, Clock, Briefcase, Building2, Star, Globe,
  CalendarDays, MessageSquare, ArrowRight, Heart,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDoctorQuickProfile, groupAvailability } from "@/hooks/useDoctorQuickProfile";
import { DoctorRatingDisplay } from "@/components/appointments/DoctorRatingDisplay";
import type { DoctorRatingStats } from "@/hooks/useDoctorRatings";

interface DoctorQuickViewDrawerProps {
  doctorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ratingStats?: DoctorRatingStats;
  searchQuery?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (doctorId: string) => void;
}

export function DoctorQuickViewDrawer({
  doctorId,
  open,
  onOpenChange,
  ratingStats,
  searchQuery,
  isFavorite = false,
  onToggleFavorite,
}: DoctorQuickViewDrawerProps) {
  const isMobile = useIsMobile();
  const { profileQuery, reviewsQuery } = useDoctorQuickProfile(open ? doctorId : null);

  const profile = profileQuery.data?.profile;
  const availability = profileQuery.data?.availability || [];
  const hospitalName = profileQuery.data?.hospitalName;
  const reviews = reviewsQuery.data || [];
  const isLoading = profileQuery.isLoading;

  const availabilityDisplay = groupAvailability(availability);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "DR";

  const searchTerms = searchQuery?.toLowerCase().split(/\s+/).filter(Boolean) || [];

  const content = isLoading ? (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  ) : !profile ? (
    <div className="p-6 text-center text-muted-foreground">Doctor not found</div>
  ) : (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback>
            </Avatar>
            {profile.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background bg-green-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base truncate">{profile.full_name}</h3>
              {profile.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
              {onToggleFavorite && doctorId && (
                  <button
                  onClick={() => onToggleFavorite(doctorId)}
                  className="p-2 rounded-full hover:bg-muted transition-colors shrink-0"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground hover:text-red-400"
                    }`}
                  />
                </button>
              )}
            </div>
            {profile.specialty && (
              <Badge variant="secondary" className="mt-0.5 text-xs">{profile.specialty}</Badge>
            )}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {profile.qualification && <span>{profile.qualification}</span>}
              {profile.experience_years != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {profile.experience_years} yrs
                </span>
              )}
            </div>
            {profile.consultation_fee != null && (
              <p className="mt-1 text-sm font-medium">৳{profile.consultation_fee}</p>
            )}
            <div className="mt-1">
              <DoctorRatingDisplay stats={ratingStats} size="sm" />
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-1">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          </>
        )}

        {/* Languages & Practice Type */}
        <div className="flex flex-wrap gap-2">
          {(profile.languages_spoken as string[] | null)?.length ? (
            <Badge variant="outline" className="text-xs gap-1">
              <Globe className="h-3 w-3" />
              {(profile.languages_spoken as string[]).join(", ")}
            </Badge>
          ) : null}
          {(profile.practice_type === "private" || profile.practice_type === "both") && (
            <Badge variant="outline" className="text-xs gap-1">
              <Briefcase className="h-3 w-3" />
              Private
            </Badge>
          )}
          {(profile.practice_type === "hospital" || profile.practice_type === "both") && (
            <Badge variant="outline" className="text-xs gap-1">
              <Building2 className="h-3 w-3" />
              {hospitalName || "Hospital"}
            </Badge>
          )}
        </div>

        {/* Diseases Treated */}
        {(profile.diseases_treated as string[] | null)?.length ? (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-1.5">Diseases Treated</h4>
              <div className="flex flex-wrap gap-1">
                {(profile.diseases_treated as string[]).map((d) => {
                  const isHighlighted = searchTerms.some((t) => d.toLowerCase().includes(t));
                  return (
                    <Badge
                      key={d}
                      variant="secondary"
                      className={`text-[11px] ${
                        isHighlighted
                          ? "border-green-400 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                          : ""
                      }`}
                    >
                      {d}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        {/* Availability */}
        {availabilityDisplay.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Weekly Availability
              </h4>
              <div className="space-y-0.5">
                {availabilityDisplay.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{line}</p>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Recent Reviews
              </h4>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.patient_name}</span>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{review.comment}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="border-t bg-background p-3 flex gap-2">
        <Button asChild variant="outline" className={`flex-1 ${isMobile ? "h-11" : ""}`} size="sm">
          <Link to={`/dashboard/doctor/${doctorId}`} onClick={() => onOpenChange(false)}>
            View Full Profile
          </Link>
        </Button>
        <Button asChild className={`flex-1 ${isMobile ? "h-11" : ""}`} size="sm">
          <Link to={`/dashboard/appointments?doctor=${doctorId}`} onClick={() => onOpenChange(false)}>
            Book Appointment
          </Link>
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="px-4 pt-2 pb-0">
            <DrawerTitle className="sr-only">Doctor Profile</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px] sm:max-w-[450px] p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Doctor Profile</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
