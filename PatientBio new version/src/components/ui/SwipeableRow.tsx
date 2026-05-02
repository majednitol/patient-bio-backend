import React, { useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  PanInfo,
} from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string; // tailwind bg class e.g. "bg-destructive"
  textColor?: string; // tailwind text class
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
}

const ACTION_WIDTH = 72;
const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

export const SwipeableRow = React.memo(function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 0.35,
  className,
}: SwipeableRowProps) {
  const isMobile = useIsMobile();
  const x = useMotionValue(0);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const maxLeftSwipe = leftActions.length * ACTION_WIDTH;
  const maxRightSwipe = rightActions.length * ACTION_WIDTH;

  // Opacity transforms for action reveals
  const leftOpacity = useTransform(x, [0, maxLeftSwipe * 0.5, maxLeftSwipe], [0, 0.5, 1]);
  const rightOpacity = useTransform(x, [-maxRightSwipe, -maxRightSwipe * 0.5, 0], [1, 0.5, 0]);

  // Scale transforms for spring-feel reveal
  const leftScale = useTransform(x, [0, maxLeftSwipe * 0.3, maxLeftSwipe], [0.6, 0.85, 1]);
  const rightScale = useTransform(x, [-maxRightSwipe, -maxRightSwipe * 0.3, 0], [1, 0.85, 0.6]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const containerWidth = containerRef.current?.offsetWidth || 300;
      const swipeRatio = Math.abs(info.offset.x) / containerWidth;

      if (info.offset.x > 0 && leftActions.length > 0) {
        if (swipeRatio > threshold) {
          // Snap open to reveal left actions
          controls.start({ x: maxLeftSwipe, transition: SPRING });
        } else {
          controls.start({ x: 0, transition: SPRING });
        }
      } else if (info.offset.x < 0 && rightActions.length > 0) {
        if (swipeRatio > threshold) {
          controls.start({ x: -maxRightSwipe, transition: SPRING });
        } else {
          controls.start({ x: 0, transition: SPRING });
        }
      } else {
        controls.start({ x: 0, transition: SPRING });
      }
    },
    [controls, leftActions.length, rightActions.length, maxLeftSwipe, maxRightSwipe, threshold]
  );

  const handleActionClick = useCallback(
    (action: SwipeAction) => {
      controls.start({ x: 0, transition: SPRING }).then(() => {
        action.onClick();
      });
    },
    [controls]
  );

  // Desktop: no swipe, just render children
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-xl ${className || ""}`}>
      {/* Left actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-stretch z-0"
          style={{ opacity: leftOpacity }}
        >
          {leftActions.map((action, i) => (
            <motion.button
              key={i}
              className={`flex flex-col items-center justify-center gap-1 ${action.color} ${action.textColor || "text-white"}`}
              style={{ width: ACTION_WIDTH, scale: leftScale }}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon}
              <span className="text-[9px] font-semibold uppercase tracking-wider">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Right actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
          style={{ opacity: rightOpacity }}
        >
          {rightActions.map((action, i) => (
            <motion.button
              key={i}
              className={`flex flex-col items-center justify-center gap-1 ${action.color} ${action.textColor || "text-white"}`}
              style={{ width: ACTION_WIDTH, scale: rightScale }}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon}
              <span className="text-[9px] font-semibold uppercase tracking-wider">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Main content - draggable */}
      <motion.div
        className="relative z-10 bg-background"
        style={{ x }}
        animate={controls}
        drag="x"
        dragDirectionLock
        dragConstraints={{
          left: rightActions.length > 0 ? -maxRightSwipe - 20 : 0,
          right: leftActions.length > 0 ? maxLeftSwipe + 20 : 0,
        }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
});
