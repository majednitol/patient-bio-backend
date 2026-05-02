import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { getCachedNotifications } from "@/lib/offlineDB";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("id, user_id, type, title, message, is_read, metadata, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as Notification[];
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedNotifications(user.id);
          if (cached.length > 0) {
            return cached.map(c => ({
              id: c.id,
              user_id: c.userId,
              type: c.type,
              title: c.title,
              message: c.message,
              is_read: c.isRead,
              metadata: null,
              created_at: c.createdAt,
            })) as Notification[];
          }
        }
        console.error("Error fetching notifications:", err);
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.REALTIME,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Show toast for new notification
          toast({
            title: newNotification.title,
            description: newNotification.message || undefined,
          });

          // Update cache with new notification
          queryClient.setQueryData<Notification[]>(
            ["notifications", user.id],
            (old = []) => [newNotification, ...old].slice(0, 50)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          queryClient.setQueryData<Notification[]>(
            ["notifications", user.id],
            (old = []) =>
              old.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          queryClient.setQueryData<Notification[]>(
            ["notifications", user.id],
            (old = []) => old.filter((n) => n.id !== deleted.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old = []) => old.map((n) => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      }
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old = []) => old.map((n) => ({ ...n, is_read: true }))
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      }
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", user?.id]);
      
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id],
        (old = []) => old.filter((n) => n.id !== notificationId)
      );
      
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications", user?.id], context.previous);
      }
    },
  });

  const createNotification = useMutation({
    mutationFn: async (notification: {
      user_id: string;
      type: string;
      title: string;
      message?: string;
      metadata?: Json;
    }) => {
      const { error } = await supabase.from("notifications").insert([{
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message ?? null,
        metadata: notification.metadata ?? null,
      }]);

      if (error) throw error;
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    createNotification: createNotification.mutateAsync,
  };
};
