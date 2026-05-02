import { useState } from "react";
import { useSearchPathologists, type PathologistSearchResult } from "@/hooks/useSearchPathologists";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Microscope, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PathologistDirectoryPickerProps {
  selectedId: string;
  onSelect: (pathologist: PathologistSearchResult) => void;
}

export function PathologistDirectoryPicker({ selectedId, onSelect }: PathologistDirectoryPickerProps) {
  const [search, setSearch] = useState("");
  const { data: pathologists = [], isLoading } = useSearchPathologists(search);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, lab, specialization, or location..."
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[200px] rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pathologists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
            <Microscope className="h-8 w-8 mb-2" />
            <p className="text-sm">
              {search.length >= 2 ? "No verified pathologists found" : "Search or browse verified pathologists"}
            </p>
          </div>
        ) : (
          <div className="p-1 space-y-1">
            {pathologists.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => onSelect(p)}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-colors",
                  selectedId === p.user_id
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-muted/60"
                )}
              >
                <Avatar className="h-9 w-9 mt-0.5 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {p.full_name?.[0]?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">{p.full_name}</span>
                    {selectedId === p.user_id && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {p.lab_name && (
                    <p className="text-xs text-muted-foreground truncate">{p.lab_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.specialization_area && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {p.specialization_area}
                      </Badge>
                    )}
                    {p.lab_address && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {p.lab_address}
                      </span>
                    )}
                    {p.total_experience != null && (
                      <span className="text-[10px] text-muted-foreground">
                        {p.total_experience}y exp
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
