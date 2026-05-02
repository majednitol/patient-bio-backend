import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export function usePatientCheckIn() {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      setShowSuccess(true);
      toast({
        title: "Checked In! ✅",
        description: "Your doctor has been notified that you've arrived.",
      });
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { ...mutation, showSuccess };
}
