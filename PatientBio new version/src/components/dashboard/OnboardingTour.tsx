import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingTour, TourStep } from "@/hooks/useOnboardingTour";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

const OnboardingTour = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    hasCompletedTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboardingTour();

  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Auto-start tour for new users
  useEffect(() => {
    if (!hasCompletedTour) {
      const timer = setTimeout(() => startTour(), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour, startTour]);

  const calculatePosition = useCallback((step: TourStep) => {
    // On mobile or no target: bottom sheet style
    if (isMobile || !step.targetId) {
      setTargetRect(null);
      setTooltipPosition({
        top: 0, // will be overridden by mobile styles
        left: 0,
        arrowPosition: "bottom",
      });
      return;
    }

    const target = document.querySelector(`[data-tour-id="${step.targetId}"]`);
    if (!target) {
      setTargetRect(null);
      setTooltipPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, arrowPosition: "bottom" });
      return;
    }

    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    const padding = step.highlightPadding || 8;
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    let top = 0, left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "left";

    switch (step.position) {
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding + 12;
        arrowPosition = "left";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding - 12;
        arrowPosition = "right";
        break;
      case "bottom":
        top = rect.bottom + padding + 12;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
      case "top":
        top = rect.top - tooltipHeight - padding - 12;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        break;
      default:
        top = rect.bottom + padding + 12;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    setTooltipPosition({ top, left, arrowPosition });
  }, [isMobile]);

  useEffect(() => {
    if (isOpen && currentStep) {
      calculatePosition(currentStep);
      const handleResize = () => calculatePosition(currentStep);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen, currentStep, calculatePosition]);

  if (!isOpen || !tooltipPosition) return null;

  const progressValue = ((currentStepIndex + 1) / totalSteps) * 100;

  // Step indicators (dots)
  const StepDots = () => (
    <div className="flex items-center justify-center gap-1.5 my-3">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === currentStepIndex
              ? "w-6 h-2 bg-primary"
              : i < currentStepIndex
                ? "w-2 h-2 bg-primary/40"
                : "w-2 h-2 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60" onClick={skipTour} />
        <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl safe-area-bottom animate-in slide-in-from-bottom duration-300">
          <div className="p-5 pt-4">
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />

            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("onboarding.step", { current: currentStepIndex + 1, total: totalSteps })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipTour}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-1.5">{currentStep.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">{currentStep.description}</p>

            <StepDots />

            <div className="flex items-center gap-2 mt-2">
              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={prevStep} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("onboarding.back")}
                </Button>
              )}
              {isFirstStep && (
                <Button variant="ghost" size="sm" onClick={skipTour} className="flex-1 text-muted-foreground">
                  {t("onboarding.skipTour")}
                </Button>
              )}
              <Button size="sm" onClick={nextStep} className="flex-1">
                {isLastStep ? t("onboarding.getStarted") : (
                  <>
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: positioned tooltip
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 transition-all duration-300" onClick={skipTour} />

      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="absolute w-80 rounded-xl shadow-2xl border border-primary/20 bg-background overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
      >
        {/* Arrow */}
        <div
          className={cn(
            "absolute w-3 h-3 bg-background border rotate-45",
            tooltipPosition.arrowPosition === "top" && "-top-1.5 left-1/2 -translate-x-1/2 border-t border-l border-primary/20",
            tooltipPosition.arrowPosition === "bottom" && "-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r border-primary/20",
            tooltipPosition.arrowPosition === "left" && "-left-1.5 top-1/2 -translate-y-1/2 border-l border-b border-primary/20",
            tooltipPosition.arrowPosition === "right" && "-right-1.5 top-1/2 -translate-y-1/2 border-r border-t border-primary/20",
          )}
        />

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {t("onboarding.step", { current: currentStepIndex + 1, total: totalSteps })}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={skipTour}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Progress value={progressValue} className="h-1 mb-3" />

          <h3 className="font-semibold text-foreground mb-1.5">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{currentStep.description}</p>

          <StepDots />

          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" size="sm" onClick={skipTour} className="text-muted-foreground hover:text-foreground">
              {t("onboarding.skipTour")}
            </Button>
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="outline" size="sm" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("onboarding.back")}
                </Button>
              )}
              <Button size="sm" onClick={nextStep}>
                {isLastStep ? t("onboarding.getStarted") : (
                  <>
                    {t("onboarding.next")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OnboardingTour;
