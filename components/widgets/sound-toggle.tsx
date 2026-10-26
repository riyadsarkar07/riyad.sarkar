"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/lib/sound";
import { Button } from "@/components/ui/button";

/** Sound effects toggle — lives in a small floating pill. */
export function SoundToggle() {
  const { enabled, toggle, playClick } = useSound();
  const [nearFooter, setNearFooter] = useState(false);

  useEffect(() => {
    const update = () => {
      const footer = document.querySelector("footer");
      const footerTop = footer ? footer.getBoundingClientRect().top : Number.POSITIVE_INFINITY;
      setNearFooter(footerTop < window.innerHeight - 48);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (nearFooter) return null;

  return (
    <button
      onClick={() => {
        toggle();
        playClick();
      }}
      className="glass-strong fixed bottom-[5.25rem] right-4 z-[70] hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground shadow-glass transition-colors duration-200 hover:text-primary md:flex md:bottom-6 md:right-24"
      aria-label={enabled ? "Disable sound effects" : "Enable sound effects"}
      title={enabled ? "Sound: on" : "Sound: off"}
    >
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.span key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Volume2 className="h-5 w-5" />
          </motion.span>
        ) : (
          <motion.span key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <VolumeX className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** GDPR-friendly cookie consent banner. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("riyad-portfolio-cookie-consent")) {
        const timer = window.setTimeout(() => setVisible(true), 2200);
        return () => window.clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem("riyad-portfolio-cookie-consent", "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const decline = () => {
    try {
      window.localStorage.setItem("riyad-portfolio-cookie-consent", "declined");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="glass-strong fixed inset-x-3 bottom-[6.75rem] z-[110] mx-auto max-w-md rounded-[1.5rem] p-4 shadow-glass-lg sm:inset-x-4 sm:bottom-24 sm:p-5 md:bottom-28"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-glow">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold">We respect your privacy</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                This site uses essential local storage for preferences (theme, language).
                No tracking cookies are used. See the{" "}
                <a href="/privacy" className="font-semibold text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={decline}>
              Decline
            </Button>
            <Button size="sm" onClick={accept}>
              Accept
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
