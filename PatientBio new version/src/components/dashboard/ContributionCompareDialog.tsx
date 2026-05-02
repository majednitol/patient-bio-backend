import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import type { ContributionWithBlockchain } from "@/hooks/useAnonymousContributions";

interface ContributionCompareDialogProps {
  contributions: ContributionWithBlockchain[];
}

export const ContributionCompareDialog = ({ contributions }: ContributionCompareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  if (contributions.length < 2) return null;

  const left = contributions.find(c => c.id === leftId);
  const right = contributions.find(c => c.id === rightId);

  const categoriesAdded = right && left
    ? right.data_categories.filter(c => !left.data_categories.includes(c))
    : [];
  const categoriesRemoved = right && left
    ? left.data_categories.filter(c => !right.data_categories.includes(c))
    : [];
  const diseasesAdded = right && left
    ? right.disease_categories.filter(c => !left.disease_categories.includes(c))
    : [];
  const diseasesRemoved = right && left
    ? left.disease_categories.filter(c => !right.disease_categories.includes(c))
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Compare
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Compare Contributions
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Older Contribution</label>
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {contributions.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {format(new Date(c.contributed_at), 'dd MMM yyyy')} ({c.data_categories.length} cat)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Newer Contribution</label>
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {contributions.filter(c => c.id !== leftId).map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {format(new Date(c.contributed_at), 'dd MMM yyyy')} ({c.data_categories.length} cat)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {left && right && (
          <div className="space-y-4 mt-4">
            {/* Category diff */}
            <div>
              <h4 className="text-sm font-medium mb-2">Data Categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {categoriesAdded.map(c => (
                  <Badge key={c} variant="outline" className="text-xs text-accent border-accent/40 gap-1">
                    <Plus className="h-2.5 w-2.5" /> {c}
                  </Badge>
                ))}
                {categoriesRemoved.map(c => (
                  <Badge key={c} variant="outline" className="text-xs text-destructive border-destructive/40 gap-1">
                    <Minus className="h-2.5 w-2.5" /> {c}
                  </Badge>
                ))}
                {categoriesAdded.length === 0 && categoriesRemoved.length === 0 && (
                  <span className="text-xs text-muted-foreground">No changes</span>
                )}
              </div>
            </div>

            {/* Disease diff */}
            <div>
              <h4 className="text-sm font-medium mb-2">Disease Categories</h4>
              <div className="flex flex-wrap gap-1.5">
                {diseasesAdded.map(c => (
                  <Badge key={c} variant="outline" className="text-xs text-accent border-accent/40 gap-1">
                    <Plus className="h-2.5 w-2.5" /> {c}
                  </Badge>
                ))}
                {diseasesRemoved.map(c => (
                  <Badge key={c} variant="outline" className="text-xs text-destructive border-destructive/40 gap-1">
                    <Minus className="h-2.5 w-2.5" /> {c}
                  </Badge>
                ))}
                {diseasesAdded.length === 0 && diseasesRemoved.length === 0 && (
                  <span className="text-xs text-muted-foreground">No changes</span>
                )}
              </div>
            </div>

            {/* Summary comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-[10px] text-muted-foreground mb-1">Older</p>
                <p className="text-xs">{left.data_categories.length} categories • {left.disease_categories.length} diseases</p>
                <p className="text-[10px] text-muted-foreground mt-1">{left.age_range} • {left.gender}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(left.contributed_at), 'PPp')}</p>
              </div>
              <div className="p-3 rounded-lg border bg-primary/5">
                <p className="text-[10px] text-muted-foreground mb-1">Newer</p>
                <p className="text-xs">{right.data_categories.length} categories • {right.disease_categories.length} diseases</p>
                <p className="text-[10px] text-muted-foreground mt-1">{right.age_range} • {right.gender}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(right.contributed_at), 'PPp')}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
