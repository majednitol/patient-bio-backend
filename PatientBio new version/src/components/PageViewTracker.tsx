import { usePageViewTracker } from "@/hooks/usePageViewTracker";

/**
 * Invisible component that tracks page views on route changes.
 * Must be rendered inside BrowserRouter.
 */
export function PageViewTracker() {
  usePageViewTracker();
  return null;
}
