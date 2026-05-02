import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital, DoctorApplication } from "@/types/hospital";
import { useHospitalApplications, useReviewApplication } from "@/hooks/useDoctorApplications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Check, X, Clock, Loader2, Mail, Phone, Briefcase } from "lucide-react";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

export default function HospitalApplicationsPage() {
  const { hospital } = useOutletContext<HospitalContext>();
  const { data: applications, isLoading } = useHospitalApplications(hospital.id);
  const reviewApplication = useReviewApplication();

  const [selectedApp, setSelectedApp] = useState<DoctorApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const pendingApps = applications?.filter((a) => a.status === "pending") || [];
  const approvedApps = applications?.filter((a) => a.status === "approved") || [];
  const rejectedApps = applications?.filter((a) => a.status === "rejected") || [];

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedApp) return;

    await reviewApplication.mutateAsync({
      applicationId: selectedApp.id,
      hospitalId: hospital.id,
      status,
      rejectionReason: status === "rejected" ? rejectionReason : undefined,
      applicationData: selectedApp,
    });

    setSelectedApp(null);
    setRejectionReason("");
    setAction(null);
  };

  const ApplicationCard = ({ app }: { app: DoctorApplication }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">{app.full_name}</h3>
            <p className="text-sm text-muted-foreground">
              {app.specialty || "General Medicine"}
            </p>
          </div>
          <Badge
            variant={
              app.status === "pending"
                ? "secondary"
                : app.status === "approved"
                ? "default"
                : "destructive"
            }
            className="capitalize"
          >
            {app.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          {app.qualification && (
            <p className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {app.qualification}
            </p>
          )}
          {app.experience_years && (
            <p className="text-muted-foreground">
              {app.experience_years} years of experience
            </p>
          )}
          {app.license_number && (
            <p className="text-muted-foreground">
              License: {app.license_number}
            </p>
          )}
        </div>

        {app.status === "pending" && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                setSelectedApp(app);
                setAction("approve");
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedApp(app);
                setAction("reject");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Applied on {new Date(app.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctor Applications</h1>
        <p className="text-muted-foreground">
          Review and manage applications from doctors
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingApps.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="h-4 w-4" />
            Approved ({approvedApps.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="h-4 w-4" />
            Rejected ({rejectedApps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingApps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending applications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingApps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedApps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Check className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No approved applications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvedApps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedApps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <X className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No rejected applications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rejectedApps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!action} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Application" : "Reject Application"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? `Are you sure you want to approve ${selectedApp?.full_name}'s application? They will be added as a doctor to your hospital.`
                : `Please provide a reason for rejecting ${selectedApp?.full_name}'s application.`}
            </DialogDescription>
          </DialogHeader>

          {action === "reject" && (
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleReview(action === "approve" ? "approved" : "rejected")}
              disabled={reviewApplication.isPending}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {reviewApplication.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : action === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
