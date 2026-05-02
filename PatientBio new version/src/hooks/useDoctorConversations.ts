import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface Conversation {
  patient_id: string;
  patient_name: string;
  patient_avatar: string | null;
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

export function useDoctorConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["doctor-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all messages for the doctor
      const { data: messages, error } = await supabase
        .from("doctor_patient_messages")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!messages?.length) return [];

      // Group by patient_id
      const patientMap = new Map<string, {
        messages: typeof messages;
        unread: number;
      }>();

      for (const msg of messages) {
        if (!patientMap.has(msg.patient_id)) {
          patientMap.set(msg.patient_id, { messages: [], unread: 0 });
        }
        const entry = patientMap.get(msg.patient_id)!;
        entry.messages.push(msg);
        if (!msg.is_read && msg.sender_role === "patient") {
          entry.unread++;
        }
      }

      // Get patient profiles
      const patientIds = Array.from(patientMap.keys());
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", patientIds);

      const conversations: Conversation[] = patientIds.map((patientId) => {
        const entry = patientMap.get(patientId)!;
        const latest = entry.messages[0];
        const profile = profiles?.find((p) => p.user_id === patientId);

        return {
          patient_id: patientId,
          patient_name: profile?.display_name || "Unknown Patient",
          patient_avatar: profile?.avatar_url || null,
          last_message: latest.message_text,
          last_message_at: latest.created_at,
          sender_role: latest.sender_role as "doctor" | "patient",
          unread_count: entry.unread,
        };
      });

      // Sort by most recent message
      conversations.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      return conversations;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.REALTIME,
  });

  const totalUnread = conversationsQuery.data?.reduce((sum, c) => sum + c.unread_count, 0) ?? 0;

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("doctor-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctor_patient_messages",
          filter: `doctor_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["doctor-conversations", user.id] });
          queryClient.invalidateQueries({ queryKey: ["doctor-chat"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return { ...conversationsQuery, totalUnread };
}

export function useDoctorChat(patientId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["doctor-chat", user?.id, patientId],
    queryFn: async () => {
      if (!user?.id || !patientId) return [];

      const { data, error } = await supabase
        .from("doctor_patient_messages")
        .select("*")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark unread patient messages as read
      const unreadIds = (data || [])
        .filter((m) => m.sender_role === "patient" && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("doctor_patient_messages")
          .update({ is_read: true })
          .in("id", unreadIds);

        queryClient.invalidateQueries({ queryKey: ["doctor-conversations", user.id] });
      }

      return (data || []) as Message[];
    },
    enabled: !!user?.id && !!patientId,
    staleTime: 10_000,
  });

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id || !patientId) throw new Error("Missing IDs");

      const { error } = await supabase.from("doctor_patient_messages").insert({
        doctor_id: user.id,
        patient_id: patientId,
        sender_role: "doctor",
        message_text: text,
      });

      if (error) throw error;

      // Fire-and-forget push notification to patient
      supabase.functions.invoke("notify-message-push", {
        body: {
          recipient_id: patientId,
          sender_name: user.user_metadata?.full_name || user.user_metadata?.name || "your doctor",
          sender_role: "doctor",
          message_preview: text,
        },
      }).catch((err) => console.warn("Push notification failed:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-chat", user?.id, patientId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-conversations", user?.id] });
    },
  });

  return { ...messagesQuery, sendMessage };
}
