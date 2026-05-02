import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";

interface PoolEntry {
  id: string;
  contribution_hash: string;
  anonymized_data: Record<string, unknown>;
  data_categories: string[];
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
  govt_approval_status: string;
  contributed_at: string;
}

type SortOption = 'newest' | 'oldest' | 'most_diseases' | 'most_categories';

interface Props {
  poolData: PoolEntry[];
  isLoading: boolean;
}

export const PoolDataExplorer = ({ poolData, isLoading }: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredAndSorted = useMemo(() => {
    let result = poolData;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(entry =>
        entry.disease_categories.some(dc => dc.toLowerCase().includes(q)) ||
        entry.data_categories.some(dc => dc.toLowerCase().includes(q)) ||
        entry.source_jurisdiction.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.contributed_at).getTime() - new Date(b.contributed_at).getTime();
        case 'most_diseases': return b.disease_categories.length - a.disease_categories.length;
        case 'most_categories': return b.data_categories.length - a.data_categories.length;
        default: return new Date(b.contributed_at).getTime() - new Date(a.contributed_at).getTime();
      }
    });
  }, [poolData, debouncedSearch, sortBy]);

  const { paginatedData, currentPage, totalPages, nextPage, prevPage, hasNextPage, hasPrevPage } = usePagination({
    data: filteredAndSorted,
    itemsPerPage: 20,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data Explorer</CardTitle>
        <CardDescription>{filteredAndSorted.length} anonymized contributions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search diseases, categories, jurisdictions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Date (Newest)</SelectItem>
              <SelectItem value="oldest">Date (Oldest)</SelectItem>
              <SelectItem value="most_diseases">Most Diseases</SelectItem>
              <SelectItem value="most_categories">Most Data Categories</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>{debouncedSearch ? "No contributions match your search" : "No anonymous contributions in the pool yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedData.map(entry => (
              <div key={entry.id} className="p-3 rounded-lg border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-wrap gap-1">
                    {entry.disease_categories.map(dc => (
                      <Badge key={dc} variant="secondary" className="text-xs">{dc}</Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{entry.source_jurisdiction}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Age: {entry.age_range || '?'}</span>
                  <span>Gender: {entry.gender || '?'}</span>
                  <span>Categories: {entry.data_categories.join(', ')}</span>
                  <span className="ml-auto">{new Date(entry.contributed_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prevPage} disabled={!hasPrevPage}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasNextPage}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
