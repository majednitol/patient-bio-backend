import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepLocationProps {
  data: {
    city: string;
    state: string;
    address: string;
    country: string;
  };
  onChange: (data: Partial<StepLocationProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function StepLocation({ data, onChange, errors }: StepLocationProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Location Details</h2>
        <p className="text-muted-foreground">
          Where is your facility located?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={() => handleBlur("city")}
            placeholder="e.g., Dhaka"
            className={touched.city && errors.city ? "border-destructive" : ""}
          />
          {touched.city && errors.city && (
            <p className="text-xs text-destructive">{errors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">
            State{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="state"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="e.g., Dhaka Division"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">
            Street Address{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="123 Main Street, Area Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">
            Country{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="country"
            value={data.country}
            onChange={(e) => onChange({ country: e.target.value })}
            placeholder="Bangladesh"
          />
        </div>
      </div>
    </div>
  );
}
