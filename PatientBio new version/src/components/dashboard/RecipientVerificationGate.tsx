import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, User, Building2, Loader2 } from "lucide-react";

interface RecipientVerificationGateProps {
  onVerified: (name: string, org: string, role: string) => void;
  isVerifying?: boolean;
}

const ROLE_OPTIONS = [
  { value: "doctor", label: "Doctor / Physician" },
  { value: "nurse", label: "Nurse" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "insurance_agent", label: "Insurance Agent" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "hospital_admin", label: "Hospital Administrator" },
  { value: "government_official", label: "Government Official" },
  { value: "researcher", label: "Researcher" },
  { value: "other", label: "Other" },
];

const RecipientVerificationGate = ({ onVerified, isVerifying }: RecipientVerificationGateProps) => {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && org.trim() && role) {
      onVerified(name.trim(), org.trim(), role);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Verify Your Identity</CardTitle>
          <CardDescription>
            The patient requires identity verification before sharing their health data. Please provide your details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="v-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />Full Name
              </Label>
              <Input
                id="v-name"
                placeholder="e.g., Dr. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-org" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />Organization
              </Label>
              <Input
                id="v-org"
                placeholder="e.g., City General Hospital"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select your role..." /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your identity will be recorded and shared with the patient for transparency.
            </p>

            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || !org.trim() || !role || isVerifying}
            >
              {isVerifying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
              ) : (
                "Continue to View Records"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipientVerificationGate;
