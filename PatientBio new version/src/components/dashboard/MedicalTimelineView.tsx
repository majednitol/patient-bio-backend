import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { usePatientPrescriptions, type Prescription } from "@/hooks/usePrescriptions";
import { usePatientVisitSummaries, type VisitSummary } from "@/hooks/useVisitSummary";
import { useAppointments } from "@/hooks/useAppointments";
import { useSymptomScreenings, type SymptomScreening } from "@/hooks/useSymptomScreenings";
import { usePatientPathologistReports, type PatientPathologistReport } from "@/hooks/usePatientPathologistReports";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, Pill, Stethoscope, TestTube, Image as ImageIcon,
  ChevronDown, ChevronRight, Calendar, User, Loader2,
  CalendarCheck, Activity, FlaskConical, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";

type HealthRecord = Tables<"health_records">;

type TimelineEntryType = "appointment" | "prescription" | "lab_result" | "lab_report" | "imaging" | "visit" | "screening" | "record";

interface TimelineEntry {
  id: string;
  date: Date;
  type: TimelineEntryType;
  title: string;
  provider?: string | null;
  details?: string | null;
  badge?: string | null;
  source: "health_record" | "prescription" | "visit_summary" | "appointment" | "screening" | "lab_report";
  raw: unknown;
}

function mapRecordType(category: string | null): TimelineEntryType {
  if (category === "prescription") return "prescription";
  if (category === "lab_result") return "lab_result";
  if (category === "imaging") return "imaging";
  return "record";
}

interface MedicalTimelineViewProps {
  searchQuery?: string;
}

