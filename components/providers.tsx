"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/lib/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Global providers: theme, language, toasts, tooltips, motion. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <LanguageProvider>
          <ToastProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </ToastProvider>
        </LanguageProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
