import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Globe, Send, Bell, ExternalLink, FileDown, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AVAILABLE_SCOPES = [
  { value: "pool:read", label: "Pool Data (read)", description: "Query anonymized global pool data" },
  { value: "cohort:read", label: "Cohort Data (read)", description: "Query your approved patient shares" },
  { value: "stats:read", label: "Statistics (read)", description: "Aggregate statistics and distributions" },
];

const WEBHOOK_EVENTS = [
  { value: "new_share", label: "New Data Share", description: "When a patient shares data with you" },
  { value: "pool_contribution", label: "Pool Contribution", description: "When new data enters the global pool" },
  { value: "share_status_change", label: "Share Status Change", description: "When a share's status changes" },
];

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "rk_";
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const ResearcherApiPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("keys");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["pool:read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("90");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Webhook state
  const [webhookLabel, setWebhookLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["new_share"]);

  // Fetch API keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["researcher-api-keys", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_api_keys" as any)
        .select("id, key_prefix, label, scopes, last_used_at, expires_at, is_active, created_at")
        .eq("researcher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch webhooks
  const { data: webhooks = [] } = useQuery({
    queryKey: ["researcher-webhooks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_webhooks" as any)
        .select("id, researcher_id, url, events, is_active, secret, created_at" as any)
        .eq("researcher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Create API key
  const createKey = useMutation({
    mutationFn: async () => {
      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newKeyExpiry));

      const { error } = await supabase.from("researcher_api_keys" as any).insert({
        researcher_id: user!.id,
        key_hash: keyHash,
        key_prefix: rawKey.substring(0, 7),
        label: newKeyLabel.trim(),
        scopes: newKeyScopes,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      return rawKey;
    },
    onSuccess: (rawKey) => {
      setRevealedKey(rawKey);
      setNewKeyLabel("");
      queryClient.invalidateQueries({ queryKey: ["researcher-api-keys"] });
      toast({ title: "API key created", description: "Copy it now — it won't be shown again." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" }),
  });

  // Delete API key
  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("researcher_api_keys" as any).update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-api-keys"] });
      toast({ title: "API key revoked" });
    },
  });

  // Create webhook
  const createWebhook = useMutation({
    mutationFn: async () => {
      const secret = generateApiKey();
      const { error } = await supabase.from("researcher_webhooks" as any).insert({
        researcher_id: user!.id,
        label: webhookLabel.trim(),
        url: webhookUrl.trim(),
        secret,
        events: webhookEvents,
      });
      if (error) throw error;
      return secret;
    },
    onSuccess: (secret) => {
      setWebhookLabel("");
      setWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["researcher-webhooks"] });
      toast({ title: "Webhook created", description: `Signing secret: ${secret.substring(0, 12)}...` });
    },
    onError: () => toast({ title: "Error", description: "Failed to create webhook.", variant: "destructive" }),
  });

  // Delete webhook
  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("researcher_webhooks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/researcher-api-gateway`;

  // REDCap export helper
  const exportRedcap = async () => {
    const { data, error } = await supabase
      .from("patient_researcher_shares" as any)
      .select("patient_id, disease_category, shared_at, is_anonymized, status")
      .eq("researcher_id", user!.id)
      .in("status", ["pending", "viewed", "completed"])
      .order("shared_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Export failed", variant: "destructive" });
      return;
    }

    // REDCap data dictionary CSV format
    const dictHeaders = ["Variable / Field Name", "Form Name", "Section Header", "Field Type", "Field Label", "Choices, Calculations, OR Slider Labels", "Field Note", "Text Validation Type OR Show Slider Number", "Text Validation Min", "Text Validation Max", "Identifier?", "Branching Logic (Show field only if...)", "Required Field?", "Custom Alignment", "Question Number (surveys only)", "Matrix Group Name", "Matrix Ranking?", "Field Annotation"];
    const dictRows = [
      ["record_id", "demographics", "", "text", "Record ID", "", "", "", "", "", "y", "", "y", "", "", "", "", ""],
      ["disease_category", "demographics", "", "text", "Disease Category", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["shared_at", "demographics", "", "text", "Date Shared", "", "", "date_ymd", "", "", "", "", "", "", "", "", "", ""],
      ["is_anonymized", "demographics", "", "yesno", "Anonymized", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["status", "demographics", "", "text", "Status", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ];

    const dictCsv = [dictHeaders.join(","), ...dictRows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");

    // Data CSV
    const dataHeaders = ["record_id", "disease_category", "shared_at", "is_anonymized", "status"];
    const dataRows = (data || []).map((d: any, i: number) => [
      i + 1,
      d.disease_category || "general",
      d.shared_at?.split("T")[0] || "",
      d.is_anonymized ? 1 : 0,
      d.status,
    ]);
    const dataCsv = [dataHeaders.join(","), ...dataRows.map((r: any[]) => r.join(","))].join("\n");

    // Download both files
    const dictBlob = new Blob([dictCsv], { type: "text/csv" });
    const dataBlob = new Blob([dataCsv], { type: "text/csv" });

    const link1 = document.createElement("a");
    link1.href = URL.createObjectURL(dictBlob);
    link1.download = `redcap-data-dictionary-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link1.click();

    setTimeout(() => {
      const link2 = document.createElement("a");
      link2.href = URL.createObjectURL(dataBlob);
      link2.download = `redcap-data-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link2.click();
    }, 500);

    toast({ title: "REDCap export complete", description: "Data dictionary + data files downloaded." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          API Access & Integrations
        </h1>
        <p className="text-muted-foreground mt-1">Programmatic access to research data for external tools</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="redcap">REDCap Export</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="docs">API Docs</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4 mt-4">
          {/* Revealed key banner */}
          {revealedKey && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Copy your API key now — it won't be shown again</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">{revealedKey}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(revealedKey)}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRevealedKey(null)}>Dismiss</Button>
              </CardContent>
            </Card>
          )}

          {/* Create new key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="e.g. Python analysis script" maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <div key={scope.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={newKeyScopes.includes(scope.value)}
                        onCheckedChange={() => toggleScope(scope.value)}
                      />
                      <span className="text-sm">{scope.label}</span>
                      <span className="text-xs text-muted-foreground">— {scope.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => createKey.mutate()} disabled={!newKeyLabel.trim() || newKeyScopes.length === 0 || createKey.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Key
              </Button>
            </CardContent>
          </Card>

          {/* Existing keys */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Keys</CardTitle>
              <CardDescription>{apiKeys.filter((k: any) => k.is_active).length} active keys</CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No API keys created yet.</p>
              ) : (
                <div className="space-y-3">
                  {apiKeys.filter((k: any) => k.is_active).map((key: any) => (
                    <div key={key.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{key.label}</span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}...</code>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Scopes: {(key.scopes as string[]).join(", ")}</span>
                          <span>·</span>
                          <span>Expires: {format(new Date(key.expires_at), "MMM d, yyyy")}</span>
                          {key.last_used_at && (
                            <>
                              <span>·</span>
                              <span>Last used: {format(new Date(key.last_used_at), "MMM d")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteKey.mutate(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REDCap Export Tab */}
        <TabsContent value="redcap" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="h-5 w-5 text-primary" />
                REDCap Export
              </CardTitle>
              <CardDescription>Export cohort data in REDCap-compatible CSV format for clinical trial management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                <h4 className="text-sm font-medium">What's included:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Data Dictionary</strong> — Field definitions matching REDCap import format</li>
                  <li>• <strong>Data File</strong> — Your approved patient shares in record-per-row format</li>
                  <li>• Compatible with REDCap's "Import Data Dictionary" and "Data Import Tool"</li>
                </ul>
              </div>
              <Button onClick={exportRedcap}>
                <FileDown className="h-4 w-4 mr-2" />
                Download REDCap Files
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Webhook</CardTitle>
              <CardDescription>Receive real-time notifications when data events occur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={webhookLabel} onChange={e => setWebhookLabel(e.target.value)} placeholder="e.g. My data pipeline" maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" maxLength={500} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map(evt => (
                    <div key={evt.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={webhookEvents.includes(evt.value)}
                        onCheckedChange={() => toggleWebhookEvent(evt.value)}
                      />
                      <span className="text-sm">{evt.label}</span>
                      <span className="text-xs text-muted-foreground">— {evt.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => createWebhook.mutate()} disabled={!webhookLabel.trim() || !webhookUrl.trim() || webhookEvents.length === 0 || createWebhook.isPending}>
                <Bell className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </CardContent>
          </Card>

          {/* Existing webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No webhooks configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh: any) => (
                    <div key={wh.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{wh.label}</span>
                          {!wh.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          {wh.failure_count > 3 && <Badge variant="destructive" className="text-xs">Failing</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{wh.url}</p>
                        <div className="flex gap-1 mt-1">
                          {(wh.events as string[]).map((e: string) => (
                            <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteWebhook.mutate(wh.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Docs Tab */}
        <TabsContent value="docs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                API Documentation
              </CardTitle>
              <CardDescription>Integrate with R, Python, SPSS, or any HTTP client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Base URL</h4>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-xs font-mono flex-1 break-all">{baseUrl}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(baseUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Authentication</h4>
                <p className="text-sm text-muted-foreground">Pass your API key in the <code className="bg-muted px-1 rounded">x-api-key</code> header.</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Endpoints</h4>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">GET</Badge>
                    <code className="text-xs">?resource=pool&limit=100&offset=0&disease=diabetes</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Query anonymized global pool data. Requires <code>pool:read</code> scope.</p>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">GET</Badge>
                    <code className="text-xs">?resource=cohort&limit=100</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Query your approved patient shares. Requires <code>cohort:read</code> scope.</p>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">GET</Badge>
                    <code className="text-xs">?resource=stats</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Get aggregate statistics. Requires <code>pool:read</code> scope.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Python Example</h4>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre">{`import requests

API_KEY = "rk_your_key_here"
BASE_URL = "${baseUrl}"

# Fetch pool data
response = requests.get(
    BASE_URL,
    params={"resource": "pool", "limit": 50},
    headers={"x-api-key": API_KEY}
)
data = response.json()
print(f"Found {data['meta']['count']} records")`}</pre>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">R Example</h4>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre">{`library(httr)
library(jsonlite)

api_key <- "rk_your_key_here"
base_url <- "${baseUrl}"

res <- GET(
  base_url,
  query = list(resource = "stats"),
  add_headers(\`x-api-key\` = api_key)
)
stats <- fromJSON(content(res, "text"))
print(stats$diseaseDistribution)`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResearcherApiPage;
