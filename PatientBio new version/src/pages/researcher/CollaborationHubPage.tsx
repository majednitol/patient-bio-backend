import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageSquare, Plus, Users, Clock, BookOpen,
  ChevronRight, Trash2, Loader2, Database, UserPlus,
  Check, X, ArrowRight, Shield, Beaker,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ResearchThread } from "@/components/researcher/ResearchThread";
import { useStudyCollaborators } from "@/hooks/useStudyCollaborators";
import { useDoctorResearcherShares } from "@/hooks/useDoctorResearcherShares";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const CollaborationHubPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadStudyId, setNewThreadStudyId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("discussions");

  // Hooks
  const { pendingInvitations, respondToInvitation, isLoading: collabLoading } = useStudyCollaborators();
  const {
    incomingShares, pendingShares, pendingCount: sharesPendingCount,
    updateShareStatus, isUpdating,
  } = useDoctorResearcherShares();

  const acceptedCollabs = (pendingInvitations as any[])?.filter?.((c: any) => c.status === "accepted") || [];

  // Fetch studies for the dropdown
  const { data: studies = [] } = useQuery({
    queryKey: ["researcher-studies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_studies")
        .select("id, title, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["researcher-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_threads")
        .select("*, researcher_studies(title)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create thread
  const createThread = useMutation({
    mutationFn: async () => {
      if (!user || !newThreadTitle.trim() || !newThreadStudyId) return;
      const { error } = await supabase.from("researcher_threads").insert({
        title: newThreadTitle.trim(),
        study_id: newThreadStudyId,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-threads"] });
      setNewThreadTitle("");
      setNewThreadStudyId("");
      setCreateOpen(false);
      toast({ title: "Thread created" });
    },
    onError: () => toast({ title: "Failed to create thread", variant: "destructive" }),
  });

  // Delete thread
  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from("researcher_threads").delete().eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-threads"] });
      setSelectedThreadId(null);
      toast({ title: "Thread deleted" });
    },
  });

  const selectedThread = threads.find((t: any) => t.id === selectedThreadId);

  const invitationCount = pendingInvitations?.length || 0;

  // Stats
  const stats = [
    { label: "Active Threads", value: threads.length, icon: MessageSquare },
    { label: "Pending Invitations", value: invitationCount, icon: UserPlus },
    { label: "Incoming Data", value: sharesPendingCount, icon: Database },
    { label: "Active Collaborations", value: acceptedCollabs.length, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-research-primary" />
            Collaboration Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage discussions, team invitations, and shared research data
          </p>
        </div>
        {activeTab === "discussions" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-research-primary hover:bg-research-primary/90">
                <Plus className="h-4 w-4 mr-2" /> New Thread
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Research Thread</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Thread Title</label>
                  <Input
                    placeholder="e.g. Biomarker correlation discussion"
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Link to Study</label>
                  <Select value={newThreadStudyId} onValueChange={setNewThreadStudyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a study" />
                    </SelectTrigger>
                    <SelectContent>
                      {studies.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-research-primary hover:bg-research-primary/90"
                  onClick={() => createThread.mutate()}
                  disabled={!newThreadTitle.trim() || !newThreadStudyId || createThread.isPending}
                >
                  {createThread.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Thread
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-research-muted">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-research-primary/10">
                <stat.icon className="h-4 w-4 text-research-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="discussions" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Discussions
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5">
            <UserPlus className="h-4 w-4" /> Study Teams
            {invitationCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {invitationCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared-data" className="gap-1.5">
            <Database className="h-4 w-4" /> Shared Data
            {sharesPendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {sharesPendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Discussions Tab */}
        <TabsContent value="discussions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
            <Card className="border-research-muted lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Threads</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  {threadsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No threads yet. Create one to start collaborating.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {threads.map((thread: any) => (
                        <button
                          key={thread.id}
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                            selectedThreadId === thread.id ? "bg-research-muted/60 dark:bg-research-primary/20" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{thread.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {thread.researcher_studies?.title || "Unknown study"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-research-muted lg:col-span-2">
              {selectedThread ? (
                <div className="flex flex-col h-full">
                  <CardHeader className="pb-2 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedThread.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Study: {(selectedThread as any).researcher_studies?.title}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteThread.mutate(selectedThread.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <Separator />
                  <ResearchThread threadId={selectedThread.id} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[450px] text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a thread to view the conversation</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Study Teams Tab */}
        <TabsContent value="teams">
          <div className="space-y-6">
            {/* Pending Invitations */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Invitations
              </h2>
              {collabLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <Card className="border-dashed border-research-muted">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No pending invitations
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {pendingInvitations.map((inv: any) => (
                    <Card key={inv.id} className="border-research-muted">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{inv.study_title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Invited by {inv.researcher_name}
                              {inv.researcher_institution && ` · ${inv.researcher_institution}`}
                            </p>
                            <Badge variant="secondary" className="mt-2 text-xs capitalize">
                              {inv.role}
                            </Badge>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              onClick={() => respondToInvitation({ collaborationId: inv.id, accept: true })}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => respondToInvitation({ collaborationId: inv.id, accept: false })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Active Collaborations */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-research-primary" />
                Active Collaborations
              </h2>
              {acceptedCollabs.length === 0 ? (
                <Card className="border-dashed border-research-muted">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    You haven't joined any study teams yet. Accept an invitation above to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {acceptedCollabs.map((collab: any) => (
                    <Card key={collab.id} className="border-research-muted hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <p className="font-medium text-sm truncate">{collab.study_title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs capitalize">{collab.role}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined {collab.accepted_at ? format(new Date(collab.accepted_at), "MMM d, yyyy") : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Shared Data Tab */}
        <TabsContent value="shared-data">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-research-primary" />
              Incoming Data from Doctors
            </h2>

            {incomingShares.length === 0 ? (
              <Card className="border-dashed border-research-muted">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No shared data yet</p>
                  <p className="mt-1">When doctors share patient data with you for research, it will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {incomingShares.map((share) => (
                  <Card key={share.id} className="border-research-muted">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {share.disease_category && (
                              <Badge variant="outline" className="text-xs">
                                <Beaker className="h-3 w-3 mr-1" />
                                {share.disease_category}
                              </Badge>
                            )}
                            <Badge className={`text-xs ${statusColors[share.status] || "bg-muted text-muted-foreground"}`}>
                              {share.status.replace("_", " ")}
                            </Badge>
                            {share.is_anonymized && (
                              <Badge variant="secondary" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" /> Anonymized
                              </Badge>
                            )}
                          </div>
                          {share.research_purpose && (
                            <p className="text-sm text-muted-foreground">{share.research_purpose}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Shared {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Status actions */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          {share.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => updateShareStatus({ shareId: share.id, status: "accepted" })}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isUpdating}
                                className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateShareStatus({ shareId: share.id, status: "declined" })}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {share.status === "accepted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => updateShareStatus({ shareId: share.id, status: "in_progress" })}
                            >
                              <ArrowRight className="h-3.5 w-3.5 mr-1" /> Start Analysis
                            </Button>
                          )}
                          {share.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              onClick={() => updateShareStatus({ shareId: share.id, status: "completed" })}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollaborationHubPage;
