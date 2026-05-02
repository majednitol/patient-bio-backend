import { lazy, Suspense, useRef, useState, useEffect, ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazySectionProps {
  loader: () => Promise<{ default: ComponentType }>;
  fallbackHeight?: string;
}

/**
 * Renders a lazy-loaded section only when it enters the viewport.
 * Uses IntersectionObserver with a 200px rootMargin for pre-loading.
 */
const LazySection = ({ loader, fallbackHeight = "300px" }: LazySectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !Component) {
      loader().then((mod) => setComponent(() => mod.default));
    }
  }, [isVisible, loader, Component]);

  return (
    <div ref={ref}>
      {Component ? (
        <Component />
      ) : (
        <div style={{ minHeight: fallbackHeight }} />
      )}
    </div>
  );
};

export default LazySection;
