import { useState, useEffect } from "react";

// Check once at module level — avoids re-computation
const isStandalone =
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true);

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    if (!isStandalone) return false;
    const key = "pb_splash_shown";
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  });

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [show]);

  // Skip rendering splash entirely when not standalone — no framer-motion import
  if (!show) return <>{children}</>;

  // Only dynamically import the heavy splash UI when needed
  return <SplashOverlay onDone={() => setShow(false)}>{children}</SplashOverlay>;
}

/** Inline splash overlay — framer-motion dynamically imported */
function SplashOverlay({ children, onDone }: { children: React.ReactNode; onDone: () => void }) {
  const [fm, setFm] = useState<any>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("framer-motion").then((mod) => {
      if (!cancelled) setFm(mod);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDone(); }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  // Show a simple fallback while framer-motion loads
  if (!fm) {
    return (
      <>
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 58%))" }}
        >
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-6">
            <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
              <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="white" fillOpacity="0.15" />
              <path d="M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm-2 23V17h4v14h-4zm-5-7h14v4H17v-4z" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Patient Bio</h1>
          <p className="text-sm text-white/70 mt-1">Your Health Data, Your Control</p>
        </div>
        {children}
      </>
    );
  }

  const { motion, AnimatePresence } = fm;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(316 70% 58%))" }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
              className="mb-6"
            >
              <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none">
                  <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="white" fillOpacity="0.15" />
                  <path d="M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm-2 23V17h4v14h-4zm-5-7h14v4H17v-4z" fill="white" />
                </svg>
              </div>
            </motion.div>
            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-2xl font-bold text-white tracking-tight"
            >
              Patient Bio
            </motion.h1>
            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-sm text-white/70 mt-1"
            >
              Your Health Data, Your Control
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex gap-1.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-white/50"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
