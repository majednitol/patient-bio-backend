import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Mail, Globe } from "lucide-react";

interface StepContactProps {
  data: {
    phone: string;
    email: string;
    website: string;
  };
  onChange: (data: Partial<StepContactProps["data"]>) => void;
  errors: Record<string, string>;
}

export default function StepContact({ data, onChange, errors }: StepContactProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
        <p className="text-muted-foreground">
          How can patients reach your facility?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              onBlur={() => handleBlur("phone")}
              placeholder="+880 1XXX XXXXXX"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              onBlur={() => handleBlur("email")}
              placeholder="contact@hospital.com"
              className={`pl-10 ${touched.email && errors.email ? "border-destructive" : ""}`}
            />
          </div>
          {touched.email && errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">
            Website{" "}
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="website"
              type="url"
              value={data.website}
              onChange={(e) => onChange({ website: e.target.value })}
              onBlur={() => handleBlur("website")}
              placeholder="https://www.hospital.com"
              className={`pl-10 ${touched.website && errors.website ? "border-destructive" : ""}`}
            />
          </div>
          {touched.website && errors.website && (
            <p className="text-xs text-destructive">{errors.website}</p>
          )}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> You can always add or update contact details later from your hospital dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
