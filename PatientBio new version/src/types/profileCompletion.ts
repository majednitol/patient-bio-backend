import { LucideIcon } from "lucide-react";

export interface ProfileField {
  key: string;
  label: string;
  isComplete: boolean;
  link?: string;
  priority?: "high" | "medium" | "low";
}

export interface ProfileCompletionMetrics {
  percentage: number;
  completedCount: number;
  totalCount: number;
  fields: ProfileField[];
  missingFields: ProfileField[];
}

export interface PortalCompletionData {
  portalType: "patient" | "doctor" | "pathologist" | "researcher" | "hospital";
  portalLabel: string;
  metrics: ProfileCompletionMetrics;
  icon?: LucideIcon;
  colorScheme?: "primary" | "teal" | "amber" | "purple" | "blue";
}

export interface PlatformCompletionStats {
  averageCompletion: number;
  usersBelow50: number;
  usersAt100: number;
  totalUsers: number;
  byPortal: {
    portalType: string;
    label: string;
    averageCompletion: number;
    count: number;
  }[];
}
