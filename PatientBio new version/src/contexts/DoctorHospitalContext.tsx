import { createContext, useContext, useState, ReactNode } from "react";

interface DoctorHospitalContextType {
  selectedHospitalId: string | null;
  setSelectedHospitalId: (id: string | null) => void;
}

export const DoctorHospitalContext = createContext<DoctorHospitalContextType>({
  selectedHospitalId: null,
  setSelectedHospitalId: () => {},
});

export const useDoctorHospitalContext = () => useContext(DoctorHospitalContext);

export function DoctorHospitalProvider({ children }: { children: ReactNode }) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  return (
    <DoctorHospitalContext.Provider value={{ selectedHospitalId, setSelectedHospitalId }}>
      {children}
    </DoctorHospitalContext.Provider>
  );
}
