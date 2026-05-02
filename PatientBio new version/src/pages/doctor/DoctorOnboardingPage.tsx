import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateDoctorProfile } from "@/hooks/useDoctorProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SPECIALTIES } from "@/types/hospital";
import { Stethoscope, Loader2 } from "lucide-react";

const DoctorOnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProfile = useCreateDoctorProfile();

  const [formData, setFormData] = useState({
    full_name: "",
    license_number: "",
    specialty: "",
    qualification: "",
    experience_years: "",
    consultation_fee: "",
    phone: "",
    bio: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate("/doctors/login");
      return;
    }

    await createProfile.mutateAsync({
      full_name: formData.full_name,
      license_number: formData.license_number || null,
      specialty: formData.specialty || null,
      qualification: formData.qualification || null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
      phone: formData.phone || null,
      bio: formData.bio || null,
      avatar_url: null,
      practice_type: 'private',
      diseases_treated: null,
      follow_up_fee: null,
      follow_up_window_days: 14,
      languages_spoken: null,
    });

    navigate("/doctor", { replace: true });
  };

  useEffect(() => {
    if (!user) {
      navigate("/doctors/login");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-3 sm:p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Complete Your Profile</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Set up your professional profile to start using the Doctor Portal
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  placeholder="Dr. Majedur Rahman"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">BMDC / License Number</Label>
                <Input
                  id="license_number"
                  placeholder="A-12345"
                  value={formData.license_number}
                  onChange={(e) => handleChange("license_number", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Select
                  value={formData.specialty}
                  onValueChange={(value) => handleChange("specialty", value)}
                >
                  <SelectTrigger id="specialty">
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

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="MBBS, MD"
                  value={formData.qualification}
                  onChange={(e) => handleChange("qualification", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_years">Years of Experience</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="70"
                  placeholder="5"
                  value={formData.experience_years}
                  onChange={(e) => handleChange("experience_years", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultation_fee">Consultation Fee (৳)</Label>
                <Input
                  id="consultation_fee"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={formData.consultation_fee}
                  onChange={(e) => handleChange("consultation_fee", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+880 1XXXXXXXXX"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio / About</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell patients about yourself, your experience, and expertise..."
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createProfile.isPending || !formData.full_name}
            >
              {createProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorOnboardingPage;
