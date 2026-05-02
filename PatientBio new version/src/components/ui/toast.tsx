import * as React from "react";
import * as ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Toast types
export type ToastProps = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export type ToastActionElement = React.ReactElement<typeof ToastAction>;

const variantStyles = {
  default: "border bg-background text-foreground",
  destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
};

// Toast Provider Context
interface ToastContextValue {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, "id">) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<ToastProps>) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...toast, id, open: true }]); // Keep max 5 toasts
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = React.useCallback((id: string, toast: Partial<ToastProps>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...toast } : t)));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
    </ToastContext.Provider>
  );
};

// Toast Viewport
interface ToastViewportProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed z-[100] flex flex-col gap-2 max-w-[320px] w-full",
        // Mobile: bottom-up (above bottom nav), Desktop: top-right
        "bottom-20 left-1/2 -translate-x-1/2 sm:bottom-4 sm:left-auto sm:translate-x-0 sm:right-4 sm:top-auto",
        className
      )}
      {...props}
    />
  )
);
ToastViewport.displayName = "ToastViewport";

// Toast Component
interface ToastComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export const Toast = React.forwardRef<HTMLDivElement, ToastComponentProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-lg border p-4 pr-6 shadow-lg transition-all animate-in slide-in-from-bottom-5 sm:slide-in-from-top-5 duration-300",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Toast.displayName = "Toast";

// Toast Action
interface ToastActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
        className
      )}
      {...props}
    />
  )
);
ToastAction.displayName = "ToastAction";

// Toast Close
interface ToastCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2",
        "group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  )
);
ToastClose.displayName = "ToastClose";

// Toast Title
export const ToastTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-medium leading-tight", className)} {...props} />
  )
);
ToastTitle.displayName = "ToastTitle";

// Toast Description
export const ToastDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs opacity-90 leading-snug", className)} {...props} />
  )
);
ToastDescription.displayName = "ToastDescription";

export { type ToastContextValue };
