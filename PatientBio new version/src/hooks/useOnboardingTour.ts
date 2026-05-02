import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  position?: "top" | "bottom" | "left" | "right";
  highlightPadding?: number;
}

const STORAGE_KEY = "patient_bio_tour_completed";
const TOUR_VERSION = "1.0";

export const useOnboardingTour = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  const TOUR_STEPS: TourStep[] = [
    {
      id: "welcome",
      title: t("onboarding.welcomeTitle"),
      description: t("onboarding.welcomeDesc"),
      position: "bottom",
    },
    {
      id: "profile",
      title: t("onboarding.profileTitle"),
      description: t("onboarding.profileDesc"),
      targetId: "tour-profile-link",
      position: "right",
    },
    {
      id: "upload",
      title: t("onboarding.uploadTitle"),
      description: t("onboarding.uploadDesc"),
      targetId: "tour-upload-link",
      position: "right",
    },
    {
      id: "share",
      title: t("onboarding.shareTitle"),
      description: t("onboarding.shareDesc"),
      targetId: "tour-share-link",
      position: "right",
    },
    {
      id: "qr",
      title: t("onboarding.qrTitle"),
      description: t("onboarding.qrDesc"),
      targetId: "tour-qr-link",
      position: "right",
    },
    {
      id: "appointments",
      title: t("onboarding.appointmentsTitle", "Book Appointments"),
      description: t("onboarding.appointmentsDesc", "Schedule and manage appointments with your doctors. Get reminders so you never miss a visit."),
      targetId: "tour-appointments-link",
      position: "right",
    },
    {
      id: "medications",
      title: t("onboarding.medicationsTitle"),
      description: t("onboarding.medicationsDesc"),
      targetId: "tour-health-trends-link",
      position: "right",
    },
  ];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { version, completed } = JSON.parse(stored);
        setHasCompletedTour(version === TOUR_VERSION && completed);
      } catch {
        setHasCompletedTour(false);
      }
    } else {
      setHasCompletedTour(false);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  }, []);

  const endTour = useCallback((markComplete = true) => {
    setIsOpen(false);
    setCurrentStepIndex(0);
    if (markComplete) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: TOUR_VERSION, completed: true }));
      setHasCompletedTour(true);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      endTour(true);
    }
  }, [currentStepIndex, endTour, TOUR_STEPS.length]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    endTour(true);
  }, [endTour]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompletedTour(false);
  }, []);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    hasCompletedTour,
    startTour,
    endTour,
    nextStep,
    prevStep,
    skipTour,
    resetTour,
    steps: TOUR_STEPS,
  };
};