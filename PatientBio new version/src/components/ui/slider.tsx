import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, defaultValue = [0], min = 0, max = 100, step = 1, disabled, onValueChange }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = value ?? internalValue;
    const trackRef = React.useRef<HTMLDivElement>(null);

    const percentage = ((currentValue[0] - min) / (max - min)) * 100;

    const handleChange = (newValue: number) => {
      const clampedValue = Math.min(Math.max(newValue, min), max);
      const steppedValue = Math.round(clampedValue / step) * step;
      const newValues = [steppedValue];
      
      if (value === undefined) {
        setInternalValue(newValues);
      }
      onValueChange?.(newValues);
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !trackRef.current) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const newValue = min + percentage * (max - min);
      handleChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      
      let newValue = currentValue[0];
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          newValue += step;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          newValue -= step;
          break;
        case "Home":
          newValue = min;
          break;
        case "End":
          newValue = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      handleChange(newValue);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <div
          ref={trackRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary cursor-pointer"
          onClick={handleTrackClick}
        >
          <div
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue[0]}
          aria-disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "cursor-grab active:cursor-grabbing"
          )}
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
