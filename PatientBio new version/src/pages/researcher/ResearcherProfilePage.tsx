import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { VerificationStatusCard } from "@/components/provider/VerificationStatusCard";
import { SingleDomainSelector } from "@/components/researcher/DomainSelector";
import { ResearcherAvatarUpload } from "@/components/researcher/ResearcherAvatarUpload";

const ResearcherProfilePage = () => {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating, isLoading } = useResearcherProfile();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    institution_name: profile?.institution_name || "",
    institution_type: profile?.institution_type || "",
    department: profile?.department || "",
    research_focus: profile?.research_focus || "",
    license_number: profile?.license_number || "",
    primary_domain: profile?.primary_domain || null as string | null,
  });

  // Update form when profile loads
  useState(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        institution_name: profile.institution_name || "",
        institution_type: profile.institution_type || "",
        department: profile.department || "",
        research_focus: profile.research_focus || "",
        license_number: profile.license_number || "",
        primary_domain: profile.primary_domain || null,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your researcher profile information</p>
      </div>

      <VerificationStatusCard providerType="researcher" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {user?.id && (
              <ResearcherAvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                fullName={profile?.full_name || null}
                onUploadComplete={(url) => updateProfile({ avatar_url: url })}
              />
            )}
            <div>
              <CardTitle>{profile?.full_name}</CardTitle>
              <CardDescription>
                {profile?.institution_name} • {profile?.is_verified ? "Verified" : "Pending Verification"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_number">Research License / ID</Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution_name">Institution Name</Label>
                <Input
                  id="institution_name"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Primary Research Domain</Label>
              <SingleDomainSelector
                value={formData.primary_domain}
                onChange={(domain) => setFormData({ ...formData, primary_domain: domain })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research_focus">Research Focus</Label>
              <Textarea
                id="research_focus"
                value={formData.research_focus}
                onChange={(e) => setFormData({ ...formData, research_focus: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearcherProfilePage;
