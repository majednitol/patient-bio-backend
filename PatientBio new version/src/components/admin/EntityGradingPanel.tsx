import { useState, useMemo } from "react";
import { useEntityGrading, GradableEntity } from "@/hooks/useEntityGrading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/admin/SearchInput";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Info, Loader2 } from "lucide-react";

const GRADE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  A: { label: "Grade A", color: "bg-green-500/15 text-green-700 border-green-500/30", desc: "Fully accredited (NABL/CAP/JCI), consistent high-quality data" },
  B: { label: "Grade B", color: "bg-blue-500/15 text-blue-700 border-blue-500/30", desc: "Nationally recognized, minor data quality gaps" },
  C: { label: "Grade C", color: "bg-amber-500/15 text-amber-700 border-amber-500/30", desc: "Regional certification, moderate data inconsistencies" },
  D: { label: "Grade D", color: "bg-red-500/15 text-red-700 border-red-500/30", desc: "Unaccredited or flagged for significant data quality issues" },
};

const ENTITY_LABELS: Record<string, string> = {
  doctor: "Doctor",
  pathologist: "Diagnostic Center",
  hospital: "Hospital",
};

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <Badge variant="outline" className="text-muted-foreground">Ungraded</Badge>;
  const cfg = GRADE_CONFIG[grade];
  return <Badge variant="outline" className={cfg?.color}>{cfg?.label || grade}</Badge>;
}

export function EntityGradingPanel() {
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [gradeDialog, setGradeDialog] = useState<GradableEntity | null>(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [reason, setReason] = useState("");

  const { entities, isLoading, assignGrade, isAssigning } = useEntityGrading(entityTypeFilter);

  const filtered = useMemo(() => {
    if (!search) return entities;
    const q = search.toLowerCase();
    return entities.filter(e => e.name.toLowerCase().includes(q));
  }, [entities, search]);

  const stats = useMemo(() => {
    const s = { A: 0, B: 0, C: 0, D: 0, ungraded: 0 };
    entities.forEach(e => {
      if (e.grade && s.hasOwnProperty(e.grade)) (s as any)[e.grade]++;
      else s.ungraded++;
    });
    return s;
  }, [entities]);

  const openGradeDialog = (entity: GradableEntity) => {
    setGradeDialog(entity);
    setSelectedGrade(entity.grade || "");
    setReason("");
  };

  const handleAssign = () => {
    if (!gradeDialog || !selectedGrade || !reason.trim()) return;
    assignGrade(
      { entity: gradeDialog, grade: selectedGrade, reason: reason.trim() },
      { onSuccess: () => setGradeDialog(null) }
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["A", "B", "C", "D"] as const).map(g => (
          <Card key={g}>
            <CardContent className="p-4 text-center">
              <GradeBadge grade={g} />
              <p className="text-2xl font-bold mt-1">{stats[g]}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4 text-center">
            <Badge variant="outline" className="text-muted-foreground">Ungraded</Badge>
            <p className="text-2xl font-bold mt-1">{stats.ungraded}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Criteria Info */}
      <TooltipProvider>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
                Grade Criteria Reference
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm space-y-1 text-left" side="bottom">
              {Object.entries(GRADE_CONFIG).map(([k, v]) => (
                <p key={k}><strong>{v.label}:</strong> {v.desc}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." className="flex-1" />
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="doctor">Doctors</SelectItem>
            <SelectItem value="pathologist">Diagnostic Centers</SelectItem>
            <SelectItem value="hospital">Hospitals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Grade</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={4} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No entities found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(entity => (
                <TableRow key={`${entity.entityType}-${entity.id}`}>
                  <TableCell className="font-medium">{entity.name}</TableCell>
                  <TableCell>{ENTITY_LABELS[entity.entityType]}</TableCell>
                  <TableCell><GradeBadge grade={entity.grade} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openGradeDialog(entity)}>
                      <Award className="h-4 w-4 mr-1" />
                      Assign Grade
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Grade Assignment Dialog */}
      <Dialog open={!!gradeDialog} onOpenChange={open => !open && setGradeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Grade — {gradeDialog?.name}</DialogTitle>
            <DialogDescription>
              {gradeDialog && ENTITY_LABELS[gradeDialog.entityType]}
              {gradeDialog?.grade && ` • Current: ${gradeDialog.grade}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} — {v.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Explain the reason for this grade assignment..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setGradeDialog(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAssign}
                disabled={!selectedGrade || !reason.trim() || isAssigning}
              >
                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Grade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
