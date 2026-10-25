"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Luxury boot loader — animated logo, progress counter and a
 * cyber pulse ring. Fades away once the app is mounted.
 */
export function Loader({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let value = 0;
    const interval = window.setInterval(() => {
      value += Math.floor(Math.random() * 22) + 14;
      if (value >= 100) {
        value = 100;
        window.clearInterval(interval);
        window.setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 180);
      }
      setProgress(value);
    }, 70);
    return () => window.clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Loading"
        >
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute inset-0 bg-mesh-blue" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
              <span className="absolute inset-3 rounded-full border border-primary/25 animate-spin-slow border-t-primary" />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-glow">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" aria-hidden>
                  <path
                    d="M12 2l8 3v6c0 5.5-3.5 9.5-8 11-4.5-1.5-8-5.5-8-11V5l8-3z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-8 font-display text-xl font-bold tracking-tight"
          >
            Riyad <span className="text-gradient">Sarkar</span>
          </motion.h1>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-1 text-xs font-medium uppercase tracking-[0.35em] text-muted-foreground"
          >
            Securing Digital Worlds
          </motion.p>

          <div className="mt-10 w-64">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Initializing</span>
              <span className="font-display text-sm font-bold text-primary">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
