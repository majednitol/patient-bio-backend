import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPORTABLE_TABLES } from "@/hooks/useAdminBackup";
import type { BackupSchedule } from "@/hooks/useBackupSchedules";
import { useCreateSchedule, useUpdateSchedule } from "@/hooks/useBackupSchedules";
import { Cloud, HardDrive, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TABLE_LABELS: Record<string, string> = {
  user_profiles: "User Profiles",
  user_roles: "User Roles",
  health_records: "Health Records",
  access_tokens: "Access Tokens",
  access_logs: "Access Logs",
  prescriptions: "Prescriptions",
  appointments: "Appointments",
  doctor_profiles: "Doctor Profiles",
  pathologist_profiles: "Pathologist Profiles",
  researcher_profiles: "Researcher Profiles",
  hospitals: "Hospitals",
  hospital_staff: "Hospital Staff",
  audit_trail: "Audit Trail",
  blockchain_transactions: "Blockchain Transactions",
  consent_records: "Consent Records",
  data_access_requests: "Data Access Requests",
  doctor_patient_access: "Doctor-Patient Access",
  pathologist_reports: "Pathologist Reports",
  patient_wallets: "Patient Wallets",
};

const DESTINATION_OPTIONS = [
  { value: "local", label: "Local Storage Only", icon: HardDrive, description: "Store backups in Lovable Cloud storage" },
  { value: "cloudflare_r2", label: "Cloudflare R2", icon: Cloud, description: "Upload to Cloudflare R2 (10 GB free)" },
  { value: "both", label: "Both (Local + R2)", icon: Cloud, description: "Redundant storage in both locations" },
];

interface BackupScheduleFormProps {
  open: boolean;
  onClose: () => void;
  editSchedule?: BackupSchedule | null;
}

export function BackupScheduleForm({ open, onClose, editSchedule }: BackupScheduleFormProps) {
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  const isEditing = !!editSchedule;

  const [name, setName] = useState("");
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(EXPORTABLE_TABLES));
  const [frequency, setFrequency] = useState("daily");
  const [exportFormat, setExportFormat] = useState("json");
  const [retentionDays, setRetentionDays] = useState(30);
  const [storageDestination, setStorageDestination] = useState("local");
  const [cloudFolderId, setCloudFolderId] = useState("");

  useEffect(() => {
    if (editSchedule) {
      setName(editSchedule.name);
      setSelectedTables(new Set(editSchedule.tables));
      setFrequency(editSchedule.frequency);
      setExportFormat(editSchedule.export_format);
      setRetentionDays(editSchedule.retention_days);
      setStorageDestination(editSchedule.storage_destination ?? "local");
      setCloudFolderId(editSchedule.cloud_folder_id ?? "");
    } else {
      setName("");
      setSelectedTables(new Set(EXPORTABLE_TABLES));
      setFrequency("daily");
      setExportFormat("json");
      setRetentionDays(30);
      setStorageDestination("local");
      setCloudFolderId("");
    }
  }, [editSchedule, open]);

  const toggleTable = (table: string) => {
    const next = new Set(selectedTables);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setSelectedTables(next);
  };

  const handleSubmit = () => {
    const tables = Array.from(selectedTables);
    if (!name.trim() || tables.length === 0) return;

    const payload = {
      name,
      tables,
      frequency,
      export_format: exportFormat,
      retention_days: retentionDays,
      storage_destination: storageDestination,
      cloud_folder_id: cloudFolderId || undefined,
    };

    if (isEditing && editSchedule) {
      updateMutation.mutate(
        { id: editSchedule.id, ...payload },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Backup Schedule" : "Create Backup Schedule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Full Backup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6h">Every 6 hours</SelectItem>
                  <SelectItem value="12h">Every 12 hours</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Retention (days)</Label>
            <Select value={String(retentionDays)} onValueChange={(v) => setRetentionDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Storage Destination */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label>Storage Destination</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      <strong>Local:</strong> Stored in Lovable Cloud storage bucket.{" "}
                      <strong>R2:</strong> Uploaded to Cloudflare R2 (10 GB free, S3-compatible).{" "}
                      <strong>Both:</strong> Redundant storage for maximum safety.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={storageDestination} onValueChange={setStorageDestination}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DESTINATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tables ({selectedTables.size}/{EXPORTABLE_TABLES.length})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedTables(
                    selectedTables.size === EXPORTABLE_TABLES.length ? new Set() : new Set(EXPORTABLE_TABLES)
                  )
                }
                className="text-xs"
              >
                {selectedTables.size === EXPORTABLE_TABLES.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
              {EXPORTABLE_TABLES.map((table) => (
                <label key={table} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1">
                  <Checkbox checked={selectedTables.has(table)} onCheckedChange={() => toggleTable(table)} />
                  {TABLE_LABELS[table] ?? table}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim() || selectedTables.size === 0}>
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
