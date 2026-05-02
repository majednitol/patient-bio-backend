import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

// Tooltip context
interface TooltipContextValue {
  open: boolean;
  onOpenChange: (open: boolean, delayed?: boolean) => void;
  triggerRef: React.RefObject<HTMLElement>;
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined);

// Global tooltip provider with delay configuration
interface TooltipProviderProps {
  delayDuration?: number;
  children: React.ReactNode;
}

const TooltipProviderContext = React.createContext<{ delayDuration: number }>({ delayDuration: 200 });

const TooltipProvider = ({ delayDuration = 200, children }: TooltipProviderProps) => {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
};

interface TooltipProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children: React.ReactNode;
}

const Tooltip = ({ open: controlledOpen, defaultOpen = false, onOpenChange, delayDuration: propDelay, children }: TooltipProps) => {
  const providerContext = React.useContext(TooltipProviderContext);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const delayDuration = propDelay ?? providerContext.delayDuration;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean, delayed: boolean = false) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (newOpen && delayed) {
        timeoutRef.current = setTimeout(() => {
          if (!isControlled) {
            setUncontrolledOpen(true);
          }
          onOpenChange?.(true);
        }, delayDuration);
      } else {
        if (!isControlled) {
          setUncontrolledOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      }
    },
    [isControlled, onOpenChange, delayDuration]
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild, onMouseEnter, onMouseLeave, onFocus, onBlur, children, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  if (!context) {
    throw new Error("TooltipTrigger must be used within a Tooltip");
  }

  const { onOpenChange, triggerRef } = context;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseEnter?.(e);
    onOpenChange(true, true);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    onOpenChange(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    onFocus?.(e);
    onOpenChange(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    onBlur?.(e);
    onOpenChange(false);
  };

  const combinedRef = (node: HTMLButtonElement | null) => {
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
    (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      ref: combinedRef,
    });
  }

  return (
    <button
      ref={combinedRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, side = "top", align = "center", children, hidden, ...props }, ref) => {
    const context = React.useContext(TooltipContext);
    
    if (!context) {
      throw new Error("TooltipContent must be used within a Tooltip");
    }

    const { open, triggerRef } = context;
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Calculate position
    React.useEffect(() => {
      if (open && triggerRef.current && contentRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        // Calculate base position based on side
        switch (side) {
          case "top":
            top = triggerRect.top - contentRect.height - sideOffset;
            left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
            break;
          case "bottom":
            top = triggerRect.bottom + sideOffset;
            left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
            break;
          case "left":
            top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
            left = triggerRect.left - contentRect.width - sideOffset;
            break;
          case "right":
            top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
            left = triggerRect.right + sideOffset;
            break;
        }

        // Adjust for alignment
        if (side === "top" || side === "bottom") {
          if (align === "start") {
            left = triggerRect.left;
          } else if (align === "end") {
            left = triggerRect.right - contentRect.width;
          }
        } else {
          if (align === "start") {
            top = triggerRect.top;
          } else if (align === "end") {
            top = triggerRect.bottom - contentRect.height;
          }
        }

        // Keep within viewport
        left = Math.max(8, Math.min(left, window.innerWidth - contentRect.width - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - contentRect.height - 8));

        setPosition({ top, left });
      }
    }, [open, side, sideOffset, align, triggerRef]);

    if (!open || !mounted || hidden) return null;

    return ReactDOM.createPortal(
      <div
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="tooltip"
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
        }}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
