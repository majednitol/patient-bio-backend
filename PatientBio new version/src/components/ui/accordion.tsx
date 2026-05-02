import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
  type: "single" | "multiple";
  collapsible: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
  toggle: () => void;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | undefined>(undefined);

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", value: controlledValue, defaultValue, onValueChange, collapsible = false, className, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string[]>(() => {
      if (defaultValue) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      }
      return [];
    });

    const isControlled = controlledValue !== undefined;
    const value = isControlled 
      ? (Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : [])
      : uncontrolledValue;

    const handleValueChange = React.useCallback(
      (newValue: string[]) => {
        if (!isControlled) {
          setUncontrolledValue(newValue);
        }
        if (type === "single") {
          onValueChange?.(newValue[0] || "");
        } else {
          onValueChange?.(newValue);
        }
      },
      [isControlled, onValueChange, type]
    );

    return (
      <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type, collapsible }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  }
);
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    if (!context) {
      throw new Error("AccordionItem must be used within an Accordion");
    }

    const isOpen = context.value.includes(value);

    const toggle = () => {
      if (context.type === "single") {
        if (isOpen && context.collapsible) {
          context.onValueChange([]);
        } else if (!isOpen) {
          context.onValueChange([value]);
        }
      } else {
        if (isOpen) {
          context.onValueChange(context.value.filter(v => v !== value));
        } else {
          context.onValueChange([...context.value, value]);
        }
      }
    };

    return (
      <AccordionItemContext.Provider value={{ value, isOpen, toggle }}>
        <div ref={ref} className={cn("border-b", className)} data-state={isOpen ? "open" : "closed"} {...props}>
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  }
);
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionItemContext);
    if (!context) {
      throw new Error("AccordionTrigger must be used within an AccordionItem");
    }

    return (
      <div className="flex">
        <button
          ref={ref}
          type="button"
          onClick={context.toggle}
          aria-expanded={context.isOpen}
          data-state={context.isOpen ? "open" : "closed"}
          className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </button>
      </div>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionItemContext);
    if (!context) {
      throw new Error("AccordionContent must be used within an AccordionItem");
    }

    if (!context.isOpen) return null;

    return (
      <div
        ref={ref}
        className="overflow-hidden text-sm animate-in slide-in-from-top-1"
        data-state={context.isOpen ? "open" : "closed"}
        {...props}
      >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
