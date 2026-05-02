import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

// Context to track if we're in mobile mode within the dialog tree
const ResponsiveDialogContext = React.createContext<{ isMobile: boolean } | null>(null);

function useResponsiveDialogContext() {
  const ctx = React.useContext(ResponsiveDialogContext);
  // Fallback to useIsMobile if used outside ResponsiveDialog (shouldn't happen but safe)
  const mobileFallback = useIsMobile();
  return ctx?.isMobile ?? mobileFallback;
}

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

/**
 * ResponsiveDialog: renders as a vaul Drawer on mobile (<768px)
 * and a centered Dialog on desktop. All sub-components
 * (Header, Title, Description, Footer, Body, Close) adapt automatically.
 */
const ResponsiveDialog = ({ open, onOpenChange, children }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();

  // Provide context so all children use the SAME isMobile value
  const ctxValue = React.useMemo(() => ({ isMobile }), [isMobile]);

  if (isMobile) {
    return (
      <ResponsiveDialogContext.Provider value={ctxValue}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[96vh]">
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </ResponsiveDialogContext.Provider>
    );
  }

  return (
    <ResponsiveDialogContext.Provider value={ctxValue}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
};

interface ResponsiveDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * On desktop, wraps children in DialogContent.
 * On mobile, renders children directly (DrawerContent is already provided by ResponsiveDialog).
 */
const ResponsiveDialogContent = React.forwardRef<HTMLDivElement, ResponsiveDialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const isMobile = useResponsiveDialogContext();

    if (isMobile) {
      // Content is already inside DrawerContent, just render children
      return <>{children}</>;
    }

    return (
      <DialogContent ref={ref} className={className} {...props}>
        {children}
      </DialogContent>
    );
  }
);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

const ResponsiveDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useResponsiveDialogContext();
  const Comp = isMobile ? DrawerHeader : DialogHeader;
  return <Comp className={cn(isMobile && "px-0 pt-0", className)} {...props} />;
};

const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const isMobile = useResponsiveDialogContext();
  const Comp = isMobile ? DrawerTitle : DialogTitle;
  return <Comp ref={ref} className={className} {...props} />;
});
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const isMobile = useResponsiveDialogContext();
  const Comp = isMobile ? DrawerDescription : DialogDescription;
  return <Comp ref={ref} className={className} {...props} />;
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";

const ResponsiveDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useResponsiveDialogContext();
  const Comp = isMobile ? DrawerFooter : DialogFooter;
  return <Comp className={cn(isMobile && "px-0 pb-0", className)} {...props} />;
};

const ResponsiveDialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const isMobile = useResponsiveDialogContext();
  if (isMobile) {
    return <DrawerClose ref={ref} {...props} />;
  }
  return <DialogClose ref={ref} {...props} />;
});
ResponsiveDialogClose.displayName = "ResponsiveDialogClose";

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
};
