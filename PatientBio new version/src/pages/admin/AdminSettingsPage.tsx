import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings, Database, Mail, Shield, Server, CheckCircle, ImageIcon,
  RefreshCw, Plus, Pencil, Trash2, ExternalLink, Globe, Clock,
  XCircle, AlertTriangle, Users, HardDrive, Link as LinkIcon,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlatformLogoUpload } from "@/components/admin/PlatformLogoUpload";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ── Health check queries ──────────────────────────────────────────────
const useHealthChecks = () => {
  const db = useQuery({
    queryKey: ["health-db"],
    queryFn: async () => {
      const start = performance.now();
      const { error } = await supabase.from("user_profiles").select("user_id", { count: "exact", head: true });
      const latency = Math.round(performance.now() - start);
      if (error) throw error;
      return { ok: true, latency };
    },
    staleTime: STALE_TIMES.REALTIME,
    retry: 1,
  });

  const storage = useQuery({
    queryKey: ["health-storage"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return { ok: true, bucketCount: data?.length ?? 0 };
    },
    staleTime: STALE_TIMES.REALTIME,
    retry: 1,
  });

  const auth = useQuery({
    queryKey: ["health-auth"],
    queryFn: async () => {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      return { ok: true };
    },
    staleTime: STALE_TIMES.REALTIME,
    retry: 1,
  });

  return { db, storage, auth };
};

// ── Portal user counts ───────────────────────────────────────────────
const usePortalCounts = () =>
  useQuery({
    queryKey: ["portal-user-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").limit(1000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        counts[r.role] = (counts[r.role] || 0) + 1;
      });
      return counts;
    },
    staleTime: STALE_TIMES.FREQUENT,
  });

// ── Security stats ───────────────────────────────────────────────────
const useSecurityStats = () =>
  useQuery({
    queryKey: ["security-stats"],
    queryFn: async () => {
      const [sessionsRes, usersRes] = await Promise.all([
        supabase
          .from("access_logs")
          .select("id", { count: "exact", head: true })
          .gte("accessed_at", new Date(Date.now() - 3600_000).toISOString()),
        supabase
          .from("user_profiles")
          .select("user_id", { count: "exact", head: true }),
      ]);
      return {
        activeSessions: sessionsRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
      };
    },
    staleTime: STALE_TIMES.REALTIME,
  });

