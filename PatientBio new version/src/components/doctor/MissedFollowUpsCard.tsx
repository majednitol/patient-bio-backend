import React from "react";
import { useMissedFollowUps, MissedFollowUp } from "@/hooks/useMissedFollowUps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Calendar,
  Clock,
  ChevronRight,
  UserSearch,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

function SeverityBadge({ days }: { days: number }) {
  if (days >= 30) {
    return (
      <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
        <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
        {days}d overdue
      </Badge>
    );
  }
  if (days >= 14) {
    return (
      <Badge variant="outline" className="text-[10px] sm:text-xs text-amber-700 border-amber-300 px-1.5 sm:px-2">
        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
        {days}d overdue
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
      {days}d overdue
    </Badge>
  );
}

function PatientRow({ item }: { item: MissedFollowUp }) {
  const initials = item.patientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
          <AvatarFallback className="text-[10px] sm:text-xs bg-destructive/10 text-destructive">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-xs sm:text-sm truncate">{item.patientName}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
            Due {format(new Date(item.followUpDate), "MMM d")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <SeverityBadge days={item.daysPastDue} />
        <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" asChild>
          <Link to={`/doctor/patients`}>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export const MissedFollowUpsCard = React.memo(function MissedFollowUpsCard() {
  const { data: missed, isLoading } = useMissedFollowUps();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserSearch className="h-5 w-5" />
            Missed Follow-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!missed || missed.length === 0) return null;

  const criticalCount = missed.filter((m) => m.daysPastDue >= 30).length;
  const displayItems = missed.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
            <UserSearch className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
            <span className="truncate">Missed Follow-ups</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs ml-0.5">
              {missed.length}
            </Badge>
          </CardTitle>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] sm:text-xs flex-shrink-0">
              {criticalCount} critical
            </Badge>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Patients who were due for a follow-up but haven't booked yet
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayItems.map((item) => (
          <PatientRow key={item.prescriptionId} item={item} />
        ))}
        {missed.length > 5 && (
          <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
            <Link to="/doctor/patients">
              View all {missed.length} missed follow-ups
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
