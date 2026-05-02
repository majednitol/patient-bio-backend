import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EDGE_ZONE = 20; // px from left edge
const SWIPE_THRESHOLD = 80;

/**
 * Shows a translucent back-arrow when the user touches near the left edge on mobile.
 * Reinforces the native iOS swipe-to-go-back gesture.
 */
export function SwipeBackIndicator() {
  const [visible, setVisible] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const active = useRef(false);
  const navigate = useNavigate();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    if (x <= EDGE_ZONE) {
      startX.current = x;
      active.current = true;
      setVisible(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active.current) return;
    const delta = e.touches[0].clientX - startX.current;
    setDragX(Math.max(0, Math.min(delta, 120)));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!active.current) return;
    if (dragX >= SWIPE_THRESHOLD) {
      navigate(-1);
    }
    active.current = false;
    setVisible(false);
    setDragX(0);
  }, [dragX, navigate]);

  return (
    <div
      className="fixed inset-y-0 left-0 w-5 z-[60] lg:hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: Math.min(dragX / SWIPE_THRESHOLD, 1), x: Math.min(dragX * 0.4, 40) }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute top-1/2 -translate-y-1/2 left-0 w-10 h-10 rounded-full bg-foreground/10 backdrop-blur-sm flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5 text-foreground/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
