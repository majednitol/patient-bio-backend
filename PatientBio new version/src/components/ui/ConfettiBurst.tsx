import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(142 76% 36%)",  // green
  "hsl(48 96% 53%)",   // gold
  "hsl(280 87% 65%)",  // purple
  "hsl(350 89% 60%)",  // pink
];

function makeParticles(count = 24): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 200,
    y: -(Math.random() * 120 + 40),
    rotation: Math.random() * 720 - 360,
    color: COLORS[i % COLORS.length],
    size: Math.random() * 6 + 4,
    delay: Math.random() * 0.15,
  }));
}

interface ConfettiBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export const ConfettiBurst = ({ trigger, onComplete }: ConfettiBurstProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      setParticles(makeParticles());
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-10">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: 0,
              rotate: p.rotation,
              scale: 0.4,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.9,
              delay: p.delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
