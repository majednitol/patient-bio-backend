import React, { useState, useRef, useEffect } from "react";
import {
  usePatientConversations,
  usePatientChat,
  PatientConversation,
} from "@/hooks/usePatientConversations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, ArrowLeft, Search, Inbox } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

const formatMessageTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const ConversationListItem = React.memo(
  ({
    conversation,
    isSelected,
    onClick,
  }: {
    conversation: PatientConversation;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const initials = conversation.doctor_name
      .replace(/^Dr\.\s*/, "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
          isSelected
            ? "bg-primary/10 dark:bg-primary/20"
            : "hover:bg-muted/50"
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={conversation.doctor_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">
              {conversation.doctor_name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatMessageTime(conversation.last_message_at)}
            </span>
          </div>
          {conversation.doctor_specialty && (
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {conversation.doctor_specialty}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">
              {conversation.sender_role === "patient" ? "You: " : ""}
              {conversation.last_message}
            </p>
            {conversation.unread_count > 0 && (
              <Badge className="h-5 min-w-[20px] rounded-full text-[10px] px-1.5 shrink-0">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </button>
    );
  }
);
ConversationListItem.displayName = "ConversationListItem";

const ChatView = ({
  doctorId,
  doctorName,
  onBack,
}: {
  doctorId: string;
  doctorName: string;
  onBack: () => void;
}) => {
  const { data: messages = [], isLoading, sendMessage } = usePatientChat(doctorId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-border/50">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{doctorName}</h3>
          <p className="text-xs text-muted-foreground">Doctor</p>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4" orientation="vertical">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-2/3" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isPatient = msg.sender_role === "patient";
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isPatient ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                      isPatient
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        isPatient ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(msg.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

const PatientMessagesPage = () => {
  const { data: conversations = [], isLoading, totalUnread } = usePatientConversations();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selectedConversation = conversations.find(
    (c) => c.doctor_id === selectedDoctorId
  );

  const filtered = search
    ? conversations.filter((c) =>
        c.doctor_name.toLowerCase().includes(search.toLowerCase()) ||
        c.doctor_specialty?.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      <Card className="h-full flex flex-col lg:flex-row overflow-hidden">
        <div
          className={cn(
            "w-full lg:w-80 xl:w-96 border-r border-border/50 flex flex-col shrink-0",
            selectedDoctorId ? "hidden lg:flex" : "flex"
          )}
        >
          <CardHeader className="p-3 pb-2 space-y-2 shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totalUnread}
                </Badge>
              )}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctors..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-hidden">
            <ScrollArea className="h-full" orientation="vertical">
              {isLoading ? (
                <div className="space-y-2 p-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No matching conversations" : "No conversations yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Messages from your doctors will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((conv) => (
                    <ConversationListItem
                      key={conv.doctor_id}
                      conversation={conv}
                      isSelected={conv.doctor_id === selectedDoctorId}
                      onClick={() => setSelectedDoctorId(conv.doctor_id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </div>

        <div
          className={cn(
            "flex-1 min-w-0",
            !selectedDoctorId ? "hidden lg:flex" : "flex"
          )}
        >
          {selectedDoctorId && selectedConversation ? (
            <ChatView
              doctorId={selectedDoctorId}
              doctorName={selectedConversation.doctor_name}
              onBack={() => setSelectedDoctorId(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Messages</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Select a conversation to view messages and communicate with your doctors.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PatientMessagesPage;
