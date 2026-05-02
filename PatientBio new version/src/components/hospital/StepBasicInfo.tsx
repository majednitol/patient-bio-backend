import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HospitalType } from "@/types/hospital";

const HOSPITAL_TYPES: { value: HospitalType; label: string; description: string }[] = [
  { value: "hospital", label: "Hospital", description: "Multi-specialty healthcare facility" },
  { value: "clinic", label: "Clinic", description: "Outpatient medical services" },
  { value: "diagnostic", label: "Diagnostic Center", description: "Lab tests and imaging services" },
  { value: "pharmacy", label: "Pharmacy", description: "Medication dispensing" },
];

interface StepBasicInfoProps {
  data: {
    name: string;
    type: HospitalType;
    registration_number: string;
  };
  onChange: (data: Partial<StepBasicInfoProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function StepBasicInfo({ data, onChange, errors }: StepBasicInfoProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
        <p className="text-muted-foreground">
          Tell us about your healthcare facility
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Facility Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => handleBlur("name")}
            placeholder="e.g., City General Hospital"
            className={touched.name && errors.name ? "border-destructive" : ""}
          />
          {touched.name && errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Facility Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.type}
            onValueChange={(value) => onChange({ type: value as HospitalType })}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select facility type" />
            </SelectTrigger>
            <SelectContent>
              {HOSPITAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registration_number">
            Registration Number{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="registration_number"
            value={data.registration_number}
            onChange={(e) => onChange({ registration_number: e.target.value })}
            placeholder="Official registration or license ID"
          />
          <p className="text-xs text-muted-foreground">
            Your government-issued facility registration number
          </p>
        </div>
      </div>
    </div>
  );
}
