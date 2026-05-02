import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { GraduationCap, Briefcase, DollarSign, Building2, Clock, Star } from "lucide-react";
import type { BookableDoctor } from "@/hooks/useBookableDoctors";
import type { MatchResult } from "./smartMatchUtils";
import type { DoctorRatingStats } from "@/hooks/useDoctorRatings";
import { format, parse, isToday, isTomorrow } from "date-fns";

interface DoctorComparisonDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: BookableDoctor[];
  matches: MatchResult[];
  nextSlots?: Record<string, { date: string; time: string } | null>;
  onSelectDoctor: (doctor: BookableDoctor) => void;
  ratingsMap?: Record<string, DoctorRatingStats>;
}

function formatSlot(slot: { date: string; time: string }): string {
  const date = parse(slot.date, "yyyy-MM-dd", new Date());
  const time = parse(slot.time, "HH:mm:ss", new Date());
  const timeStr = format(time, "h:mm a");
  if (isToday(date)) return `Today ${timeStr}`;
  if (isTomorrow(date)) return `Tomorrow ${timeStr}`;
  return `${format(date, "MMM d")} ${timeStr}`;
}

function CompareRow({ label, icon, values }: { label: string; icon: React.ReactNode; values: (string | null)[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${values.length}, 1fr)` }}>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
        {icon}
        {label}
      </div>
      {values.map((v, i) => (
        <div key={i} className="text-[11px] text-foreground">{v || "—"}</div>
      ))}
    </div>
  );
}

export function DoctorComparisonDrawer({ open, onOpenChange, doctors, matches, nextSlots, onSelectDoctor, ratingsMap }: DoctorComparisonDrawerProps) {
  if (doctors.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm">Compare Doctors ({doctors.length})</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {/* Doctor headers */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${doctors.length}, 1fr)` }}>
            <div />
            {doctors.map((doc) => {
              const initials = doc.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);
              return (
                <div key={doc.id} className="flex flex-col items-center gap-1">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={doc.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-center leading-tight">{formatDoctorName(doc.full_name)}</span>
                </div>
              );
            })}
          </div>

          <hr className="border-border" />

          <CompareRow
            label="Specialty"
            icon={<GraduationCap className="h-3 w-3" />}
            values={doctors.map(d => d.specialty)}
          />
          <CompareRow
            label="Qualification"
            icon={<GraduationCap className="h-3 w-3" />}
            values={doctors.map(d => d.qualification)}
          />
          <CompareRow
            label="Experience"
            icon={<Briefcase className="h-3 w-3" />}
            values={doctors.map(d => d.experience_years != null ? `${d.experience_years} years` : null)}
          />
          <CompareRow
            label="Fee"
            icon={<DollarSign className="h-3 w-3" />}
            values={doctors.map(d => d.consultation_fee != null ? `₹${d.consultation_fee}` : null)}
          />
          <CompareRow
            label="Hospital"
            icon={<Building2 className="h-3 w-3" />}
            values={doctors.map(d => d.hospital_name)}
          />
          <CompareRow
            label="Rating"
            icon={<Star className="h-3 w-3" />}
            values={doctors.map(d => {
              const stats = ratingsMap?.[d.id];
              if (!stats || stats.avg_rating == null || stats.total_reviews === 0) return null;
              return `★ ${stats.avg_rating.toFixed(1)} (${stats.total_reviews})`;
            })}
          />
          <CompareRow
            label="Next Slot"
            icon={<Clock className="h-3 w-3" />}
            values={doctors.map(d => {
              const slot = nextSlots?.[d.id];
              return slot ? formatSlot(slot) : null;
            })}
          />
          <CompareRow
            label="Match Score"
            icon={null}
            values={doctors.map(d => {
              const m = matches.find(mm => mm.doctorId === d.id);
              return m ? `${m.score}/${m.maxScore}` : null;
            })}
          />

          <hr className="border-border" />

          {/* Book buttons */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${doctors.length}, 1fr)` }}>
            <div />
            {doctors.map((doc) => (
              <Button
                key={doc.id}
                size="sm"
                className="text-[11px] w-full"
                onClick={() => { onSelectDoctor(doc); onOpenChange(false); }}
              >
                Book
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
