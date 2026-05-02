import { useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, BookOpen, Save, Video, HelpCircle, FileText, Loader2,
  ChevronDown, ArrowUp, ArrowDown, Copy, ExternalLink,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSiteContent, type GuidelinesContent } from "@/hooks/useSiteContent";
import { toast } from "@/hooks/use-toast";

/* ── YouTube URL → embed URL converter ── */
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  } catch { /* ignore */ }
  return null;
}

/* ── Reorder helpers ── */
function moveUp<T>(arr: T[], i: number): T[] {
  if (i <= 0) return arr;
  const copy = [...arr];
  [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
  return copy;
}
function moveDown<T>(arr: T[], i: number): T[] {
  if (i >= arr.length - 1) return arr;
  const copy = [...arr];
  [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
  return copy;
}

/* ── Portal config with colors ── */
const PORTALS = [
  { id: "general",    label: "General",    color: "bg-slate-500" },
  { id: "patient",    label: "Patient",    color: "bg-sky-500" },
  { id: "doctor",     label: "Doctor",     color: "bg-purple-500" },
  { id: "hospital",   label: "Hospital",   color: "bg-orange-500" },
  { id: "diagnostic", label: "Diagnostic", color: "bg-teal-500" },
  { id: "researcher", label: "Researcher", color: "bg-pink-500" },
] as const;

type PortalId = (typeof PORTALS)[number]["id"];

const EMPTY_GUIDELINES: GuidelinesContent = { sections: [], videos: [], faqs: [] };

/* ── Dirty check ── */
function isDirty(local: GuidelinesContent | null, data: GuidelinesContent): boolean {
  if (!local) return false;
  return JSON.stringify(local) !== JSON.stringify(data);
}

/* ── Per-portal editor ── */
function PortalEditor({ portalId, onDirtyChange }: { portalId: PortalId; onDirtyChange: (dirty: boolean) => void }) {
  const contentKey = `guidelines_${portalId}` as const;
  const { data, isLoading, update, isUpdating } = useSiteContent<GuidelinesContent>(contentKey, EMPTY_GUIDELINES);

  const [local, setLocal] = useState<GuidelinesContent | null>(null);
  const current = local ?? data;

  const setLocalAndTrack = useCallback((updater: (prev: GuidelinesContent) => GuidelinesContent) => {
    setLocal((prev) => {
      const next = updater(prev ?? data);
      // defer dirty check to avoid setState-in-render
      setTimeout(() => onDirtyChange(JSON.stringify(next) !== JSON.stringify(data)), 0);
      return next;
    });
  }, [data, onDirtyChange]);

  /* ── Section helpers ── */
  const addSection = () => setLocalAndTrack((prev) => ({ ...prev, sections: [...prev.sections, { title: "", content: "" }] }));
  const removeSection = (i: number) => setLocalAndTrack((prev) => ({ ...prev, sections: prev.sections.filter((_, idx) => idx !== i) }));
  const updateSection = (i: number, field: "title" | "content", value: string) => {
    setLocalAndTrack((prev) => {
      const sections = [...prev.sections];
      sections[i] = { ...sections[i], [field]: value };
      return { ...prev, sections };
    });
  };
  const reorderSection = (i: number, dir: "up" | "down") => setLocalAndTrack((prev) => ({ ...prev, sections: dir === "up" ? moveUp(prev.sections, i) : moveDown(prev.sections, i) }));

  /* ── Video helpers ── */
  const addVideo = () => setLocalAndTrack((prev) => ({ ...prev, videos: [...prev.videos, { title: "", url: "", duration: "" }] }));
  const removeVideo = (i: number) => setLocalAndTrack((prev) => ({ ...prev, videos: prev.videos.filter((_, idx) => idx !== i) }));
  const updateVideo = (i: number, field: "title" | "url" | "duration", value: string) => {
    setLocalAndTrack((prev) => {
      const videos = [...prev.videos];
      videos[i] = { ...videos[i], [field]: value };
      return { ...prev, videos };
    });
  };
  const reorderVideo = (i: number, dir: "up" | "down") => setLocalAndTrack((prev) => ({ ...prev, videos: dir === "up" ? moveUp(prev.videos, i) : moveDown(prev.videos, i) }));

  /* ── FAQ helpers ── */
  const addFaq = () => setLocalAndTrack((prev) => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }));
  const removeFaq = (i: number) => setLocalAndTrack((prev) => ({ ...prev, faqs: prev.faqs.filter((_, idx) => idx !== i) }));
  const updateFaq = (i: number, field: "question" | "answer", value: string) => {
    setLocalAndTrack((prev) => {
      const faqs = [...prev.faqs];
      faqs[i] = { ...faqs[i], [field]: value };
      return { ...prev, faqs };
    });
  };
  const reorderFaq = (i: number, dir: "up" | "down") => setLocalAndTrack((prev) => ({ ...prev, faqs: dir === "up" ? moveUp(prev.faqs, i) : moveDown(prev.faqs, i) }));

  /* ── Copy from another portal ── */
  const copyFrom = (sourceId: PortalId) => {
    // We need the hook for the source — but since hooks can't be conditional,
    // we do a direct fetch via the existing data pattern. The simplest approach:
    // just read from a temporary useSiteContent. Instead, we'll use the supabase client directly.
    // For simplicity, prompt the user to save first then switch. 
    // Actually the cleanest approach: fetch inline.
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase
        .from("site_content")
        .select("value")
        .eq("key", `guidelines_${sourceId}`)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row?.value) {
            const source = row.value as unknown as GuidelinesContent;
            setLocalAndTrack(() => ({
              sections: [...(source.sections || [])],
              videos: [...(source.videos || [])],
              faqs: [...(source.faqs || [])],
            }));
            toast.success(`Content copied from ${sourceId}`);
          } else {
            toast.error(`No content found for ${sourceId}`);
          }
        });
    });
  };

  const handleSave = () => {
    if (!local) return;
    update(local, {
      onSuccess: () => {
        toast.success("Guidelines saved successfully");
        setLocal(null);
        onDirtyChange(false);
      },
      onError: () => toast.error("Failed to save guidelines"),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Top bar: Preview + Copy from */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy from…
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {PORTALS.filter((p) => p.id !== portalId).map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => copyFrom(p.id)}>
                  <span className={`h-2 w-2 rounded-full ${p.color} mr-2 shrink-0`} />
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <a href="/guidelines" target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Preview Public Page
          </Button>
        </a>
      </div>

      {/* Guidelines Sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Guideline Sections
            <Badge variant="secondary" className="ml-1 text-xs">{current.sections.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addSection}><Plus className="h-4 w-4 mr-1" /> Add Section</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.sections.length === 0 ? (
            <InlineEmptyState
              icon={FileText}
              title="No sections yet"
              description="Add guideline sections with rich Markdown formatting."
              action={{ label: "Add Section", onClick: addSection, icon: Plus }}
            />
          ) : current.sections.map((s, i) => (
            <Collapsible key={i} defaultOpen={!s.title}>
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-1 px-3 py-2.5 bg-muted/30 group">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <ChevronDown className="h-4 w-4 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
                    </Button>
                  </CollapsibleTrigger>
                  <span className="text-sm font-medium truncate flex-1">{s.title || `Section ${i + 1}`}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => reorderSection(i, "up")} disabled={i === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => reorderSection(i, "down")} disabled={i === current.sections.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0" onClick={() => removeSection(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="p-4 space-y-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input value={s.title} onChange={(e) => updateSection(i, "title", e.target.value)} placeholder="Section title" />
                    </div>
                    <div>
                      <Label className="text-xs">Content (Markdown)</Label>
                      <MarkdownEditor value={s.content} onChange={(val) => updateSection(i, "content", val)} placeholder="Write section content with Markdown…" minRows={4} />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Video Tutorials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4" /> Video Tutorials
            <Badge variant="secondary" className="ml-1 text-xs">{current.videos.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addVideo}><Plus className="h-4 w-4 mr-1" /> Add Video</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.videos.length === 0 ? (
            <InlineEmptyState
              icon={Video}
              title="No videos yet"
              description="Add YouTube tutorial links with titles and durations."
              action={{ label: "Add Video", onClick: addVideo, icon: Plus }}
            />
          ) : current.videos.map((v, i) => {
            const embedUrl = toEmbedUrl(v.url);
            return (
              <div key={i} className="border rounded-lg p-4 space-y-3 relative group">
                <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reorderVideo(i, "up")} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reorderVideo(i, "down")} disabled={i === current.videos.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeVideo(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Title</Label>
                    <Input value={v.title} onChange={(e) => updateVideo(i, "title", e.target.value)} placeholder="Video title" />
                  </div>
                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Input value={v.duration} onChange={(e) => updateVideo(i, "duration", e.target.value)} placeholder="e.g. 5 min" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">YouTube URL</Label>
                  <Input value={v.url} onChange={(e) => updateVideo(i, "url", e.target.value)} placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..." />
                  <p className="text-xs text-muted-foreground mt-1">Accepts watch, embed, or short (youtu.be) URLs</p>
                </div>
                {embedUrl && (
                  <div className="aspect-video rounded-md overflow-hidden border">
                    <iframe src={embedUrl} title={v.title || "Preview"} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Q&A */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" /> Q&A / FAQ
            <Badge variant="secondary" className="ml-1 text-xs">{current.faqs.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addFaq}><Plus className="h-4 w-4 mr-1" /> Add Q&A</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {current.faqs.length === 0 ? (
            <InlineEmptyState
              icon={HelpCircle}
              title="No FAQs yet"
              description="Add commonly asked questions and answers for this portal."
              action={{ label: "Add Q&A", onClick: addFaq, icon: Plus }}
            />
          ) : current.faqs.map((f, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 relative group">
              <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reorderFaq(i, "up")} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reorderFaq(i, "down")} disabled={i === current.faqs.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFaq(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div>
                <Label className="text-xs">Question</Label>
                <Input value={f.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Question" />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <MarkdownEditor value={f.answer} onChange={(val) => updateFaq(i, "answer", val)} placeholder="Write the answer with Markdown…" minRows={3} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!local || isUpdating} className="gap-2">
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {portalId.charAt(0).toUpperCase() + portalId.slice(1)} Guidelines
        </Button>
      </div>
    </div>
  );
}

/* ── Page ── */
const AdminGuidelinesPage = () => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [dirtyPortals, setDirtyPortals] = useState<Record<string, boolean>>({});
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    if (dirtyPortals[activeTab]) {
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmSwitch = () => {
    if (pendingTab) {
      setDirtyPortals((prev) => ({ ...prev, [activeTab]: false }));
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Manage Guidelines</h1>
        <p className="text-muted-foreground mt-1">Update guideline text, video tutorials, and Q&A for each portal. Changes appear live on the public Guidelines page.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {PORTALS.map((p) => (
            <TabsTrigger key={p.id} value={p.id} className="text-sm gap-1.5">
              <span className={`h-2 w-2 rounded-full ${p.color}`} />
              {p.label}
              {dirtyPortals[p.id] && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {PORTALS.map((p) => (
          <TabsContent key={p.id} value={p.id} className="mt-6">
            <PortalEditor
              portalId={p.id}
              onDirtyChange={(dirty) => setDirtyPortals((prev) => ({ ...prev, [p.id]: dirty }))}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={!!pendingTab} onOpenChange={(open) => { if (!open) setPendingTab(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this portal. Switching tabs will discard them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Discard & Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminGuidelinesPage;
