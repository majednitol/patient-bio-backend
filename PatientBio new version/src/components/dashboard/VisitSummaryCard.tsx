import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePatientVisitSummaries } from "@/hooks/useVisitSummary";
import { FileText, Stethoscope, Pill, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export function VisitSummaryCard() {
  const { t } = useTranslation();
  const { data: summaries = [], isLoading } = usePatientVisitSummaries();
  const [openId, setOpenId] = useState<string | null>(null);

  if (isLoading || summaries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-1.5 sm:gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          <span className="truncate">{t("visitSummary.recentVisitSummaries")}</span>
          <Badge variant="secondary" className="ml-1 flex-shrink-0">
            {summaries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summaries.slice(0, 5).map((summary) => {
          const isOpen = openId === summary.id;
          return (
            <Collapsible.Root
              key={summary.id}
              open={isOpen}
              onOpenChange={(o) => setOpenId(o ? summary.id : null)}
            >
              <Collapsible.Trigger asChild>
                <button className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Stethoscope className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {summary.diagnosis || t("visitSummary.visitSummary")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(summary.created_at), "MMM d, yyyy")}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>
              </Collapsible.Trigger>
              <Collapsible.Content>
                <div className="p-3 border border-t-0 rounded-b-lg space-y-3 bg-muted/20">
                  <p className="text-sm leading-relaxed">
                    {summary.summary_text}
                  </p>
                  {summary.medications_summary && (
                    <div className="flex gap-2 items-start">
                      <Pill className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("visitSummary.medications")}
                        </p>
                        <p className="text-sm">{summary.medications_summary}</p>
                      </div>
                    </div>
                  )}
                  {summary.follow_up_instructions && (
                    <div className="flex gap-2 items-start">
                      <CalendarCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("visitSummary.followUp")}
                        </p>
                        <p className="text-sm">
                          {summary.follow_up_instructions}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Collapsible.Content>
            </Collapsible.Root>
          );
        })}
      </CardContent>
    </Card>
  );
}