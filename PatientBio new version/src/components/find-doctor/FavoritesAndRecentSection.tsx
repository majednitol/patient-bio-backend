import { useTranslation } from "react-i18next";
import { Heart, Clock, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DoctorInfo {
  user_id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
}

interface FavoritesAndRecentSectionProps {
  doctors: DoctorInfo[];
  favoriteIds: Set<string>;
  recentIds: string[];
  onSelectDoctor: (doctorId: string) => void;
  onToggleFavorite: (doctorId: string) => void;
  onRemoveRecent: (doctorId: string) => void;
}

function DoctorChip({
  doctor,
  onSelect,
  onRemove,
  removeIcon,
}: {
  doctor: DoctorInfo;
  onSelect: () => void;
  onRemove: () => void;
  removeIcon: "heart" | "x";
}) {
  const initials = doctor.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "DR";

  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 sm:py-1.5 hover:bg-muted transition-colors shrink-0 group press-feedback min-h-[40px] sm:min-h-0"
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={doctor.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="text-left min-w-0">
        <p className="text-xs font-medium truncate max-w-[100px]">{doctor.full_name}</p>
        {doctor.specialty && (
          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{doctor.specialty}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 p-1 text-muted-foreground hover:text-destructive transition-colors"
      >
        {removeIcon === "heart" ? (
          <Heart className="h-3.5 w-3.5 sm:h-3 sm:w-3 fill-red-500 text-red-500" />
        ) : (
          <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        )}
      </button>
    </button>
  );
}

export function FavoritesAndRecentSection({
  doctors,
  favoriteIds,
  recentIds,
  onSelectDoctor,
  onToggleFavorite,
  onRemoveRecent,
}: FavoritesAndRecentSectionProps) {
  const { t } = useTranslation();
  const doctorMap = new Map(doctors.map((d) => [d.user_id, d]));

  const favoriteDoctors = Array.from(favoriteIds)
    .map((id) => doctorMap.get(id))
    .filter(Boolean) as DoctorInfo[];

  const recentDoctors = recentIds
    .filter((id) => !favoriteIds.has(id))
    .map((id) => doctorMap.get(id))
    .filter(Boolean) as DoctorInfo[];

  if (favoriteDoctors.length === 0 && recentDoctors.length === 0) return null;

  return (
    <div className="space-y-3">
      {favoriteDoctors.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
            <span className="text-xs font-medium text-muted-foreground">{t("findDoctor.favorites")}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {favoriteDoctors.length}
            </Badge>
          </div>
          <ScrollArea orientation="horizontal" className="pb-1">
            <div className="flex gap-2">
              {favoriteDoctors.map((doc) => (
                <DoctorChip
                  key={doc.user_id}
                  doctor={doc}
                  onSelect={() => onSelectDoctor(doc.user_id)}
                  onRemove={() => onToggleFavorite(doc.user_id)}
                  removeIcon="heart"
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {recentDoctors.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t("findDoctor.recentlyViewed")}</span>
          </div>
          <ScrollArea orientation="horizontal" className="pb-1">
            <div className="flex gap-2">
              {recentDoctors.map((doc) => (
                <DoctorChip
                  key={doc.user_id}
                  doctor={doc}
                  onSelect={() => onSelectDoctor(doc.user_id)}
                  onRemove={() => onRemoveRecent(doc.user_id)}
                  removeIcon="x"
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
