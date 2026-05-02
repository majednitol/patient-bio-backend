import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface PatientIdentityBadgeProps {
  hasGhpid: boolean;
  hasPhone: boolean;
  className?: string;
}

export default function PatientIdentityBadge({
  hasGhpid,
  hasPhone,
  className,
}: PatientIdentityBadgeProps) {
  let level: "verified" | "partial" | "low";
  let label: string;
  let icon: React.ReactNode;

  if (hasGhpid) {
    level = "verified";
    label = "GHPID Verified";
    icon = <ShieldCheck className="h-3 w-3" />;
  } else if (hasPhone) {
    level = "partial";
    label = "Phone Verified";
    icon = <Shield className="h-3 w-3" />;
  } else {
    level = "low";
    label = "Name Only";
    icon = <ShieldAlert className="h-3 w-3" />;
  }

  const variantMap = {
    verified: "default" as const,
    partial: "secondary" as const,
    low: "outline" as const,
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variantMap[level]} className={`gap-1 text-xs ${className || ""}`}>
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {level === "verified" && "Patient identity confirmed via Global Health Passport ID"}
            {level === "partial" && "Identity partially verified via phone number"}
            {level === "low" && "Identity based on name only — higher risk of mismatch"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
