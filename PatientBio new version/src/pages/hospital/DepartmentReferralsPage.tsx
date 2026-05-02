import { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartmentReferrals, DepartmentReferral } from "@/hooks/useDepartmentReferrals";
import { useDepartments } from "@/hooks/useDepartments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowRightLeft, Plus, Clock, CheckCircle2, ArrowRight, XCircle, AlertTriangle, Loader2, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  requested: { label: "Requested", icon: Clock, className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  accepted: { label: "Accepted", icon: CheckCircle2, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  in_progress: { label: "In Progress", icon: ArrowRight, className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  routine: { label: "Routine", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  urgent: { label: "Urgent", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  emergency: { label: "Emergency", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  const Icon = config.icon;
  return (
    <Badge className={cn("gap-1 text-xs", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const config = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.routine;
  return <Badge className={cn("text-xs", config.className)}>{config.label}</Badge>;
}

// Next valid statuses for transition
function getNextStatuses(current: string): string[] {
  switch (current) {
    case "requested": return ["accepted", "cancelled"];
    case "accepted": return ["in_progress", "cancelled"];
    case "in_progress": return ["completed"];
    default: return [];
  }
}

function CreateReferralDialog({
  open,
  onOpenChange,
  hospitalId,
  departments,
  onCreate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hospitalId: string;
  departments: { id: string; name: string }[];
  onCreate: (data: any) => void;
  isPending: boolean;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    patient_id: "",
    from_department_id: "",
    to_department_id: "",
    reason: "",
    clinical_notes: "",
    urgency: "routine",
  });

  const handleSubmit = () => {
    if (!form.from_department_id || !form.to_department_id || !form.reason || !form.patient_id) return;
    onCreate({
      hospital_id: hospitalId,
      patient_id: form.patient_id,
      from_department_id: form.from_department_id,
      to_department_id: form.to_department_id,
      referred_by: user!.id,
      reason: form.reason,
      clinical_notes: form.clinical_notes || undefined,
      urgency: form.urgency,
    });
    setForm({ patient_id: "", from_department_id: "", to_department_id: "", reason: "", clinical_notes: "", urgency: "routine" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            New Department Referral
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Patient ID</Label>
            <Input
              placeholder="Enter patient UUID"
              value={form.patient_id}
              onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From Department</Label>
              <Select value={form.from_department_id} onValueChange={(v) => setForm((f) => ({ ...f, from_department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Department</Label>
              <Select value={form.to_department_id} onValueChange={(v) => setForm((f) => ({ ...f, to_department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.filter((d) => d.id !== form.from_department_id).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Urgency</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason for Referral</Label>
            <Textarea
              placeholder="Describe why the patient is being referred..."
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div>
            <Label>Clinical Notes (optional)</Label>
            <Textarea
              placeholder="Additional clinical context..."
              value={form.clinical_notes}
              onChange={(e) => setForm((f) => ({ ...f, clinical_notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.from_department_id || !form.to_department_id || !form.reason || !form.patient_id || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Create Referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateStatusDialog({
  referral,
  onClose,
  onUpdate,
  isPending,
}: {
  referral: DepartmentReferral;
  onClose: () => void;
  onUpdate: (id: string, status: string, notes?: string) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState("");
  const nextStatuses = getNextStatuses(referral.status);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Referral Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>{referral.from_department_name}</strong> → <strong>{referral.to_department_name}</strong>
          </div>
          <div className="text-sm">{referral.reason}</div>
          <div>
            <Label>Response Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." />
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className={cn("gap-1", s === "cancelled" && "text-destructive")}
                  onClick={() => onUpdate(referral.id, s, notes || undefined)}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <cfg.icon className="h-3 w-3" />}
                  {cfg.label}
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentReferralsPage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const context = useOutletContext<{ hospital: Hospital; isAdmin: boolean }>();
  const { user } = useAuth();
  const { data: referrals, isLoading, createReferral, updateStatus } = useDepartmentReferrals(hospitalId);
  const { data: departments } = useDepartments(context.hospital.id);

  const [showCreate, setShowCreate] = useState(false);
  const [updatingRef, setUpdatingRef] = useState<DepartmentReferral | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const deptList = (departments || []).map((d) => ({ id: d.id, name: d.name }));

  const filtered = (referrals || []).filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.patient_name?.toLowerCase().includes(q) ||
        r.from_department_name?.toLowerCase().includes(q) ||
        r.to_department_name?.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    requested: (referrals || []).filter((r) => r.status === "requested").length,
    accepted: (referrals || []).filter((r) => r.status === "accepted").length,
    in_progress: (referrals || []).filter((r) => r.status === "in_progress").length,
    completed: (referrals || []).filter((r) => r.status === "completed").length,
  };

  const handleUpdate = (id: string, status: string, notes?: string) => {
    updateStatus.mutate({ id, status, userId: user!.id, notes }, { onSuccess: () => setUpdatingRef(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Department Referrals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track inter-department patient handoffs in real-time
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Referral
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["requested", "accepted", "in_progress", "completed"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <Card
              key={s}
              className={cn("cursor-pointer transition-all hover:shadow-md", filter === s && "ring-2 ring-primary")}
              onClick={() => setFilter(filter === s ? "all" : s)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", cfg.className)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[s]}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient, department, or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No referrals found"
          description={filter !== "all" ? "Try changing the filter" : "Create a referral to start tracking inter-department handoffs"}
          action={{ label: "New Referral", onClick: () => setShowCreate(true), icon: Plus }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patient_name}</TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {r.from_department_name} <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" /> {r.to_department_name}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell><UrgencyBadge urgency={r.urgency} /></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      {getNextStatuses(r.status).length > 0 && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setUpdatingRef(r)}>
                          Update
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateReferralDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        hospitalId={context.hospital.id}
        departments={deptList}
        onCreate={(data) => createReferral.mutate(data)}
        isPending={createReferral.isPending}
      />
      {updatingRef && (
        <UpdateStatusDialog
          referral={updatingRef}
          onClose={() => setUpdatingRef(null)}
          onUpdate={handleUpdate}
          isPending={updateStatus.isPending}
        />
      )}
    </div>
  );
}
