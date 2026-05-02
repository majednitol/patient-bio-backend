import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const ResearchFeedbackCard = () => {
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['researcher-thank-you', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('researcher_thank_you_messages' as any)
        .select('id, message_template, custom_text, study_area, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as Array<{
        id: string;
        message_template: string;
        custom_text: string | null;
        study_area: string | null;
        created_at: string;
      }>;
    },
    enabled: !!user?.id,
  });

  if (isLoading || messages.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Heart className="h-4 w-4 text-destructive" />
          Research Feedback
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Anonymous thank-you messages from researchers who used your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{msg.message_template}</p>
                {msg.custom_text && (
                  <p className="text-xs text-muted-foreground italic mt-1">"{msg.custom_text}"</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pl-6">
              {msg.study_area && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {msg.study_area}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
