import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HospitalStaffRole } from "@/types/hospital";

interface StaffInvitation {
  id: string;
  hospital_id: string;
  email: string;
  name: string | null;
  role: string;
  department: string | null;
  employee_id: string | null;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AddStaffParams {
  hospitalId: string;
  email: string;
  name: string;
  role: HospitalStaffRole;
  department?: string;
  departmentId?: string;
  employeeId?: string;
}

// Check if a user exists by email
export const useCheckUserByEmail = () => {
  return useMutation({
    mutationFn: async (email: string): Promise<string | null> => {
      const { data, error } = await supabase
        .rpc('get_user_id_by_email', { p_email: email });
      
      if (error) {
        console.error('Error checking user by email:', error);
        return null;
      }
      
      return data as string | null;
    },
  });
};

// Add an existing user as staff
export const useAddExistingStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      userId,
      role,
      department,
      departmentId,
      employeeId,
    }: {
      hospitalId: string;
      userId: string;
      role: HospitalStaffRole;
      department?: string;
      departmentId?: string;
      employeeId?: string;
    }) => {
      // Check if user is already staff at this hospital
      const { data: existingStaff } = await supabase
        .from("hospital_staff")
        .select("id")
        .eq("hospital_id", hospitalId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (existingStaff) {
        throw new Error("This user is already a staff member at this hospital");
      }

      const { error } = await supabase.from("hospital_staff").insert({
        hospital_id: hospitalId,
        user_id: userId,
        role,
        department,
        department_id: departmentId || null,
        employee_id: employeeId,
      });

      if (error) throw error;

      // Add appropriate role if needed
      if (role === "doctor") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "doctor" });

        if (roleError && !roleError.message.includes("duplicate")) {
          console.error("Error adding doctor role:", roleError);
        }
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-staff", variables.hospitalId],
      });
      toast.success("Staff member added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add staff member");
    },
  });
};

// Generate a secure token
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Create a staff invitation
export const useCreateStaffInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      email,
      name,
      role,
      department,
      employeeId,
    }: AddStaffParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from("staff_invitations")
        .select("id, expires_at")
        .eq("hospital_id", hospitalId)
        .eq("email", email.toLowerCase())
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingInvite) {
        throw new Error("An invitation has already been sent to this email");
      }

      // Generate secure token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create invitation record
      const { data, error } = await supabase
        .from("staff_invitations")
        .insert({
          hospital_id: hospitalId,
          email: email.toLowerCase(),
          name,
          role,
          department,
          employee_id: employeeId,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return data as StaffInvitation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["staff-invitations", variables.hospitalId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hospital-staff", variables.hospitalId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create invitation");
    },
  });
};

// Send invitation email via edge function
export const useSendStaffInvitation = () => {
  const createInvitation = useCreateStaffInvitation();

  return useMutation({
    mutationFn: async (params: AddStaffParams & { hospitalName: string }) => {
      // First create the invitation record
      const invitation = await createInvitation.mutateAsync(params);

      // Then send the email via edge function
      const { error } = await supabase.functions.invoke("send-staff-invitation", {
        body: {
          invitationId: invitation.id,
          email: params.email,
          name: params.name,
          role: params.role,
          hospitalName: params.hospitalName,
          token: invitation.token,
        },
      });

      if (error) {
        console.error("Error sending invitation email:", error);
        // Don't throw - the invitation was created, just email failed
        toast.warning("Invitation created but email could not be sent. Share the link manually.");
        return { invitation, emailSent: false };
      }

      return { invitation, emailSent: true };
    },
    onSuccess: (result) => {
      if (result.emailSent) {
        toast.success("Invitation sent successfully!");
      }
    },
  });
};

// Fetch pending invitations for a hospital
export const useStaffInvitations = (hospitalId: string | undefined) => {
  return useQuery({
    queryKey: ["staff-invitations", hospitalId],
    queryFn: async (): Promise<StaffInvitation[]> => {
      if (!hospitalId) return [];

      const { data, error } = await supabase
        .from("staff_invitations")
        .select("id, hospital_id, email, role, department, invited_by, created_at, accepted_at, token")
        .eq("hospital_id", hospitalId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as StaffInvitation[];
    },
    enabled: !!hospitalId,
  });
};

// Resend an invitation
export const useResendInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      hospitalId,
      hospitalName,
    }: {
      invitationId: string;
      hospitalId: string;
      hospitalName: string;
    }) => {
      // Generate new token and extend expiration
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from("staff_invitations")
        .update({
          token,
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", invitationId)
        .select()
        .single();

      if (error) throw error;

      const invitation = data as StaffInvitation;

      // Send email
      await supabase.functions.invoke("send-staff-invitation", {
        body: {
          invitationId: invitation.id,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          hospitalName,
          token: invitation.token,
        },
      });

      return invitation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["staff-invitations", variables.hospitalId],
      });
      toast.success("Invitation resent!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resend invitation");
    },
  });
};

// Cancel an invitation
export const useCancelInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      hospitalId,
    }: {
      invitationId: string;
      hospitalId: string;
    }) => {
      const { error } = await supabase
        .from("staff_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["staff-invitations", variables.hospitalId],
      });
      toast.success("Invitation cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel invitation");
    },
  });
};

// Verify and accept an invitation by token
export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to accept this invitation");

      // Find the invitation
      const { data: invitation, error: fetchError } = await supabase
        .from("staff_invitations")
        .select("*, hospitals(name)")
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (fetchError || !invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error("This invitation has expired");
      }

      // Check if email matches
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error("This invitation was sent to a different email address");
      }

      // Add user to hospital staff
      const { error: staffError } = await supabase.from("hospital_staff").insert({
        hospital_id: invitation.hospital_id,
        user_id: user.id,
        role: invitation.role,
        department: invitation.department,
        employee_id: invitation.employee_id,
      });

      if (staffError) {
        if (staffError.message.includes("duplicate")) {
          throw new Error("You are already a staff member at this hospital");
        }
        throw staffError;
      }

      // Mark invitation as accepted
      await supabase
        .from("staff_invitations")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invitation.id);

      // Add doctor role if needed
      if (invitation.role === "doctor") {
        await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "doctor" });
      }

      return {
        hospitalId: invitation.hospital_id,
        hospitalName: (invitation.hospitals as { name: string })?.name || "Hospital",
        role: invitation.role,
      };
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Get invitation details by token (for preview before accepting)
export const useInvitationByToken = (token: string | undefined) => {
  return useQuery({
    queryKey: ["staff-invitation", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*, hospitals(name, logo_url)")
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (error) {
        console.error("Error fetching invitation:", error);
        return null;
      }

      return data;
    },
    enabled: !!token,
  });
};