// ── Helpers ──────────────────────────────────────────────────────────
const PORTAL_ROLE_MAP: { label: string; role: string; color: string }[] = [
  { label: "Patient Portal", role: "user", color: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  { label: "Doctor Portal", role: "doctor", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { label: "Hospital Portal", role: "hospital_admin", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  { label: "Diagnostic Center Portal", role: "pathologist", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  { label: "Researcher Portal", role: "researcher", color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  { label: "Admin Portal", role: "admin", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
];

const RESERVED_KEYS = ["logo_url", "platform_name", "favicon_url"];

function StatusDot({ status }: { status: "ok" | "error" | "loading" }) {
  if (status === "loading")
    return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />;
  if (status === "ok")
    return <span className="h-2.5 w-2.5 rounded-full bg-green-500" />;
  return <span className="h-2.5 w-2.5 rounded-full bg-destructive" />;
}

// ── Main page ────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { settings, isLoading, logoUrl, platformName, lastUpdated, updateSetting, deleteSetting } =
    usePlatformSettings();
  const health = useHealthChecks();
  const { data: portalCounts } = usePortalCounts();
  const { data: secStats } = useSecurityStats();

  // ── Key-value editor state ──
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Branding state ──
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingFavicon, setEditingFavicon] = useState(false);
  const [faviconDraft, setFaviconDraft] = useState("");

  const faviconUrl = settings?.find((s) => s.key === "favicon_url")?.value || null;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["health-db"] });
    queryClient.invalidateQueries({ queryKey: ["health-storage"] });
    queryClient.invalidateQueries({ queryKey: ["health-auth"] });
    queryClient.invalidateQueries({ queryKey: ["portal-user-counts"] });
    queryClient.invalidateQueries({ queryKey: ["security-stats"] });
    queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    toast({ title: "Refreshing", description: "All status checks are being refreshed." });
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await updateSetting.mutateAsync({ key, value });
      toast({ title: "Saved", description: `Setting "${key}" updated.` });
    } catch {
      toast({ title: "Error", description: "Failed to save setting.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSetting.mutateAsync(deleteTarget);
      toast({ title: "Deleted", description: `Setting "${deleteTarget}" removed.` });
    } catch {
      toast({ title: "Error", description: "Failed to delete setting.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const customSettings = (settings ?? []).filter((s) => !RESERVED_KEYS.includes(s.key));

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">System Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Platform configuration and system health
          </p>
          {lastUpdated ? (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Settings last updated {format(new Date(lastUpdated), "PPp")}
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* ── Platform Branding ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Platform Branding
          </CardTitle>
          <CardDescription>Logo, name, and favicon that appear across all portals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <PlatformLogoUpload />

          {/* Live preview */}
          {(logoUrl || platformName) && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-2">Sidebar preview</p>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                )}
                <span className="font-semibold text-sm">{platformName || "PatientBio"}</span>
              </div>
            </div>
          )}

          {/* Platform Name */}
          <div className="space-y-1.5">
            <Label className="text-sm">Platform Name</Label>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="e.g. PatientBio"
                  className="max-w-xs"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    await saveSetting("platform_name", nameDraft);
                    setEditingName(false);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{platformName || "Not set"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setNameDraft(platformName || "");
                    setEditingName(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Favicon URL */}
          <div className="space-y-1.5">
            <Label className="text-sm">Favicon URL</Label>
            {editingFavicon ? (
              <div className="flex gap-2">
                <Input
                  value={faviconDraft}
                  onChange={(e) => setFaviconDraft(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  className="max-w-md"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    await saveSetting("favicon_url", faviconDraft);
                    setEditingFavicon(false);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingFavicon(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="" className="h-4 w-4" />
                ) : null}
                <span className="text-sm">{faviconUrl || "Not set"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setFaviconDraft(faviconUrl || "");
                    setEditingFavicon(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Live Platform Status ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Platform Status
            </CardTitle>
            <CardDescription>Live connectivity checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Database",
                query: health.db,
                detail: health.db.data ? `${health.db.data.latency}ms` : undefined,
              },
              {
                label: "Authentication",
                query: health.auth,
              },
              {
                label: "Storage",
                query: health.storage,
                detail: health.storage.data ? `${health.storage.data.bucketCount} buckets` : undefined,
              },
            ].map(({ label, query, detail }) => {
              const status = query.isLoading || query.isFetching
                ? "loading"
                : query.isError
                  ? "error"
                  : "ok";
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={status} />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {detail && (
                      <span className="text-xs text-muted-foreground">{detail}</span>
                    )}
                    <Badge
                      className={
                        status === "ok"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : status === "error"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }
                    >
                      {status === "ok" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {status === "error" && <XCircle className="h-3 w-3 mr-1" />}
                      {status === "loading" && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                      {status === "ok" ? "Connected" : status === "error" ? "Error" : "Checking…"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Security & Sessions ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Sessions
            </CardTitle>
            <CardDescription>Live security overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Sessions (1h)</span>
              <Badge variant="secondary">{secStats?.activeSessions ?? "…"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Registered Users</span>
              <Badge variant="secondary">{secStats?.totalUsers ?? "…"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Portal-Based Auth</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Role-Based Access</span>
              <Badge variant="secondary">Strict</Badge>
            </div>
            <a
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              View Audit Logs
            </a>
          </CardContent>
        </Card>

        {/* ── Database Overview ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Overview
            </CardTitle>
            <CardDescription>Storage and data management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Provider</span>
              <Badge variant="outline">PostgreSQL</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RLS Policies</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Buckets</span>
              <Badge variant="secondary">
                {health.storage.data ? health.storage.data.bucketCount : "…"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Realtime</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Email Configuration ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Configuration
            </CardTitle>
            <CardDescription>Notification and email settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Provider</span>
              <Badge variant="outline">Configured</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Verification Emails</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Password Reset</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Notifications</span>
              <Badge variant="secondary">Configured</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Portals with User Counts ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Portals
          </CardTitle>
          <CardDescription>Enabled platform modules with user counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PORTAL_ROLE_MAP.map(({ label, role, color }) => (
              <Badge key={role} className={color}>
                {label}
                {portalCounts?.[role] !== undefined && (
                  <span className="ml-1.5 font-normal opacity-80">
                    — {portalCounts[role]} {portalCounts[role] === 1 ? "user" : "users"}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Platform Configuration (Key-Value Manager) ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Configuration
              {customSettings.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {customSettings.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1.5">
              Custom key-value settings stored in the platform
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowAdd(true);
              setNewKey("");
              setNewValue("");
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {showAdd && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <Input
                placeholder="Key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="max-w-xs"
              />
              <Button
                size="sm"
                disabled={!newKey.trim()}
                onClick={async () => {
                  await saveSetting(newKey.trim(), newValue);
                  setShowAdd(false);
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          )}

          {customSettings.length === 0 && !showAdd ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No custom settings configured yet.</p>
              <p className="text-xs mt-1">Click "Add" to create a new key-value setting.</p>
            </div>
          ) : customSettings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customSettings.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="font-mono text-xs">{s.key}</TableCell>
                    <TableCell>
                      {editingKey === s.key ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="max-w-xs h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={async () => {
                              await saveSetting(s.key, editValue);
                              setEditingKey(null);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => setEditingKey(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm">{s.value || <em className="text-muted-foreground">empty</em>}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingKey !== s.key && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingKey(s.key);
                              setEditValue(s.value ?? "");
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(s.key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the setting <strong>{deleteTarget}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}