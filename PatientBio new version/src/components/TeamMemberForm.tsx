import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Loader2 } from "lucide-react";
import { TeamMember, TeamMemberInsert, uploadProfileImage } from "@/hooks/useTeamMembers";

interface TeamMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember | null;
  onSubmit: (data: TeamMemberInsert, imageFile?: File) => Promise<void>;
  isLoading?: boolean;
}

const gradientOptions = [
  { value: "from-primary to-secondary", label: "Primary to Secondary" },
  { value: "from-secondary to-accent", label: "Secondary to Accent" },
  { value: "from-accent to-primary", label: "Accent to Primary" },
  { value: "from-primary to-accent", label: "Primary to Accent" },
  { value: "from-blue-500 to-purple-600", label: "Blue to Purple" },
  { value: "from-green-500 to-teal-500", label: "Green to Teal" },
];

const TeamMemberForm = ({ open, onOpenChange, member, onSubmit, isLoading }: TeamMemberFormProps) => {
  const [formData, setFormData] = useState<Partial<TeamMemberInsert>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form data whenever the dialog opens or the member changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: member?.name || "",
        role: member?.role || "",
        bio: member?.bio || "",
        linkedin_url: member?.linkedin_url || "",
        twitter_url: member?.twitter_url || "",
        email: member?.email || "",
        github_url: member?.github_url || "",
        website_url: member?.website_url || "",
        phone: member?.phone || "",
        is_advisor: member?.is_advisor || false,
        display_order: member?.display_order || 0,
        gradient: member?.gradient || "from-primary to-secondary",
        profile_image_url: member?.profile_image_url || "",
      });
      setImageFile(null);
      setImagePreview(member?.profile_image_url || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open, member]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, profile_image_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData as TeamMemberInsert, imageFile || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Image Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${formData.gradient} flex items-center justify-center text-white text-xl font-bold`}
                >
                  {formData.name
                    ? formData.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "?"}
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profile-image"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Majedur Rahman"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role / Title *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
              required
              placeholder="CEO & Co-Founder"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          {/* Social Links Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.linkedin_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">X (Twitter) URL</Label>
              <Input
                id="twitter"
                type="url"
                value={formData.twitter_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, twitter_url: e.target.value }))}
                placeholder="https://x.com/..."
              />
            </div>
          </div>

          {/* Social Links Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="github">GitHub URL</Label>
              <Input
                id="github"
                type="url"
                value={formData.github_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, github_url: e.target.value }))}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Personal Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
          </div>

          {/* Display Order & Gradient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Fallback Gradient</Label>
              <Select
                value={formData.gradient || "from-primary to-secondary"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, gradient: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded bg-gradient-to-r ${option.value}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Is Advisor Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Advisory Board Member</Label>
              <p className="text-xs text-muted-foreground">Toggle if this person is an advisor, not core team</p>
            </div>
            <Switch
              checked={formData.is_advisor}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_advisor: checked }))}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {member ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberForm;
