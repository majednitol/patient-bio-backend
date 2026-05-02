import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { UserPlus, Loader2, Users, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LinkExistingPatientForm } from "./LinkExistingPatientForm";

interface AddFamilyMemberDialogProps {
  trigger?: React.ReactNode;
}

export const AddFamilyMemberDialog = ({ trigger }: AddFamilyMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    display_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    relationship: "",
    can_manage_records: true,
    can_share_data: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.display_name || !formData.relationship) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const familyMemberUserId = crypto.randomUUID();

      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: familyMemberUserId,
          display_name: formData.display_name,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          phone: formData.phone || null,
          is_guest_patient: true,
        });

      if (profileError) throw profileError;

      const { error: familyError } = await supabase
        .from("family_members")
        .insert({
          account_holder_id: user.id,
          patient_id: familyMemberUserId,
          relationship: formData.relationship,
          is_primary: true,
          can_manage_records: formData.can_manage_records,
          can_share_data: formData.can_share_data,
        });

      if (familyError) throw familyError;

      toast.success("Family member added successfully!");
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      setOpen(false);
      setFormData({
        display_name: "",
        date_of_birth: "",
        gender: "",
        phone: "",
        relationship: "",
        can_manage_records: true,
        can_share_data: true,
      });
    } catch (error: any) {
      console.error("Add family member error:", error);
      toast.error(error.message || "Failed to add family member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Add Family Member
          </DialogTitle>
          <DialogDescription>
            Create a new profile or link an existing patient
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Link Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display_name"
                  placeholder="Enter full name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">
                  Relationship <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+880 1XXX-XXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_manage_records"
                    checked={formData.can_manage_records}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_manage_records: checked === true })
                    }
                  />
                  <label htmlFor="can_manage_records" className="text-sm cursor-pointer">
                    Can manage health records
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_share_data"
                    checked={formData.can_share_data}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_share_data: checked === true })
                    }
                  />
                  <label htmlFor="can_share_data" className="text-sm cursor-pointer">
                    Can share data with providers
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <LinkExistingPatientForm onSuccess={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
