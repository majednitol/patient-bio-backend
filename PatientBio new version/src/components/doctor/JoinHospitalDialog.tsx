import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHospitalSearch } from "@/hooks/useHospitalSearch";
import { useMyApplications, useApplyToHospital } from "@/hooks/useDoctorApplications";
import { useDoctorHospitals } from "@/hooks/useDoctorHospitals";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { Search, Building2, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface JoinHospitalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinHospitalDialog = ({ open, onOpenChange }: JoinHospitalDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const { data: results = [], isLoading: searching } = useHospitalSearch(searchQuery);
  const { data: myApplications = [] } = useMyApplications();
  const { data: myHospitals = [] } = useDoctorHospitals();
  const { data: doctorProfile } = useDoctorProfile();
  const applyMutation = useApplyToHospital();

  const getHospitalStatus = (hospitalId: string) => {
    if (myHospitals.some((h) => h.hospital_id === hospitalId)) return "member";
    const app = myApplications.find((a: any) => a.hospital_id === hospitalId);
    if (app) return (app as any).status as string;
    return null;
  };

  const handleApply = (hospitalId: string) => {
    if (!doctorProfile) return;
    applyMutation.mutate(
      {
        hospital_id: hospitalId,
        full_name: doctorProfile.full_name,
        specialty: specialty || doctorProfile.specialty || null,
        cover_letter: coverLetter || null,
        license_number: doctorProfile.license_number || null,
        qualification: doctorProfile.qualification || null,
        experience_years: doctorProfile.experience_years || null,
        phone: doctorProfile.phone || null,
      },
      {
        onSuccess: () => {
          setApplyingTo(null);
          setSpecialty("");
          setCoverLetter("");
        },
      }
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "member":
        return <Badge variant="outline" className="text-primary border-primary/30"><CheckCircle2 className="h-3 w-3 mr-1" />Member</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Join a Hospital
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="search" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1">Search Hospitals</TabsTrigger>
            <TabsTrigger value="applications" className="flex-1">
              My Applications
              {myApplications.filter((a: any) => a.status === "pending").length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1 text-xs">
                  {myApplications.filter((a: any) => a.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-2 pr-3">
                {searching && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Searching...
                  </div>
                )}

                {!searching && results.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No hospitals found" : "Type to search for hospitals"}
                  </p>
                )}

                {results.map((hospital) => {
                  const status = getHospitalStatus(hospital.id);
                  const isApplying = applyingTo === hospital.id;

                  return (
                    <div key={hospital.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {hospital.logo_url ? <AvatarImage src={hospital.logo_url} /> : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {hospital.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{hospital.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {hospital.city && <span>{hospital.city}</span>}
                            {hospital.type && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{hospital.type}</span>
                              </>
                            )}
                          </div>
                          {hospital.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {hospital.description}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {status ? (
                            statusBadge(status)
                          ) : (
                            <Button
                              size="sm"
                              variant={isApplying ? "secondary" : "default"}
                              onClick={() => setApplyingTo(isApplying ? null : hospital.id)}
                            >
                              {isApplying ? "Cancel" : "Request to Join"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isApplying && (
                        <div className="border-t pt-2 space-y-2">
                          <Input
                            placeholder="Specialty (e.g., Cardiology)"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                          />
                          <Textarea
                            placeholder="Brief cover letter (optional)"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={3}
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleApply(hospital.id)}
                            disabled={applyMutation.isPending}
                          >
                            {applyMutation.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                            ) : (
                              "Submit Application"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="applications" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 pr-3">
                {myApplications.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No applications yet
                  </p>
                )}

                {myApplications.map((app: any) => (
                  <div key={app.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {app.hospital?.logo_url ? <AvatarImage src={app.hospital.logo_url} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {app.hospital?.name?.[0] || "H"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{app.hospital?.name || "Hospital"}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.specialty && <span>{app.specialty} • </span>}
                          {format(new Date(app.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {statusBadge(app.status)}
                    </div>
                    {app.status === "rejected" && app.rejection_reason && (
                      <p className="text-xs text-destructive mt-2 bg-destructive/5 rounded p-2">
                        Reason: {app.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
