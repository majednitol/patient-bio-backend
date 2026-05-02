import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudyCollaborators } from "@/hooks/useStudyCollaborators";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Loader2, Trash2, Search } from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  principal_investigator: { label: "PI", variant: "default" },
  co_investigator: { label: "Co-Investigator", variant: "secondary" },
  data_analyst: { label: "Data Analyst", variant: "outline" },
  observer: { label: "Observer", variant: "outline" },
};

interface StudyCollaboratorManagerProps {
  studyId: string;
  studyTitle: string;
  embedded?: boolean;
}

export const StudyCollaboratorManager = ({ studyId, studyTitle, embedded = false }: StudyCollaboratorManagerProps) => {
  const { collaborators, isLoading, inviteCollaborator, removeCollaborator, isInviting } = useStudyCollaborators(studyId);
  const [open, setOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [role, setRole] = useState("co_investigator");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from("researcher_profiles")
        .select("user_id, full_name, institution_name, email, is_verified")
        .or(`email.ilike.%${searchEmail}%,full_name.ilike.%${searchEmail}%`)
        .eq("is_verified", true)
        .limit(5);
      setSearchResults(data || []);
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = (researcherId: string) => {
    inviteCollaborator({ studyId, researcherId, role });
    setSearchResults([]);
    setSearchEmail("");
  };

  const acceptedCount = collaborators.filter((c) => c.status === "accepted").length;

  const content = (
    <>
      {/* Search & Invite */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button size="icon" variant="outline" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {searchResults.length > 0 && (
          <div className="border rounded-lg divide-y">
            {searchResults.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.institution_name || r.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInvite(r.user_id)}
                  disabled={isInviting || collaborators.some((c) => c.researcher_id === r.user_id)}
                >
                  {isInviting ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                  Invite
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Collaborators */}
      <div className="space-y-2 mt-4">
        <h4 className="text-sm font-medium">Current Team</h4>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No collaborators yet. Invite verified researchers to join.</p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((c) => {
              const roleConfig = ROLE_CONFIG[c.role] || ROLE_CONFIG.co_investigator;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{c.researcher_name}</p>
                      <p className="text-xs text-muted-foreground">{c.researcher_institution}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleConfig.variant} className="text-xs">{roleConfig.label}</Badge>
                    <Badge variant={c.status === "accepted" ? "default" : c.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                      {c.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCollaborator(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          {acceptedCount > 0 && <Badge variant="secondary" className="text-[10px] px-1">{acceptedCount}</Badge>}
          Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Study Collaborators
          </DialogTitle>
          <DialogDescription>{studyTitle}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
