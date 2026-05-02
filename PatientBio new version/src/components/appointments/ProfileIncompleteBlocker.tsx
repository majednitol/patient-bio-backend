import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, HeartPulse } from "lucide-react";

interface ProfileIncompleteBlockerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingProfileFields: string[];
  missingHealthFields: string[];
}

export const ProfileIncompleteBlocker = ({
  open,
  onOpenChange,
  missingProfileFields,
  missingHealthFields,
}: ProfileIncompleteBlockerProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>Complete Your Profile First</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Please fill in all required information before booking an appointment. This helps doctors provide better care.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {missingProfileFields.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-primary" />
                Personal Profile
              </div>
              <ul className="ml-6 space-y-1">
                {missingProfileFields.map((field) => (
                  <li key={field} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingHealthFields.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HeartPulse className="h-4 w-4 text-primary" />
                Health Information
              </div>
              <ul className="ml-6 space-y-1">
                {missingHealthFields.map((field) => (
                  <li key={field} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
          {missingProfileFields.length > 0 && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                navigate("/dashboard/profile");
              }}
            >
              <User className="h-4 w-4 mr-2" />
              Complete Profile
            </Button>
          )}
          {missingHealthFields.length > 0 && (
            <Button
              className="w-full sm:w-auto"
              variant={missingProfileFields.length > 0 ? "outline" : "default"}
              onClick={() => {
                onOpenChange(false);
                navigate("/dashboard/health-data");
              }}
            >
              <HeartPulse className="h-4 w-4 mr-2" />
              Health Data
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
