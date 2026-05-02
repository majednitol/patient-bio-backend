import { useState, forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AsyncButtonProps extends ButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
}

export const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(
  ({ 
    children, 
    onClick, 
    loadingText, 
    successText,
    successDuration = 1500,
    disabled, 
    className, 
    ...props 
  }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onClick || isLoading) return;

      const result = onClick(e);
      
      // Check if the result is a Promise
      if (result instanceof Promise) {
        setIsLoading(true);
        try {
          await result;
          if (successText) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), successDuration);
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          "relative transition-all",
          isLoading && "cursor-wait",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loadingText || children}
          </>
        ) : showSuccess && successText ? (
          successText
        ) : (
          children
        )}
      </Button>
    );
  }
);

AsyncButton.displayName = "AsyncButton";

// Simpler loading button that just accepts isLoading as a prop
interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, isLoading, loadingText, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative transition-all",
          isLoading && "cursor-wait",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
