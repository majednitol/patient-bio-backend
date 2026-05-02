import { lazy, Suspense, useEffect, useState } from "react";

const UpdatePrompt = lazy(() => import("./pwa/UpdatePrompt").then(m => ({ default: m.UpdatePrompt })));
const PostInstallWelcome = lazy(() => import("./pwa/PostInstallWelcome").then(m => ({ default: m.PostInstallWelcome })));
const InstallPromptBanner = lazy(() => import("../pages/InstallPage").then(m => ({ default: m.InstallPromptBanner })));

/**
 * Defers loading PWA components until after initial paint + idle time.
 * Prevents UpdatePrompt, PostInstallWelcome, and InstallPromptBanner
 * from blocking the critical rendering path.
 */
export function DeferredPWA() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for idle or 3s max before loading PWA chunks
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const t = setTimeout(() => setReady(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <UpdatePrompt />
      <PostInstallWelcome />
      <InstallPromptBanner />
    </Suspense>
  );
}
