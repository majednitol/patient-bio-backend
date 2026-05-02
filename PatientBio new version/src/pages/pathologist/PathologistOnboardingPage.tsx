import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Microscope, Loader2, CheckCircle, Heart, Shield, Sparkles } from "lucide-react";

const specializations = [
  "Clinical Pathology",
  "Anatomic Pathology",
  "Hematology",
  "Microbiology",
  "Immunology",
  "Molecular Pathology",
  "Cytopathology",
  "Dermatopathology",
  "Forensic Pathology",
  "Other",
];

const PathologistOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, createProfile, isCreating } = usePathologistProfile();

  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    specialization_area: "",
    total_experience: "",
    phone: "",
    lab_name: "",
    lab_address: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/pathologist/login");
    }
    if (!profileLoading && profile) {
      navigate("/pathologist");
    }
  }, [user, authLoading, profile, profileLoading, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProfile({
      full_name: formData.full_name,
      license_number: formData.license_number || null,
      specialization_area: formData.specialization_area || null,
      total_experience: formData.total_experience ? parseInt(formData.total_experience) : null,
      phone: formData.phone || null,
      lab_name: formData.lab_name || null,
      lab_address: formData.lab_address || null,
    }, {
      onSuccess: () => navigate("/pathologist"),
    });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-teal-50 via-background to-cyan-50 dark:from-teal-950/20 dark:via-background dark:to-cyan-950/20">
        <div className="p-4 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white animate-pulse" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--diagnostic-primary))]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-background to-cyan-50 dark:from-teal-950/20 dark:via-background dark:to-cyan-950/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-2xl diagnostic-gradient flex items-center justify-center mb-4 shadow-lg">
            <Microscope className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to the Team</h1>
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <Heart className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            Let's set up your diagnostic center profile
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[hsl(var(--diagnostic-primary)/0.1)]">
            <Shield className="h-6 w-6 mx-auto mb-2 text-[hsl(var(--diagnostic-primary))]" />
            <p className="text-sm font-medium">Secure Platform</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[hsl(var(--diagnostic-primary)/0.1)]">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-[hsl(var(--diagnostic-secondary))]" />
            <p className="text-sm font-medium">Easy Reports</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-[hsl(var(--diagnostic-primary)/0.1)]">
            <Heart className="h-6 w-6 mx-auto mb-2 text-[hsl(var(--diagnostic-accent))]" />
            <p className="text-sm font-medium">Patient Care</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>
              This helps doctors and patients trust your expertise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name <span className="text-[hsl(var(--diagnostic-primary))]">*</span></Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. John Doe"
                    required
                    className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="PATH-12345"
                    className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select
                    value={formData.specialization_area}
                    onValueChange={(value) => setFormData({ ...formData, specialization_area: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.total_experience}
                    onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                    placeholder="10"
                    className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lab_name">Lab/Center Name</Label>
                  <Input
                    id="lab_name"
                    value={formData.lab_name}
                    onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                    placeholder="City Diagnostic Center"
                    className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_address">Lab Address</Label>
                <Textarea
                  id="lab_address"
                  value={formData.lab_address}
                  onChange={(e) => setFormData({ ...formData, lab_address: e.target.value })}
                  placeholder="123 Medical Street, City, State, ZIP"
                  rows={3}
                  className="focus-visible:ring-[hsl(var(--diagnostic-primary))]"
                />
              </div>

              <div className="bg-[hsl(var(--diagnostic-primary)/0.08)] rounded-xl p-4 flex items-start gap-3 border border-[hsl(var(--diagnostic-primary)/0.15)]">
                <CheckCircle className="h-5 w-5 text-[hsl(var(--diagnostic-primary))] mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Your profile will be reviewed
                  </p>
                  <p className="text-muted-foreground">
                    Once verified, you'll be able to receive patient data from doctors and share reports.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full diagnostic-gradient text-white hover:opacity-90 h-12"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up your profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Complete Setup & Get Started
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PathologistOnboardingPage;
