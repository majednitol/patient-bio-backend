import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { AvailabilityEditor } from "@/components/appointments/AvailabilityEditor";
import { TimeOffManager } from "@/components/appointments/TimeOffManager";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
  isDoctor: boolean;
}

export default function DoctorAvailabilityPage() {
  const { hospital, isDoctor } = useOutletContext<HospitalContext>();

  if (!isDoctor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Only doctors can manage availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Availability</h1>
        <p className="text-muted-foreground">
          Set your working hours and time off at {hospital.name}
        </p>
      </div>

      <AvailabilityEditor hospitalId={hospital.id} />
      <TimeOffManager hospitalId={hospital.id} />
    </div>
  );
}
