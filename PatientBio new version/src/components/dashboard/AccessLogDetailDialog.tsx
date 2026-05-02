import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, MapPin, Clock, Monitor, Shield, FileText } from "lucide-react";
import { format } from "date-fns";
import type { AccessLog } from "@/hooks/useAccessAnalytics";

interface AccessLogDetailDialogProps {
  log: AccessLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AccessLogDetailDialog = ({ log, open, onOpenChange }: AccessLogDetailDialogProps) => {
  if (!log) return null;

  const maskIP = (ip: string | null) => {
    if (!ip) return "Not available";
    // Simple masking: show first part, hide rest
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.slice(0, 8) + "***";
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: "Unknown", device: "Unknown" };
    
    let browser = "Unknown";
    let device = "Desktop";

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
      device = "Mobile";
    } else if (ua.includes("Tablet") || ua.includes("iPad")) {
      device = "Tablet";
    }

    return { browser, device };
  };

  const { browser, device } = parseUserAgent(log.user_agent);
  const location = [log.city, log.country].filter(Boolean).join(", ") || "Unknown location";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Access Details
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {/* Accessor Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Accessor Information
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">
                  {log.accessor_name || "Anonymous"}
                </span>
              </div>
              {log.accessor_email && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{log.accessor_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="secondary" className="capitalize">
                  {log.accessor_type}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Access Reason */}
          {log.access_reason && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Access Reason
                </h4>
                <p className="text-sm bg-muted/30 rounded-lg p-3">
                  {log.access_reason}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Time & Location */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time & Location
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date & Time</span>
                <span className="text-sm font-medium">
                  {format(new Date(log.accessed_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Device Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Device Information
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Browser</span>
                <span className="text-sm font-medium">{browser}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Device</span>
                <span className="text-sm font-medium">{device}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">IP Address</span>
                <span className="text-sm font-medium font-mono">
                  {maskIP(log.ip_address as string | null)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default AccessLogDetailDialog;
