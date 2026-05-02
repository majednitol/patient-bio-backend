import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastViewport>
      {toasts.map(function ({ id, title, description, action, variant, open, onOpenChange }) {
        if (!open) return null;
        return (
          <Toast key={id} variant={variant}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose onClick={() => onOpenChange?.(false)} />
          </Toast>
        );
      })}
    </ToastViewport>
  );
}
