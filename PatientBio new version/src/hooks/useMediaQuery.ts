import { useState, useEffect } from "react";

/**
 * Hook to detect if a media query matches.
 * Useful for responsive behavior in JavaScript.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Set initial state
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks matching Tailwind defaults
 */
export const useIsMobile = () => !useMediaQuery("(min-width: 640px)");
export const useIsTablet = () => useMediaQuery("(min-width: 768px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const useIsLargeDesktop = () => useMediaQuery("(min-width: 1280px)");
export const useIsUltrawide = () => useMediaQuery("(min-width: 1920px)");