export function MedicalTimelineView({ searchQuery = "" }: MedicalTimelineViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { records, isLoading: recordsLoading } = useHealthRecords();
  const { data: prescriptions = [], isLoading: rxLoading } = usePatientPrescriptions();
  const { data: visitSummaries = [], isLoading: visitsLoading } = usePatientVisitSummaries();
  const { appointments, isLoading: apptLoading } = useAppointments({ patientId: user?.id });
  const { screenings, isLoading: screeningsLoading } = useSymptomScreenings();
  const { reports: labReports = [], isLoading: labLoading } = usePatientPathologistReports();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<TimelineEntryType | "all">("all");

  const isLoading = recordsLoading || rxLoading || visitsLoading || apptLoading || screeningsLoading || labLoading;

  const TYPE_CONFIG: Record<TimelineEntryType, {
    icon: typeof FileText;
    badgeClass: string;
    label: string;
  }> = {
    appointment: { icon: CalendarCheck, badgeClass: "bg-primary/10 text-primary", label: t("timeline.appointment") },
    prescription: { icon: Pill, badgeClass: "bg-primary/10 text-primary", label: t("timeline.prescription") },
    lab_result: { icon: TestTube, badgeClass: "bg-primary/10 text-primary", label: t("timeline.labResult") },
    lab_report: { icon: FlaskConical, badgeClass: "bg-primary/10 text-primary", label: t("timeline.labReport") },
    imaging: { icon: ImageIcon, badgeClass: "bg-primary/10 text-primary", label: t("timeline.imaging") },
    visit: { icon: Stethoscope, badgeClass: "bg-primary/10 text-primary", label: t("timeline.visitSummary") },
    screening: { icon: Activity, badgeClass: "bg-primary/10 text-primary", label: t("timeline.symptomCheck") },
    record: { icon: FileText, badgeClass: "bg-muted text-muted-foreground", label: t("timeline.record") },
  };

  const STATUS_LABELS: Record<string, string> = {
    scheduled: t("timeline.scheduled"),
    confirmed: t("timeline.confirmed"),
    completed: t("timeline.completed"),
    cancelled: t("timeline.cancelled"),
    checked_in: t("timeline.checkedIn"),
    in_progress: t("timeline.inProgress"),
  };

  const FILTER_OPTIONS: { value: TimelineEntryType | "all"; label: string; icon: typeof FileText }[] = [
    { value: "all", label: t("timeline.all"), icon: FileText },
    { value: "appointment", label: t("timeline.appointments"), icon: CalendarCheck },
    { value: "prescription", label: t("timeline.prescriptions"), icon: Pill },
    { value: "lab_report", label: t("timeline.labReports"), icon: FlaskConical },
    { value: "lab_result", label: t("timeline.labResults"), icon: TestTube },
    { value: "visit", label: t("timeline.visits"), icon: Stethoscope },
    { value: "screening", label: t("timeline.screenings"), icon: Activity },
    { value: "record", label: t("timeline.records"), icon: FileText },
  ];

  const entries = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    records.forEach((r) => {
      items.push({
        id: `hr-${r.id}`, date: new Date(r.record_date || r.uploaded_at), type: mapRecordType(r.category),
        title: r.title, provider: r.provider_name, details: r.description || r.notes, source: "health_record", raw: r,
      });
    });

    prescriptions.forEach((p) => {
      items.push({
        id: `rx-${p.id}`, date: new Date(p.created_at), type: "prescription",
        title: p.diagnosis || t("timeline.prescription"), provider: p.doctor_name,
        details: p.medications.map((m) => `${m.name} ${m.dosage}`).join(", "), source: "prescription", raw: p,
      });
    });

    visitSummaries.forEach((v) => {
      items.push({
        id: `vs-${v.id}`, date: new Date(v.created_at), type: "visit",
        title: v.diagnosis || t("timeline.visitSummary"), provider: null, details: v.summary_text, source: "visit_summary", raw: v,
      });
    });

    (appointments || []).forEach((a: any) => {
      items.push({
        id: `appt-${a.id}`, date: new Date(a.appointment_date), type: "appointment",
        title: a.reason || t("timeline.appointment"), provider: a.doctor_profile?.full_name || null,
        details: a.notes || null, badge: STATUS_LABELS[a.status] || a.status, source: "appointment", raw: a,
      });
    });

    screenings.forEach((s) => {
      items.push({
        id: `sc-${s.id}`, date: new Date(s.created_at), type: "screening",
        title: s.symptoms?.substring(0, 80) || t("timeline.symptomCheck"), provider: null,
        details: s.summary || s.reasoning || null, badge: s.urgency_label || s.urgency, source: "screening", raw: s,
      });
    });

    labReports.forEach((lr) => {
      items.push({
        id: `lab-${lr.id}`, date: new Date(lr.created_at || Date.now()), type: "lab_report",
        title: lr.report_name || t("timeline.labReport"), provider: lr.pathologist_name || lr.lab_name || null,
        details: lr.findings || null, badge: lr.has_abnormal_values ? t("timeline.abnormal") : null, source: "lab_report", raw: lr,
      });
    });

    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    let filtered = activeFilter === "all" ? items : items.filter((i) => i.type === activeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(q) || i.provider?.toLowerCase().includes(q) || i.details?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [records, prescriptions, visitSummaries, appointments, screenings, labReports, searchQuery, activeFilter, t]);

  const {
    paginatedData: paginatedEntries,
    currentPage,
    totalPages,
    goToPage,
    hasNextPage: hasNext,
    hasPrevPage: hasPrev,
  } = usePagination({ data: entries, itemsPerPage: 20 });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    paginatedEntries.forEach((e) => {
      const key = format(e.date, "MMMM yyyy");
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [paginatedEntries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeFilter === opt.value;
          return (
            <Button key={opt.value} variant={isActive ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1.5 rounded-full" onClick={() => setActiveFilter(opt.value)}>
              <Icon className="h-3 w-3" />
              {opt.label}
            </Button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? t("timeline.noRecordsMatch") : t("timeline.noHealthEvents")}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([monthLabel, items]) => (
            <div key={monthLabel}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background z-10 py-1">
                {monthLabel}
              </h3>
              <div className="space-y-2">
                {items.map((entry) => {
                  const config = TYPE_CONFIG[entry.type];
                  const Icon = config.icon;
                  const expanded = expandedIds.has(entry.id);

                  return (
                    <Card key={entry.id} className="border border-border/60 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all"  onClick={() => toggleExpand(entry.id)}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={`text-[10px] px-2 py-0 ${config.badgeClass}`}>{config.label}</Badge>
                              {entry.badge && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0">
                                  {entry.badge === t("timeline.abnormal") && <AlertTriangle className="h-2.5 w-2.5 mr-0.5 text-destructive" />}
                                  {entry.badge}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(entry.date, "MMM d, yyyy")}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm leading-tight line-clamp-1">{entry.title}</h4>
                            {entry.provider && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="h-3 w-3" />
                                {entry.provider}
                              </p>
                            )}
                            {expanded && entry.details && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line border-t border-border/40 pt-2">{entry.details}</p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            hasNextPage={hasNext}
            hasPrevPage={hasPrev}
          />
        </div>
      )}
    </div>
  );
}