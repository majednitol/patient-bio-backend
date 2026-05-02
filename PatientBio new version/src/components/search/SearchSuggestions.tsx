import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

const suggestions = [
  "appointments",
  "prescriptions",
  "doctors",
  "lab reports",
  "health records",
];

interface SearchSuggestionsProps {
  onSuggestionClick: (term: string) => void;
}

export function SearchSuggestions({ onSuggestionClick }: SearchSuggestionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-4 text-center">
      <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 mb-2 sm:mb-3" />
      <p className="text-sm text-muted-foreground mb-3 sm:mb-4">
        {t("searchDialog.trySuggestions", "Try searching for...")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestionClick(s)}
            className="px-4 py-2 text-sm sm:px-3 sm:py-1.5 sm:text-xs rounded-full border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
