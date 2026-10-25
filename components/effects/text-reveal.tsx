"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { duration, easeOutExpo, stagger, viewportOnce } from "@/lib/motion";

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  inView?: boolean;
  gradientWords?: string[];
}

/**
 * Cinematic word-by-word clip reveal used on Hero and section headings.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  inView = false,
  gradientWords = [],
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");
  const highlight = new Set(gradientWords.map((w) => w.toLowerCase()));

  const motionProps = inView
    ? {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: viewportOnce,
      }
    : {
        initial: "hidden" as const,
        animate: "visible" as const,
      };

  return (
    <span className={cn("inline-flex flex-wrap justify-inherit gap-x-[0.28em]", className)}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="relative inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={cn(
              "inline-block origin-bottom will-change-transform",
              highlight.has(word.toLowerCase()) && "text-gradient",
            )}
            {...motionProps}
            variants={{
              hidden: reduceMotion
                ? { y: 0, opacity: 1, rotateX: 0 }
                : { y: "108%", opacity: 0, rotateX: 16 },
              visible: {
                y: "0%",
                opacity: 1,
                rotateX: 0,
                transition: {
                  duration: reduceMotion ? 0 : duration.cinematic,
                  delay: reduceMotion ? 0 : delay + index * stagger.fast,
                  ease: easeOutExpo,
                },
              },
            }}
            style={{ transformPerspective: 600 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Masked line reveal for a block of children (taglines, short copy).
 */
export function LineReveal({
  children,
  className,
  delay = 0,
  inView = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const hidden = reduceMotion ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 };
  const visible = {
    y: 0,
    opacity: 1,
    transition: {
      duration: reduceMotion ? 0 : duration.slow,
      delay: reduceMotion ? 0 : delay,
      ease: easeOutExpo,
    },
  };

  return (
    <span className={cn("block overflow-hidden", className)}>
      <motion.span
        className="block"
        initial={hidden}
        {...(inView
          ? { whileInView: visible, viewport: viewportOnce }
          : { animate: visible })}
      >
        {children}
      </motion.span>
    </span>
  );
}
