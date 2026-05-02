import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FlaskConical } from "lucide-react";

const ResearcherOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { createProfile, isCreating } = useResearcherProfile();

  const [formData, setFormData] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    institution_name: "",
    institution_type: "",
    department: "",
    research_focus: "",
    license_number: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/researcher/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createProfile(formData, {
      onSuccess: () => {
        navigate("/researcher");
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FlaskConical className="h-8 w-8 text-orange-600" />
            <CardTitle className="text-2xl">Complete Your Research Profile</CardTitle>
          </div>
          <CardDescription>
            Set up your researcher profile to receive doctor-referred data for research
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Dr. Fatema Akter"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="researcher@institution.edu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_number">Research License / ID</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="RES-2024-XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution_name">Institution Name *</Label>
                <Input
                  id="institution_name"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  placeholder="University Medical Research Center"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution_type">Institution Type</Label>
                <Select
                  value={formData.institution_type}
                  onValueChange={(value) => setFormData({ ...formData, institution_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="hospital">Hospital Research Wing</SelectItem>
                    <SelectItem value="private_lab">Private Research Lab</SelectItem>
                    <SelectItem value="government">Government Institute</SelectItem>
                    <SelectItem value="pharmaceutical">Pharmaceutical Company</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Clinical Research Division"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="research_focus">Research Focus / Areas of Interest</Label>
              <Textarea
                id="research_focus"
                value={formData.research_focus}
                onChange={(e) => setFormData({ ...formData, research_focus: e.target.value })}
                placeholder="Describe your primary research areas, e.g., oncology, cardiovascular diseases, rare genetic disorders..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearcherOnboardingPage;
