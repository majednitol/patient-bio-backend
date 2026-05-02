import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Upload, XCircle, RefreshCw, Shield, Edit, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

const EVENT_CONFIG: Record<string, { icon: typeof Upload; color: string; label: string }> = {
  DATA_CONTRIBUTED: { icon: Upload, color: "text-accent", label: "Data Contributed" },
  DATA_WITHDRAWN: { icon: XCircle, color: "text-destructive", label: "Data Withdrawn" },
  CATEGORIES_UPDATED: { icon: Edit, color: "text-primary", label: "Categories Updated" },
  AUTO_RENEW_TOGGLED: { icon: RefreshCw, color: "text-primary", label: "Auto-Renew Changed" },
  GOVT_REFERENCE_UPDATED: { icon: Shield, color: "text-muted-foreground", label: "Govt Ref Updated" },
};

export const ContributionActivityTimeline = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['contribution-timeline', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('id, event_type, action, details, created_at')
        .eq('entity_type', 'anonymous_contribution')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (events.length === 0 && !isLoading) return null;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2 sm:pb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Activity Timeline
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {events.map((event, i) => {
                  const config = EVENT_CONFIG[event.event_type] || { icon: Shield, color: "text-muted-foreground", label: event.event_type };
                  const Icon = config.icon;
                  const details = event.details as Record<string, unknown> | null;
                  return (
                    <div key={event.id} className="relative flex items-start gap-3 py-2">
                      <div className={`relative z-10 p-1 rounded-full bg-card border border-border ${config.color}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{config.label}</p>
                        {details && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {details.data_categories
                              ? `Categories: ${(details.data_categories as string[]).join(', ')}`
                              : details.remaining_categories
                              ? `Remaining: ${(details.remaining_categories as string[]).join(', ')}`
                              : details.auto_renew !== undefined
                              ? `Auto-renew: ${details.auto_renew ? 'On' : 'Off'}`
                              : event.action}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(event.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
