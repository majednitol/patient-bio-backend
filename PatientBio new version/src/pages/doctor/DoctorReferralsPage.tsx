import { useState } from "react";
import { useDoctorReferrals } from "@/hooks/useDoctorReferrals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRightLeft, Send, Inbox, Clock, CheckCircle2, XCircle, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";

const urgencyBadge: Record<string, string> = {
  routine: "bg-blue-500/10 text-blue-600",
  urgent: "bg-amber-500/10 text-amber-600",
  emergency: "bg-destructive/10 text-destructive",
};

const statusBadge: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-amber-500/10 text-amber-600", icon: Clock },
  accepted: { color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  declined: { color: "bg-destructive/10 text-destructive", icon: XCircle },
  completed: { color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  cancelled: { color: "bg-muted text-muted-foreground", icon: XCircle },
};

function ReferralCard({
  referral,
  type,
  onUpdateStatus,
  onRespondWithNotes,
}: {
  referral: any;
  type: "sent" | "received";
  onUpdateStatus: (id: string, status: string) => void;
  onRespondWithNotes: (id: string, status: string) => void;
}) {
  const otherDoctor = type === "sent" ? referral.referred_to_doctor : referral.referring_doctor;
  const StatusIcon = statusBadge[referral.status]?.icon || Clock;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary">
                {otherDoctor?.full_name?.[0]?.toUpperCase() || "D"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm">
                {type === "sent" ? "To: " : "From: "}
                {otherDoctor?.full_name || "Unknown Doctor"}
              </p>
              <p className="text-xs text-muted-foreground">
                {otherDoctor?.specialty || "General"} · Patient: {referral.patient?.display_name || "Unknown"}
              </p>
              <p className="text-sm mt-1">{referral.reason}</p>
              {referral.diagnosis && (
                <p className="text-xs text-muted-foreground mt-1">Dx: {referral.diagnosis}</p>
              )}
              {referral.clinical_notes && (
                <div className="mt-2 p-2 rounded-md bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-0.5">
                    <FileText className="h-3 w-3" /> Clinical Notes
                  </p>
                  <p className="text-xs">{referral.clinical_notes}</p>
                </div>
              )}
              {referral.response_notes && (
                <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                  <p className="text-xs font-medium text-primary flex items-center gap-1 mb-0.5">
                    <MessageSquare className="h-3 w-3" /> Response Notes
                  </p>
                  <p className="text-xs">{referral.response_notes}</p>
                </div>
              )}
              {referral.responded_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Responded: {format(new Date(referral.responded_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(referral.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className={urgencyBadge[referral.urgency]}>
                {referral.urgency}
              </Badge>
              <Badge variant="outline" className={statusBadge[referral.status]?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {referral.status}
              </Badge>
            </div>
            {type === "received" && referral.status === "pending" && (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onRespondWithNotes(referral.id, "declined")}>
                  Decline
                </Button>
                <Button size="sm" className="text-xs h-7" onClick={() => onRespondWithNotes(referral.id, "accepted")}>
                  Accept
                </Button>
              </div>
            )}
            {type === "received" && referral.status === "accepted" && (
              <Button size="sm" className="text-xs h-7" onClick={() => onUpdateStatus(referral.id, "completed")}>
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DoctorReferralsPage() {
  const { sentReferrals, receivedReferrals, isLoading, updateReferralStatus } = useDoctorReferrals();
  const [respondDialog, setRespondDialog] = useState<{ id: string; status: string } | null>(null);
  const [responseNotes, setResponseNotes] = useState("");

  const handleUpdateStatus = (id: string, status: string) => {
    updateReferralStatus.mutate({ id, status });
  };

  const handleRespondWithNotes = (id: string, status: string) => {
    setRespondDialog({ id, status });
    setResponseNotes("");
  };

  const handleConfirmResponse = () => {
    if (!respondDialog) return;
    updateReferralStatus.mutate({
      id: respondDialog.id,
      status: respondDialog.status,
      response_notes: responseNotes.trim() || undefined,
    });
    setRespondDialog(null);
    setResponseNotes("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const pendingCount = receivedReferrals.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 sm:h-7 sm:w-7" />
          Referrals
        </h1>
        <p className="text-sm text-muted-foreground">Manage doctor-to-doctor referrals</p>
      </div>

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-1.5">
            <Inbox className="h-4 w-4" />
            Received ({receivedReferrals.length})
            {pendingCount > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <Send className="h-4 w-4" />
            Sent ({sentReferrals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3 mt-4">
          {receivedReferrals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-2" />
                <p>No referrals received yet</p>
              </CardContent>
            </Card>
          ) : (
            receivedReferrals.map((r) => (
              <ReferralCard
                key={r.id}
                referral={r}
                type="received"
                onUpdateStatus={handleUpdateStatus}
                onRespondWithNotes={handleRespondWithNotes}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3 mt-4">
          {sentReferrals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Send className="h-10 w-10 mx-auto mb-2" />
                <p>No referrals sent yet</p>
                <p className="text-sm">Refer patients from the patient details view</p>
              </CardContent>
            </Card>
          ) : (
            sentReferrals.map((r) => (
              <ReferralCard
                key={r.id}
                referral={r}
                type="sent"
                onUpdateStatus={handleUpdateStatus}
                onRespondWithNotes={handleRespondWithNotes}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Response Notes Dialog */}
      <Dialog open={!!respondDialog} onOpenChange={(open) => { if (!open) setRespondDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {respondDialog?.status === "accepted" ? "Accept Referral" : "Decline Referral"}
            </DialogTitle>
            <DialogDescription>
              Add notes for the referring doctor about your decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder={
                respondDialog?.status === "accepted"
                  ? "E.g., Patient can schedule on Mon-Wed. I'll review the clinical notes beforehand..."
                  : "E.g., Not within my specialty, recommend referring to Dr. Smith instead..."
              }
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{responseNotes.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialog(null)}>Cancel</Button>
            <Button
              variant={respondDialog?.status === "accepted" ? "default" : "destructive"}
              onClick={handleConfirmResponse}
              disabled={updateReferralStatus.isPending}
            >
              {respondDialog?.status === "accepted" ? "Accept" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
