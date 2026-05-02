import * as React from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl",
  outline: "border-2 border-border bg-transparent hover:bg-muted",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl hover:scale-105",
  ghost: "hover:bg-muted",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles = {
  default: "h-11 px-6 py-2",
  sm: "h-9 rounded-lg px-5 text-sm",
  lg: "h-14 rounded-xl px-10 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    // Note: asChild is kept for API compatibility but ignored in pure Tailwind version
    // If you need polymorphic behavior, wrap Button content in the desired element
    
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Helper function to get button variant classes (for compatibility with existing code)
function buttonVariants(props?: { variant?: keyof typeof variantStyles; size?: keyof typeof sizeStyles }) {
  const variant = props?.variant ?? "default";
  const size = props?.size ?? "default";
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variantStyles[variant],
    sizeStyles[size]
  );
}

export { Button, buttonVariants };
