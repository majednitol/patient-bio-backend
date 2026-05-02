import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ResearchThreadProps {
  threadId: string;
}

export const ResearchThread = ({ threadId }: ResearchThreadProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_thread_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "researcher_thread_messages", filter: `thread_id=eq.${threadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["thread-messages", threadId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !message.trim()) return;
      const { error } = await supabase.from("researcher_thread_messages").insert({
        thread_id: threadId,
        author_id: user.id,
        content: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", threadId] });
      // Also update thread's updated_at
      supabase.from("researcher_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["researcher-threads"] });
      });
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) sendMessage.mutate();
    }
  };

  const getInitials = (authorId: string) => {
    return authorId === user?.id ? "ME" : authorId.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ScrollArea className="flex-1 px-4 py-3 h-[340px]" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No messages yet. Start the discussion!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg: any) => {
              const isOwn = msg.author_id === user?.id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={isOwn ? "bg-research-primary text-white text-xs" : "bg-muted text-xs"}>
                      {getInitials(msg.author_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                    <div
                      className={`inline-block px-3 py-2 rounded-xl text-sm ${
                        isOwn
                          ? "bg-research-primary text-white rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="resize-none min-h-[40px] max-h-[100px]"
        />
        <Button
          size="icon"
          className="bg-research-primary hover:bg-research-primary/90 flex-shrink-0"
          onClick={() => sendMessage.mutate()}
          disabled={!message.trim() || sendMessage.isPending}
        >
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};
