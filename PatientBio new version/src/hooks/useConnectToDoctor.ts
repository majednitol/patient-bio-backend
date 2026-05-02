import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Doctor {
  id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
}

interface ConnectResult {
  success: boolean;
  doctor: Doctor;
}

export const useConnectToDoctor = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewDoctor, setPreviewDoctor] = useState<Doctor | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: async (doctorCode: string): Promise<ConnectResult> => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("connect-to-doctor", {
        body: { doctor_code: doctorCode },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorData = await error.context.json();
          throw new Error(errorData.error || "Failed to connect to doctor");
        }
        throw new Error(error.message || "Failed to connect to doctor");
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to connect to doctor");
      }

      return data as ConnectResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patient-doctor-access", user?.id] });
      toast.success(`Connected with Dr. ${data.doctor.full_name}`);
      setPreviewDoctor(null);
      setPreviewError(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const lookupDoctor = async (doctorCode: string) => {
    setPreviewError(null);
    setPreviewDoctor(null);

    if (!doctorCode || doctorCode.length < 8) {
      setPreviewError("Please enter a valid 8-character Doctor ID");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("connect-to-doctor", {
        body: { doctor_code: doctorCode },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const errorData = await error.context.json();
          if (errorData.doctor) {
            setPreviewDoctor(errorData.doctor);
          }
          setPreviewError(errorData.error || "Failed to lookup doctor");
        } else {
          setPreviewError(error.message || "Failed to lookup doctor");
        }
        return;
      }

      // If success, the connection was already made
      if (data.success && data.doctor) {
        queryClient.invalidateQueries({ queryKey: ["patient-doctor-access", user?.id] });
        toast.success(`Connected with Dr. ${data.doctor.full_name}`);
        setPreviewDoctor(null);
        return;
      }
    } catch (err) {
      setPreviewError("An unexpected error occurred");
    }
  };

  const resetPreview = () => {
    setPreviewDoctor(null);
    setPreviewError(null);
  };

  return {
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    lookupDoctor,
    previewDoctor,
    previewError,
    resetPreview,
  };
};
