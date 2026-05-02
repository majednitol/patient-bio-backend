import { Badge } from "@/components/ui/badge";
import { useFavoriteMedications, FavoriteMedication } from "@/hooks/useFavoriteMedications";
import { Pin, Pill } from "lucide-react";

interface FrequentMedsBarProps {
  onSelect: (med: FavoriteMedication) => void;
}

export function FrequentMedsBar({ onSelect }: FrequentMedsBarProps) {
  const { favorites, isLoading } = useFavoriteMedications();

  if (isLoading || favorites.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Pill className="h-3 w-3" />
        Frequent Medications — tap to add
      </p>
      <div className="flex flex-wrap gap-1.5">
        {favorites.slice(0, 10).map((med) => (
          <Badge
            key={med.id}
            variant="outline"
            className="cursor-pointer text-xs px-2.5 py-1 hover:bg-accent transition-colors"
            onClick={() => onSelect(med)}
          >
            {med.is_pinned && <Pin className="h-2.5 w-2.5 mr-1" />}
            {med.medication_name}
            <span className="ml-1 text-muted-foreground">({med.usage_count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
}
