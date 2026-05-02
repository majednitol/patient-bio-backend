import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStaffDialog({ open, onOpenChange }: AddStaffDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"nurse" | "receptionist" | "assistant">("nurse");
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!fullName || !email) return;

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-staff-account", {
        body: { full_name: fullName, email, phone: phone || undefined, role },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create staff account");
      }

      const result = response.data;
      if (result?.error) {
        throw new Error(result.error);
      }

      queryClient.invalidateQueries({ queryKey: ["doctor-staff"] });
      toast({ title: "Staff account created", description: `${fullName} will receive an email to set their password.` });
      
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("nurse");
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Staff Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email (Login Username) <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!fullName || !email || isCreating}
          >
            {isCreating ? "Creating Account..." : "Create Staff Account"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Staff will receive an email to set their password and log in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
