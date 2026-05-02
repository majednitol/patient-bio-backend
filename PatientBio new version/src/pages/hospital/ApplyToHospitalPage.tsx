import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHospital } from "@/hooks/useHospitals";
import { useApplyToHospital, useMyApplications } from "@/hooks/useDoctorApplications";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { SPECIALTIES } from "@/types/hospital";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Loader2, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function ApplyToHospitalPage() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: hospital, isLoading: hospitalLoading } = useHospital(hospitalId);
  const { data: doctorProfile } = useDoctorProfile();
  const { data: myApplications } = useMyApplications();
  const applyToHospital = useApplyToHospital();

  const [formData, setFormData] = useState({
    full_name: doctorProfile?.full_name || "",
    license_number: doctorProfile?.license_number || "",
    specialty: doctorProfile?.specialty || "",
    qualification: doctorProfile?.qualification || "",
    experience_years: doctorProfile?.experience_years || 0,
    phone: doctorProfile?.phone || "",
    cover_letter: "",
  });

  const existingApplication = myApplications?.find(
    (a) => a.hospital_id === hospitalId
  );

  if (authLoading || hospitalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hospital) {
    return <Navigate to="/hospitals" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await applyToHospital.mutateAsync({
        hospital_id: hospitalId!,
        ...formData,
      });
      navigate("/hospitals");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  if (existingApplication) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/hospitals")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hospitals
          </Button>

          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application Submitted</h2>
              <p className="text-muted-foreground mb-4">
                You've already applied to {hospital.name}.
                <br />
                Current status:{" "}
                <span className="font-medium capitalize">
                  {existingApplication.status}
                </span>
              </p>
              <Button onClick={() => navigate("/hospitals")}>
                View All Hospitals
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/hospitals")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hospitals
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Apply to {hospital.name}</CardTitle>
                <CardDescription>
                  Submit your application to join as a doctor
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Dr. John Doe"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="license_number">Medical License Number</Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    placeholder="MCI/State Medical Council Number"
                  />
                </div>

                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, specialty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    placeholder="e.g., MBBS, MD, DM"
                  />
                </div>

                <div>
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    name="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+880 1XXX XXXXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="cover_letter">Cover Letter</Label>
                  <Textarea
                    id="cover_letter"
                    name="cover_letter"
                    value={formData.cover_letter}
                    onChange={handleChange}
                    placeholder="Why do you want to join this hospital? Share your experience and motivation..."
                    rows={5}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={applyToHospital.isPending || !formData.full_name}
              >
                {applyToHospital.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
