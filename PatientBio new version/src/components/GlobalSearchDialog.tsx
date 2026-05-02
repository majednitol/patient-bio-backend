import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { SearchSkeletons } from "@/components/search/SearchSkeletons";
import { SearchSuggestions } from "@/components/search/SearchSuggestions";
import { SearchFooter } from "@/components/search/SearchFooter";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  FileText,
  Pill,
  User,
  Stethoscope,
  Building2,
  Microscope,
  Search,
  Clock,
  X,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  calendar: <Calendar className="h-4 w-4 text-muted-foreground" />,
  "file-text": <FileText className="h-4 w-4 text-muted-foreground" />,
  pill: <Pill className="h-4 w-4 text-muted-foreground" />,
  user: <User className="h-4 w-4 text-muted-foreground" />,
  stethoscope: <Stethoscope className="h-4 w-4 text-muted-foreground" />,
  "building-2": <Building2 className="h-4 w-4 text-muted-foreground" />,
  microscope: <Microscope className="h-4 w-4 text-muted-foreground" />,
};

const typeBadgeColors: Record<string, string> = {
  patient: "bg-primary/10 text-primary border-primary/20",
  appointment: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  record: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  prescription: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  report: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  doctor: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  hospital: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

export default function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { data: results = [], isLoading, isFetching } = useGlobalSearch(query);
  const { searches: recentSearches, addSearch, clearSearches } = useRecentSearches();

  const typeLabels: Record<string, string> = {
    patient: t("searchDialog.patients"),
    appointment: t("searchDialog.appointments"),
    record: t("searchDialog.healthRecords"),
    prescription: t("searchDialog.prescriptions"),
    report: t("searchDialog.labReports"),
    doctor: t("searchDialog.doctors"),
    hospital: t("searchDialog.hospitals"),
  };

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Escape clears query first, then closes
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && query.trim().length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setQuery("");
      }
    };
    document.addEventListener("keydown", handleEsc, true);
    return () => document.removeEventListener("keydown", handleEsc, true);
  }, [open, query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addSearch(query);
      setOpen(false);
      setQuery("");
      if (result.url && result.url !== "#" && !result.url.startsWith("#patient-")) {
        navigate(result.url);
      }
    },
    [navigate, query, addSearch],
  );

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleActionClick = useCallback(
    (e: React.MouseEvent, url: string) => {
      e.stopPropagation();
      addSearch(query);
      setOpen(false);
      setQuery("");
      navigate(url);
    },
    [navigate, query, addSearch],
  );

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const showRecentSearches = query.trim().length < 2 && recentSearches.length > 0;
  const showLoading = (isLoading || isFetching) && query.trim().length >= 2 && results.length === 0;

  return (
    <>
      {/* Desktop trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border rounded-lg hover:bg-muted transition-colors min-w-[200px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex sm:hidden items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted transition-colors"
        aria-label={t("common.search")}
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} hideCloseButton={isMobile}>
        {/* Search input with back button (mobile) and clear button */}
        <div className="relative flex items-center">
          {isMobile && (
            <button
              onClick={() => { setOpen(false); setQuery(""); }}
              className="flex items-center justify-center h-12 w-12 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close search"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 relative">
            <CommandInput
              placeholder={t("searchDialog.searchPlaceholder")}
              value={query}
              onValueChange={setQuery}
            />
            {query.length > 0 && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        {query.trim().length >= 2 && results.length > 0 && (
          <div className="px-3 py-1.5 text-xs sm:text-xs text-sm text-muted-foreground border-b">
            {results.length} {results.length === 1 ? t("searchDialog.result", "result") : t("searchDialog.results", "results")}
          </div>
        )}

        <CommandList className="max-h-[calc(100dvh-120px)] sm:max-h-[400px]">

          {/* Recent searches */}
          {showRecentSearches && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>{t("searchDialog.recentSearches")}</span>
                  <button
                    onClick={clearSearches}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    {t("searchDialog.clear")}
                  </button>
                </div>
              }
            >
              {recentSearches.map((term) => (
                <CommandItem
                  key={term}
                  value={term}
                  onSelect={() => handleRecentClick(term)}
                  className="flex items-center gap-3 py-3 sm:py-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {query.trim().length >= 1 && query.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("searchDialog.typeAtLeast2")}
            </div>
          )}

          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <CommandEmpty>{t("searchDialog.noResults", { query })}</CommandEmpty>
          )}

          {/* Loading skeletons */}
          {showLoading && <SearchSkeletons />}

          {Object.entries(grouped).map(([type, items], idx) => (
            <div key={type}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={typeLabels[type] || type}>
                {items.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 py-3 sm:py-2.5 group"
                  >
                    {iconMap[result.icon] || <FileText className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <HighlightMatch text={result.title} query={query.trim()} />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <HighlightMatch text={result.subtitle} query={query.trim()} />
                      </p>
                    </div>
                    {/* Quick actions — always visible on mobile, hover on desktop */}
                    {result.actions && result.actions.length > 0 && (
                      <div className="flex sm:opacity-0 sm:group-hover:opacity-100 items-center gap-1 shrink-0 transition-opacity">
                        {result.actions.map((action) => (
                          <button
                            key={action.label}
                            onClick={(e) => handleActionClick(e, action.url)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs sm:px-2 sm:py-0.5 sm:text-[10px] font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 shrink-0 ${typeBadgeColors[result.type] || ""}`}
                    >
                      {type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>

        {/* Keyboard hints footer — hidden on mobile */}
        <div className="hidden sm:block">
          <SearchFooter />
        </div>
      </CommandDialog>
    </>
  );
}
