import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDoctorHospitals, DoctorHospital } from "@/hooks/useDoctorHospitals";
import { useMyApplications } from "@/hooks/useDoctorApplications";
import { Building2, ChevronDown, Check, UserCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { JoinHospitalDialog } from "./JoinHospitalDialog";

interface HospitalSwitcherProps {
  selectedHospitalId: string | null;
  onSelectHospital: (hospitalId: string | null) => void;
  className?: string;
}

export const HospitalSwitcher = ({
  selectedHospitalId,
  onSelectHospital,
  className,
}: HospitalSwitcherProps) => {
  const { data: hospitals = [], isLoading } = useDoctorHospitals();
  const { data: myApplications = [] } = useMyApplications();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId);
  const pendingCount = myApplications.filter((a: any) => a.status === "pending").length;

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Building2 className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            {selectedHospital ? (
              <>
                <Avatar className="h-5 w-5">
                  {selectedHospital.hospital.logo_url ? (
                    <AvatarImage src={selectedHospital.hospital.logo_url} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {selectedHospital.hospital.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[120px] truncate">{selectedHospital.hospital.name}</span>
              </>
            ) : (
              <>
                <UserCircle className="h-4 w-4" />
                <span>Private Practice</span>
              </>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 sm:w-64">
          <DropdownMenuLabel>Work Context</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onSelectHospital(null)}
            className="gap-2"
          >
            <UserCircle className="h-4 w-4" />
            <div className="flex-1">
              <p className="font-medium">Private Practice</p>
              <p className="text-xs text-muted-foreground">Independent consultations</p>
            </div>
            {selectedHospitalId === null && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>

          {hospitals.length > 0 && <DropdownMenuSeparator />}

          {hospitals.map((hosp) => (
            <DropdownMenuItem
              key={hosp.id}
              onClick={() => onSelectHospital(hosp.hospital_id)}
              className="gap-2"
            >
              <Avatar className="h-6 w-6">
                {hosp.hospital.logo_url ? (
                  <AvatarImage src={hosp.hospital.logo_url} />
                ) : null}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {hosp.hospital.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{hosp.hospital.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {hosp.hospital.city && <span>{hosp.hospital.city}</span>}
                  {hosp.department && (
                    <>
                      <span>•</span>
                      <span>{hosp.department}</span>
                    </>
                  )}
                </div>
              </div>
              {selectedHospitalId === hosp.hospital_id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setJoinDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="flex-1 font-medium">Join a Hospital</span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 min-w-[20px] px-1.5">
                {pendingCount}
              </Badge>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JoinHospitalDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} />
    </>
  );
};
