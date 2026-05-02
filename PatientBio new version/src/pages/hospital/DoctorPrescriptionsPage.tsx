import { useOutletContext } from "react-router-dom";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { Hospital } from "@/types/hospital";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill, Search, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface OutletContext {
  hospital: Hospital;
  isAdmin: boolean;
  isDoctor: boolean;
}

export default function DoctorPrescriptionsPage() {
  const { hospital } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { data: prescriptions, isLoading } = useDoctorPrescriptions();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPrescriptions = prescriptions?.filter((rx) => {
    const diagnosis = rx.diagnosis?.toLowerCase() || "";
    const meds = rx.medications.map((m) => m.name.toLowerCase()).join(" ");
    const query = searchQuery.toLowerCase();
    return diagnosis.includes(query) || meds.includes(query);
  });

  if (isLoading) {
    return <PageSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          My Prescriptions
        </h1>
        <p className="text-muted-foreground mt-1">
          All prescriptions you've issued at {hospital.name}
        </p>
      </div>

      {/* Search - sticky on mobile */}
      <div className="sticky top-11 sm:top-auto sm:static z-20 bg-background/95 backdrop-blur-md py-2 sm:py-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by diagnosis or medication..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      {filteredPrescriptions && filteredPrescriptions.length > 0 ? (
        <div className="space-y-2 sm:space-y-4">
          {filteredPrescriptions.map((rx) => (
            <Card key={rx.id} className="rounded-xl active:scale-[0.98] transition-all duration-150">
              <CardContent className="p-3 sm:p-6">
                {/* Mobile: compact header row */}
                <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-lg truncate">
                      {rx.diagnosis || "General Prescription"}
                    </p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="sm:hidden">{format(new Date(rx.created_at), "MMM d, yyyy")}</span>
                      <span className="hidden sm:inline">{format(new Date(rx.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    </p>
                  </div>
                  <Badge variant={rx.is_active ? "default" : "secondary"} className="shrink-0 text-[10px] sm:text-xs">
                    {rx.is_active ? "Active" : "Completed"}
                  </Badge>
                </div>

                {/* Medications - compact on mobile */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                    {rx.medications.length} medication{rx.medications.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid gap-1.5 sm:gap-2 sm:grid-cols-2">
                    {rx.medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="p-2 sm:p-3 rounded-lg bg-muted/50 text-xs sm:text-sm"
                      >
                        <p className="font-medium truncate">{med.name}</p>
                        <p className="text-muted-foreground text-[10px] sm:text-sm">
                          {med.dosage} • {med.frequency}
                          {med.duration && ` • ${med.duration}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions - hidden on mobile unless expanded, shown on desktop */}
                {rx.instructions && (
                  <div className="hidden sm:block mt-3">
                    <h4 className="text-sm font-medium mb-1">Instructions</h4>
                    <p className="text-sm text-muted-foreground">{rx.instructions}</p>
                  </div>
                )}

                {/* Follow-up */}
                {rx.follow_up_date && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm mt-2 sm:mt-3">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span>Follow-up: {format(new Date(rx.follow_up_date), "MMM d, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title="No prescriptions yet"
          description="Prescriptions you create for patients will appear here. Go to 'My Patients' to view patient records and write prescriptions."
          action={{
            label: "View My Patients",
            onClick: () => navigate(`/hospital/${hospital.id}/doctor-patients`),
          }}
        />
      )}
    </div>
  );
}
