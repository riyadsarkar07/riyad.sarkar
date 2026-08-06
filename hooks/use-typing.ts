"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typewriter effect for hero roles. Cycles through words
 * with a type / hold / delete rhythm.
 */
export function useTyping(words: string[], typeSpeed = 70, holdTime = 2200) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = words[wordIndex % words.length];

    const tick = () => {
      const isDeleting = deleting;
      const delta = isDeleting ? typeSpeed / 2 : typeSpeed;

      setText((prev) => {
        if (!isDeleting) {
          return current.slice(0, prev.length + 1);
        }
        return current.slice(0, prev.length - 1);
      });

      if (!isDeleting && text === current) {
        setDeleting(true);
        timeoutRef.current = setTimeout(tick, holdTime);
        return;
      }
      if (isDeleting && text === "") {
        setDeleting(false);
        setWordIndex((i) => (i + 1) % words.length);
        timeoutRef.current = setTimeout(tick, 300);
        return;
      }
      timeoutRef.current = setTimeout(tick, delta);
    };

    timeoutRef.current = setTimeout(tick, deleting ? typeSpeed / 2 : typeSpeed);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [deleting, text, typeSpeed, holdTime, words, wordIndex]);

  return text;
}
