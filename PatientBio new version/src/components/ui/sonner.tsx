// This file is kept for API compatibility
// Using custom toast implementation instead of sonner
import { toast as internalToast } from "@/hooks/use-toast";
import { Toaster as InternalToaster } from "@/components/ui/toaster";

// Re-export for compatibility
const Toaster = InternalToaster;

const DEFAULT_DURATION = 5000;

// Create a simplified toast function matching sonner's API
const toast = (message: string | { title?: string; description?: string; duration?: number }) => {
  if (typeof message === "string") {
    return internalToast({ description: message, duration: DEFAULT_DURATION });
  }
  return internalToast({ ...message, duration: message.duration ?? DEFAULT_DURATION });
};

// Add common toast methods
toast.success = (message: string, duration = DEFAULT_DURATION) => internalToast({ title: "Success", description: message, duration });
toast.error = (message: string, duration = DEFAULT_DURATION) => internalToast({ title: "Error", description: message, variant: "destructive", duration });
toast.warning = (message: string, duration = DEFAULT_DURATION) => internalToast({ title: "Warning", description: message, duration });
toast.info = (message: string, duration = DEFAULT_DURATION) => internalToast({ title: "Info", description: message, duration });

export { Toaster, toast };
