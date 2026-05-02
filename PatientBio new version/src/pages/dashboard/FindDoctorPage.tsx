import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePatientFeatureEligibility } from "@/hooks/usePatientFeatureEligibility";
import { FeatureGateBlocker } from "@/components/shared/FeatureGateBlocker";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SPECIALTIES } from "@/types/hospital";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Stethoscope, BadgeCheck, Clock, Users, Building2, Briefcase, Sparkles, CalendarCheck, History, X, Lightbulb, Star, SlidersHorizontal, ChevronDown, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBookableDoctors } from "@/hooks/useBookableDoctors";
import { useSmartDoctorSearch, QUICK_FILTER_CONDITIONS, type SmartMatchInfo } from "@/hooks/useSmartDoctorSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useFindDoctorSearchHistory } from "@/hooks/useFindDoctorSearchHistory";
import { useDoctorRatings } from "@/hooks/useDoctorRatings";
import { DoctorRatingDisplay } from "@/components/appointments/DoctorRatingDisplay";
import { DISEASE_ALIASES } from "@/components/appointments/smartMatchUtils";
import { DoctorQuickViewDrawer } from "@/components/find-doctor/DoctorQuickViewDrawer";
import { FavoritesAndRecentSection } from "@/components/find-doctor/FavoritesAndRecentSection";
import { useFavoriteDoctors } from "@/hooks/useFavoriteDoctors";
import { useRecentlyViewedDoctors } from "@/hooks/useRecentlyViewedDoctors";
import { useIsMobile } from "@/hooks/use-mobile";
import { Heart } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VirtualList } from "@/components/VirtualList";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

interface DirectoryDoctor {
  user_id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  is_verified: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  bio: string | null;
  practice_type: string;
  diseases_treated: string[] | null;
  hospital_name?: string | null;
}

function getOnlineStatus(doc: DirectoryDoctor, t: (key: string) => string) {
  if (doc.is_online) {
    const lastSeen = doc.last_seen_at ? new Date(doc.last_seen_at) : null;
    if (lastSeen && Date.now() - lastSeen.getTime() < 5 * 60 * 1000) {
      return { label: t("findDoctor.online"), color: "bg-green-500", textColor: "text-green-600" };
    }
  }
  if (doc.last_seen_at) {
    const lastSeen = new Date(doc.last_seen_at);
    const diff = Date.now() - lastSeen.getTime();
    if (diff < 30 * 60 * 1000) {
      return { label: t("findDoctor.recentlyActive"), color: "bg-yellow-500", textColor: "text-yellow-600" };
    }
    return {
      label: formatDistanceToNow(lastSeen, { addSuffix: true }),
      color: "bg-muted-foreground/40",
      textColor: "text-muted-foreground",
    };
  }
  return { label: t("findDoctor.offline"), color: "bg-muted-foreground/40", textColor: "text-muted-foreground" };
}

function getDidYouMean(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];
  const suggestions: string[] = [];
  for (const alias of Object.keys(DISEASE_ALIASES)) {
    if (alias.startsWith(q) || (q.length >= 3 && alias.includes(q))) {
      const canonical = DISEASE_ALIASES[alias];
      if (!suggestions.includes(canonical)) suggestions.push(canonical);
      if (suggestions.length >= 3) break;
    }
  }
  return suggestions;
}

const FindDoctorPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const eligibility = usePatientFeatureEligibility();
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("online");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll-aware sentinel for hiding chips on scroll
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel || !isMobile) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile]);

  const { favoriteIds, isFavorite, toggleFavorite } = useFavoriteDoctors();
  const { recentIds, addViewed, removeViewed } = useRecentlyViewedDoctors();

  const debouncedSearch = useDebounce(search, 300);
  const { searches: recentSearches, addSearch, clearSearches } = useFindDoctorSearchHistory();

  const { data: bookableDoctors } = useBookableDoctors();
  const doctorsWithAvailability = useMemo(() => {
    const set = new Set<string>();
    bookableDoctors?.forEach((d) => { if (d.has_availability) set.add(d.id); });
    return set;
  }, [bookableDoctors]);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["find-doctors-directory"],
    queryFn: async (): Promise<DirectoryDoctor[]> => {
      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, avatar_url, qualification, experience_years, consultation_fee, is_verified, is_online, last_seen_at, bio, practice_type, diseases_treated")
        .order("is_online", { ascending: false })
        .order("last_seen_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const userIds = (data || []).map((d: any) => d.user_id);
      let hospitalMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: staffData } = await supabase
          .from("hospital_staff")
          .select("user_id, hospitals!inner(name)")
          .in("user_id", userIds)
          .eq("is_active", true)
          .eq("role", "doctor");

        if (staffData) {
          for (const s of staffData) {
            const h = s.hospitals as unknown as { name: string };
            if (h?.name) hospitalMap[s.user_id] = h.name;
          }
        }
      }

      return (data || []).map((d: any) => ({
        ...d,
        hospital_name: hospitalMap[d.user_id] || null,
      }));
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const allDoctorIds = useMemo(() => doctors.map(d => d.user_id), [doctors]);
  const { data: ratingsMap } = useDoctorRatings(allDoctorIds);

  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of doctors) {
      if (d.specialty) {
        counts[d.specialty] = (counts[d.specialty] || 0) + 1;
      }
    }
    return counts;
  }, [doctors]);

  const practiceTypeCounts = useMemo(() => {
    let privateCount = 0;
    let hospitalCount = 0;
    for (const d of doctors) {
      if (d.practice_type === "private" || d.practice_type === "both") privateCount++;
      if (d.practice_type === "hospital" || d.practice_type === "both") hospitalCount++;
    }
    return { private: privateCount, hospital: hospitalCount };
  }, [doctors]);

  const preFiltered = useMemo(() => {
    let result = doctors;
    if (specialtyFilter !== "all") {
      result = result.filter((d) => d.specialty === specialtyFilter);
    }
    if (practiceFilter !== "all") {
      result = result.filter((d) => d.practice_type === practiceFilter || d.practice_type === "both");
    }
    return result;
  }, [doctors, specialtyFilter, practiceFilter]);

  const { results: smartResults, hasSmartMatches } = useSmartDoctorSearch(debouncedSearch, preFiltered, doctorsWithAvailability);

  const [prevDebounced, setPrevDebounced] = useState("");
  if (debouncedSearch !== prevDebounced) {
    setPrevDebounced(debouncedSearch);
    if (debouncedSearch.trim().length >= 2) {
      addSearch(debouncedSearch);
    }
  }

  const filtered = useMemo(() => {
    let list = availableOnly
      ? smartResults.filter((d) => doctorsWithAvailability.has(d.user_id))
      : smartResults;

    if (debouncedSearch.trim() && hasSmartMatches) {
      return list;
    }
    return [...list].sort((a, b) => {
      if (sortBy === "experience") {
        return (b.experience_years || 0) - (a.experience_years || 0);
      }
      if (sortBy === "rating") {
        const aRating = ratingsMap?.[a.user_id];
        const bRating = ratingsMap?.[b.user_id];
        const aVal = (aRating && aRating.total_reviews >= 3) ? (aRating.avg_rating || 0) : 0;
        const bVal = (bRating && bRating.total_reviews >= 3) ? (bRating.avg_rating || 0) : 0;
        if (bVal !== aVal) return bVal - aVal;
        return (bRating?.total_reviews || 0) - (aRating?.total_reviews || 0);
      }
      const aAvail = doctorsWithAvailability.has(a.user_id) ? 0 : 1;
      const bAvail = doctorsWithAvailability.has(b.user_id) ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;
      const aStatus = a.is_online ? 0 : a.last_seen_at ? 1 : 2;
      const bStatus = b.is_online ? 0 : b.last_seen_at ? 1 : 2;
      if (aStatus !== bStatus) return aStatus - bStatus;
      if ((b.experience_years || 0) !== (a.experience_years || 0))
        return (b.experience_years || 0) - (a.experience_years || 0);
      return a.full_name.localeCompare(b.full_name);
    });
  }, [smartResults, debouncedSearch, hasSmartMatches, sortBy, availableOnly, doctorsWithAvailability, ratingsMap]);

  const didYouMean = useMemo(() => {
    if (filtered.length > 0 || !debouncedSearch.trim()) return [];
    return getDidYouMean(debouncedSearch);
  }, [filtered.length, debouncedSearch]);

  const hasActiveFilters = specialtyFilter !== "all" || practiceFilter !== "all" || availableOnly;
  const activeFilterCount = (specialtyFilter !== "all" ? 1 : 0) + (practiceFilter !== "all" ? 1 : 0) + (availableOnly ? 1 : 0);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["find-doctors-directory"] });
  }, [queryClient]);

  // Whether to show search-matched disease tags on mobile
  const hasSearchQuery = !!debouncedSearch.trim();

  if (eligibility.isLoading) return <PageSkeleton />;
  if (!eligibility.isEligible) return <FeatureGateBlocker eligibility={eligibility} feature="find-doctor" />;

  // Render a single doctor card (used by VirtualList on mobile, direct map on desktop)
  const renderDoctorCard = (doc: DirectoryDoctor & { matchInfo?: SmartMatchInfo }, index: number) => {
    const status = getOnlineStatus(doc, t);
    const initials = doc.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const diseases = doc.diseases_treated || [];
    const matchInfo = doc.matchInfo as SmartMatchInfo | undefined;
    const matchedDiseaseNames = new Set(
      matchInfo?.matchedDiseases?.map((d) => d.name) || []
    );

    const sortedDiseases = [...diseases].sort((a, b) => {
      const aMatched = matchedDiseaseNames.has(a) ? 0 : 1;
      const bMatched = matchedDiseaseNames.has(b) ? 0 : 1;
      return aMatched - bMatched;
    });

    // On mobile: only show disease tags when there's a search query
    const showDiseaseTags = isMobile ? hasSearchQuery : true;
    const visibleDiseases = showDiseaseTags ? sortedDiseases.slice(0, isMobile ? 3 : 4) : [];
    const extraCount = showDiseaseTags ? diseases.length - visibleDiseases.length : 0;

    const hasAvailability = doctorsWithAvailability.has(doc.user_id);

    return (
      <Card
        key={doc.user_id}
        className={`cursor-pointer relative press-feedback ${
          isMobile
            ? "border-0 shadow-none border-b border-border rounded-none"
            : "hover:shadow-md transition-shadow"
        }`}
        onClick={() => {
          addViewed(doc.user_id);
          setSelectedDoctorId(doc.user_id);
        }}
      >
        {/* Favorite heart button — absolute on desktop only */}
        {!isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(doc.user_id);
            }}
            className="absolute z-10 rounded-full hover:bg-muted transition-colors top-3 right-3 p-1"
            aria-label={isFavorite(doc.user_id) ? t("findDoctor.removeFromFavorites") : t("findDoctor.addToFavorites")}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite(doc.user_id)
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-400"
              }`}
            />
          </button>
        )}
        <CardContent className="px-3 py-2.5 sm:p-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="relative shrink-0">
              <Avatar className="h-14 w-14 sm:h-14 sm:w-14">
                <AvatarImage src={doc.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-background ${status.color}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{doc.full_name}</span>
                {doc.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                )}
                {/* Mobile: heart + calendar icons side by side */}
                {isMobile && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(doc.user_id);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors press-feedback"
                      aria-label={isFavorite(doc.user_id) ? t("findDoctor.removeFromFavorites") : t("findDoctor.addToFavorites")}
                    >
                      <Heart
                        className={`h-4 w-4 transition-colors ${
                          isFavorite(doc.user_id)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground hover:text-red-400"
                        }`}
                      />
                    </button>
                    {hasAvailability && (
                      <Link
                        to={`/dashboard/appointments?doctor=${doc.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors press-feedback"
                        aria-label={t("findDoctor.bookAppointment")}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <p className={`text-[11px] sm:text-xs ${status.textColor}`}>{status.label}</p>

              {/* On mobile, show specialty + fee + rating inline */}
              {isMobile ? (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {doc.specialty && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-[18px] font-normal ${
                        matchInfo?.matchedSpecialty
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      {doc.specialty}
                      {matchInfo?.matchedSpecialty && <Sparkles className="h-2.5 w-2.5 ml-0.5" />}
                    </Badge>
                  )}
                  {doc.consultation_fee != null && (
                    <span className="text-[11px] font-medium text-foreground">৳{doc.consultation_fee}</span>
                  )}
                  {doc.experience_years != null && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {t("findDoctor.yrsExp", { count: doc.experience_years })}
                    </span>
                  )}
                  {/* Rating inline on mobile */}
                  <DoctorRatingDisplay stats={ratingsMap?.[doc.user_id]} size="sm" showBadge={false} />
                </div>
              ) : (
                <>
                  {doc.specialty && (
                    <Badge
                      variant="secondary"
                      className={`mt-1 text-xs ${
                        matchInfo?.matchedSpecialty ? "border-primary/40 bg-primary/10 text-primary" : ""
                      }`}
                    >
                      {doc.specialty}
                      {matchInfo?.matchedSpecialty && <Sparkles className="h-3 w-3 ml-1" />}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Practice Type Badge — hidden on mobile */}
          {!isMobile && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(doc.practice_type === "private" || doc.practice_type === "both") && (
                <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950">
                  <Briefcase className="h-3 w-3" />
                  {t("findDoctor.privatePractice")}
                </Badge>
              )}
              {(doc.practice_type === "hospital" || doc.practice_type === "both") && (
                <Badge variant="outline" className="text-xs gap-1 border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950">
                  <Building2 className="h-3 w-3" />
                  {doc.hospital_name ? t("findDoctor.hospital", { name: doc.hospital_name }) : t("findDoctor.hospitalPractice")}
                </Badge>
              )}
            </div>
          )}

          {/* Rating — separate line on desktop only */}
          {!isMobile && (
            <div className="mt-1.5">
              <DoctorRatingDisplay stats={ratingsMap?.[doc.user_id]} size="sm" />
            </div>
          )}

          {/* Desktop-only: qualification, experience, fee row */}
          {!isMobile && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {doc.qualification && <span>{doc.qualification}</span>}
              {doc.experience_years != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("findDoctor.yrsExp", { count: doc.experience_years })}
                </span>
              )}
              {doc.consultation_fee != null && (
                <span className="font-medium text-foreground">৳{doc.consultation_fee}</span>
              )}
            </div>
          )}

          {/* Disease Tags — on mobile only when searching */}
          {visibleDiseases.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isMobile ? "mt-1.5" : "mt-2"}`}>
              {visibleDiseases.map((d) => {
                const diseaseMatch = matchInfo?.matchedDiseases?.find((m) => m.name === d);
                const isMatched = !!diseaseMatch;
                return (
                  <TooltipProvider key={d}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${
                              isMatched
                                ? "border-green-400 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                                : ""
                            }`}
                          >
                            {d}
                            {isMatched && diseaseMatch?.via && <span className="ml-1 opacity-70">✓</span>}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      {isMatched && diseaseMatch?.via && (
                        <TooltipContent>
                          <p className="text-xs">{t("findDoctor.matchedVia", { term: diseaseMatch.via })}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              {extraCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {t("findDoctor.moreCount", { count: extraCount })}
                </Badge>
              )}
            </div>
          )}

          {/* Book button — full width on desktop, hidden on mobile (replaced by icon above) */}
          {!isMobile && (
            <div className="mt-3">
              {hasAvailability ? (
                <Button
                  asChild
                  size="sm"
                  className="w-full"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Link to={`/dashboard/appointments?doctor=${doc.user_id}`}>
                    {t("findDoctor.bookAppointment")}
                  </Link>
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full block">
                        <Button size="sm" className="w-full" variant="outline" disabled>
                          {t("findDoctor.bookAppointment")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("findDoctor.noSlotsAvailable")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const mainContent = (
    <div className="space-y-3 sm:space-y-6">
      {/* Scroll sentinel — used to detect if user has scrolled past the top */}
      {isMobile && <div ref={scrollSentinelRef} className="h-0" />}

      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg">
          <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight">{t("findDoctor.title")}</h1>
          <p className="text-[11px] sm:text-sm text-muted-foreground truncate">
            {t("findDoctor.subtitle")}
          </p>
        </div>
      </div>

      {/* Search — sticky on mobile */}
      <div className={`flex flex-col gap-2.5 sm:gap-3 ${isMobile ? "sticky top-0 z-20 bg-background pb-2 -mx-2.5 px-2.5 pt-1 border-b border-border/50" : ""}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("findDoctor.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 sm:h-9 text-base sm:text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick-filter condition chips — hide on mobile when scrolled down */}
        {!(isMobile && isScrolled) && (
          <div className={`${isMobile ? "flex overflow-x-auto gap-1.5 pb-0.5 -mx-1 px-1 scrollbar-hide" : "flex flex-wrap gap-1.5"}`}>
            {QUICK_FILTER_CONDITIONS.map((condition) => (
              <Button
                key={condition}
                variant={search === condition ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 shrink-0 press-feedback"
                onClick={() => setSearch(search === condition ? "" : condition)}
              >
                {condition}
              </Button>
            ))}
          </div>
        )}

        {/* Recent searches (shown when input is empty) */}
        {!search && recentSearches.length > 0 && (
          <div className={`${isMobile ? "flex overflow-x-auto gap-1.5 scrollbar-hide" : "flex items-center gap-2 flex-wrap"}`}>
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <History className="h-3 w-3" />
              {t("findDoctor.recentSearches")}
            </span>
            {recentSearches.map((term) => (
              <Button
                key={term}
                variant="outline"
                size="sm"
                className="h-6 text-xs rounded-full px-2.5 shrink-0"
                onClick={() => setSearch(term)}
              >
                {term}
              </Button>
            ))}
            <button
              onClick={clearSearches}
              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
            >
              {t("findDoctor.clearSearches")}
            </button>
          </div>
        )}
      </div>

      {/* Filters — collapsible on mobile, inline on desktop */}
      {isMobile ? (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between h-9 text-xs">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("common.filter")}
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px]">{activeFilterCount}</Badge>
                )}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder={t("findDoctor.allSpecialties")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("findDoctor.allSpecialties")} ({doctors.length})</SelectItem>
                {SPECIALTIES.map((s) => (
                  <SelectItem key={s} value={s}>{s} ({specialtyCounts[s] || 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={practiceFilter} onValueChange={setPracticeFilter}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder={t("findDoctor.allPracticeTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("findDoctor.allPracticeTypes")}</SelectItem>
                  <SelectItem value="private">{t("findDoctor.privatePractice")} ({practiceTypeCounts.private})</SelectItem>
                  <SelectItem value="hospital">{t("findDoctor.hospitalPractice")} ({practiceTypeCounts.hospital})</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 h-9 text-xs">
                  <SelectValue placeholder={t("findDoctor.sortOnlineFirst")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">{t("findDoctor.sortOnlineFirst")}</SelectItem>
                  <SelectItem value="experience">{t("findDoctor.sortMostExperienced")}</SelectItem>
                  <SelectItem value="rating">{t("findDoctor.sortTopRated")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Switch id="available-only" checked={availableOnly} onCheckedChange={setAvailableOnly} />
              <Label htmlFor="available-only" className="text-xs cursor-pointer flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                {t("findDoctor.availableOnly")}
              </Label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("findDoctor.allSpecialties")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("findDoctor.allSpecialties")} ({doctors.length})</SelectItem>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>{s} ({specialtyCounts[s] || 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={practiceFilter} onValueChange={setPracticeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t("findDoctor.allPracticeTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("findDoctor.allPracticeTypes")} ({doctors.length})</SelectItem>
              <SelectItem value="private">{t("findDoctor.privatePractice")} ({practiceTypeCounts.private})</SelectItem>
              <SelectItem value="hospital">{t("findDoctor.hospitalPractice")} ({practiceTypeCounts.hospital})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t("findDoctor.sortOnlineFirst")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">{t("findDoctor.sortOnlineFirst")}</SelectItem>
              <SelectItem value="experience">{t("findDoctor.sortMostExperienced")}</SelectItem>
              <SelectItem value="rating">{t("findDoctor.sortTopRated")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="available-only" checked={availableOnly} onCheckedChange={setAvailableOnly} />
            <Label htmlFor="available-only" className="text-sm cursor-pointer flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" />
              {t("findDoctor.availableOnly")}
            </Label>
          </div>
        </div>
      )}

      {/* Favorites & Recently Viewed — hidden when searching */}
      {!hasSearchQuery && (
        <FavoritesAndRecentSection
          doctors={doctors}
          favoriteIds={favoriteIds}
          recentIds={recentIds}
          onSelectDoctor={(id) => {
            addViewed(id);
            setSelectedDoctorId(id);
          }}
          onToggleFavorite={toggleFavorite}
          onRemoveRecent={removeViewed}
        />
      )}

      {/* Results count + smart match indicator */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>{t("findDoctor.doctorsFound", { count: filtered.length })}</span>
        {debouncedSearch.trim() && hasSmartMatches && (
          <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs">
            <Sparkles className="h-3 w-3" />
            {t("findDoctor.smartMatched")}
          </Badge>
        )}
      </div>

      {/* Doctor Cards */}
      {isLoading ? (
        <div className="grid gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className={isMobile ? "border-0 shadow-none border-b border-border rounded-none" : ""}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 sm:h-12 sm:w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className={isMobile ? "border-0 shadow-none" : ""}>
          <CardContent className="p-6 sm:p-8 text-center">
            <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-sm sm:text-base">{t("findDoctor.noDoctorsFound")}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {debouncedSearch.trim()
                ? t("findDoctor.noResultsFor", { query: debouncedSearch })
                : t("findDoctor.adjustFilters")}
            </p>

            {didYouMean.length > 0 && (
              <div className="mb-4 flex flex-col items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  {t("findDoctor.didYouMean")}
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {didYouMean.map((suggestion) => (
                    <Button key={suggestion} variant="outline" size="sm" className="h-8 sm:h-7 text-xs rounded-full min-w-[44px]" onClick={() => setSearch(suggestion)}>
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">{t("findDoctor.activeFiltersLimiting")}</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {specialtyFilter !== "all" && (
                    <Button variant="outline" size="sm" className="h-8 sm:h-7 text-xs" onClick={() => setSpecialtyFilter("all")}>
                      {t("findDoctor.removeSpecialtyFilter")}
                      <X className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  {practiceFilter !== "all" && (
                    <Button variant="outline" size="sm" className="h-8 sm:h-7 text-xs" onClick={() => setPracticeFilter("all")}>
                      {t("findDoctor.removePracticeFilter")}
                      <X className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                  {availableOnly && (
                    <Button variant="outline" size="sm" className="h-8 sm:h-7 text-xs" onClick={() => setAvailableOnly(false)}>
                      {t("findDoctor.showAllDoctors")}
                      <X className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!hasActiveFilters && debouncedSearch.trim() && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">{t("findDoctor.tryCondition")}</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_FILTER_CONDITIONS.map((c) => (
                    <Button key={c} variant="outline" size="sm" className="h-8 sm:h-7 text-xs rounded-full" onClick={() => setSearch(c)}>
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* Virtualized list on mobile */
        <VirtualList
          items={filtered}
          batchSize={15}
          renderItem={renderDoctorCard}
        />
      ) : (
        /* Grid on desktop */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc, index) => renderDoctorCard(doc, index))}
        </div>
      )}

      {/* Quick View Drawer */}
      <DoctorQuickViewDrawer
        doctorId={selectedDoctorId}
        open={!!selectedDoctorId}
        onOpenChange={(open) => { if (!open) setSelectedDoctorId(null); }}
        ratingStats={selectedDoctorId ? ratingsMap?.[selectedDoctorId] : undefined}
        searchQuery={debouncedSearch}
        isFavorite={selectedDoctorId ? isFavorite(selectedDoctorId) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );

  // Wrap in PullToRefresh on mobile
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {mainContent}
      </PullToRefresh>
    );
  }

  return mainContent;
};

export default FindDoctorPage;
