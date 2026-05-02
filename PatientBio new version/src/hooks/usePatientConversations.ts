import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { formatDoctorName } from "@/utils/formatDoctorName";

export interface PatientConversation {
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string | null;
  doctor_avatar: string | null;
  last_message: string;
  last_message_at: string;
  sender_role: "doctor" | "patient";
  unread_count: number;
}

export interface Message {
  id: string;
  doctor_id: string;
  patient_id: string;
  sender_role: "doctor" | "patient";
  message_text: string;
  is_read: boolean;
  created_at: string;
}

export function usePatientConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["patient-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: messages, error } = await supabase
        .from("doctor_patient_messages")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages?.length) return [];

      const doctorMap = new Map<string, { messages: typeof messages; unread: number }>();

      for (const msg of messages) {
        if (!doctorMap.has(msg.doctor_id)) {
          doctorMap.set(msg.doctor_id, { messages: [], unread: 0 });
        }
        const entry = doctorMap.get(msg.doctor_id)!;
        entry.messages.push(msg);
        if (!msg.is_read && msg.sender_role === "doctor") {
          entry.unread++;
        }
      }

      const doctorIds = Array.from(doctorMap.keys());
      const { data: profiles } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, avatar_url")
        .in("user_id", doctorIds);

      const conversations: PatientConversation[] = doctorIds.map((doctorId) => {
        const entry = doctorMap.get(doctorId)!;
        const latest = entry.messages[0];
        const profile = profiles?.find((p) => p.user_id === doctorId);

        return {
          doctor_id: doctorId,
          doctor_name: formatDoctorName(profile?.full_name),
          doctor_specialty: profile?.specialty || null,
          doctor_avatar: profile?.avatar_url || null,
          last_message: latest.message_text,
          last_message_at: latest.created_at,
          sender_role: latest.sender_role as "doctor" | "patient",
          unread_count: entry.unread,
        };
      });

      conversations.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      return conversations;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.REALTIME,
  });

  const totalUnread = conversationsQuery.data?.reduce((sum, c) => sum + c.unread_count, 0) ?? 0;

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("patient-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctor_patient_messages",
          filter: `patient_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patient-conversations", user.id] });
          queryClient.invalidateQueries({ queryKey: ["patient-chat"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return { ...conversationsQuery, totalUnread };
}

export function usePatientChat(doctorId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["patient-chat", user?.id, doctorId],
    queryFn: async () => {
      if (!user?.id || !doctorId) return [];

      const { data, error } = await supabase
        .from("doctor_patient_messages")
        .select("*")
        .eq("patient_id", user.id)
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark unread doctor messages as read
      const unreadIds = (data || [])
        .filter((m) => m.sender_role === "doctor" && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("doctor_patient_messages")
          .update({ is_read: true })
          .in("id", unreadIds);

        queryClient.invalidateQueries({ queryKey: ["patient-conversations", user.id] });
      }

      return (data || []) as Message[];
    },
    enabled: !!user?.id && !!doctorId,
    staleTime: 10_000,
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id || !doctorId) throw new Error("Missing IDs");

      const { error } = await supabase.from("doctor_patient_messages").insert({
        doctor_id: doctorId,
        patient_id: user.id,
        sender_role: "patient",
        message_text: text,
      });

      if (error) throw error;

      // Fire-and-forget push notification to doctor
      supabase.functions.invoke("notify-message-push", {
        body: {
          recipient_id: doctorId,
          sender_name: user.user_metadata?.full_name || user.user_metadata?.name || "your patient",
          sender_role: "patient",
          message_preview: text,
        },
      }).catch((err) => console.warn("Push notification failed:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-chat", user?.id, doctorId] });
      queryClient.invalidateQueries({ queryKey: ["patient-conversations", user?.id] });
    },
  });

  return { ...messagesQuery, sendMessage };
}
