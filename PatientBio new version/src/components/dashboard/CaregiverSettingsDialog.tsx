import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Heart, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { MedicationReminder } from "@/hooks/useMedicationReminders";

interface CaregiverSettingsDialogProps {
  reminder: MedicationReminder;
  trigger?: React.ReactNode;
}

export const CaregiverSettingsDialog = ({
  reminder,
  trigger,
}: CaregiverSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alertAfter, setAlertAfter] = useState("120");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName((reminder as any).caregiver_name || "");
      setPhone((reminder as any).caregiver_phone || "");
      setEmail((reminder as any).caregiver_email || "");
      setAlertAfter(String((reminder as any).caregiver_alert_after_minutes || 120));
    }
  }, [open, reminder]);

  const handleSave = async () => {
    if (!name && !phone && !email) {
      // Clear caregiver
      setLoading(true);
      try {
        const { error } = await supabase
          .from("medication_reminders")
          .update({
            caregiver_name: null,
            caregiver_phone: null,
            caregiver_email: null,
            caregiver_alert_after_minutes: 120,
          })
          .eq("id", reminder.id);

        if (error) throw error;
        toast.success("Caregiver removed");
        queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
        setOpen(false);
      } catch (err: any) {
        toast.error("Failed to update: " + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!name) {
      toast.error("Please enter a caregiver name");
      return;
    }
    if (!phone && !email) {
      toast.error("Please enter a phone number or email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("medication_reminders")
        .update({
          caregiver_name: name,
          caregiver_phone: phone || null,
          caregiver_email: email || null,
          caregiver_alert_after_minutes: parseInt(alertAfter),
        })
        .eq("id", reminder.id);

      if (error) throw error;
      toast.success("Caregiver settings saved! 💚");
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      setOpen(false);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Heart className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Caregiver Alert
          </DialogTitle>
          <DialogDescription>
            Notify a caregiver if you miss <strong>{reminder.medication_name}</strong> for
            too long.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Caregiver Name</Label>
            <Input
              placeholder="e.g. Mom, Spouse, Nurse Jane"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
          </div>
          <div className="space-y-2">
            <Label>Email (optional)</Label>
            <Input
              placeholder="caregiver@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>
          <div className="space-y-2">
            <Label>Alert after missed for</Label>
            <Select value={alertAfter} onValueChange={setAlertAfter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
