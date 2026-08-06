"use client";

import { useEffect, useRef, useState } from "react";

export interface TypingState {
  text: string;
  isDeleting: boolean;
}

/**
 * Premium typewriter effect for hero roles.
 *
 * Types each word at a calm, readable pace, keeps the full title
 * on screen for `holdTime` (default 3.4s), then deletes it with a
 * smooth fade handled by the caller via `isDeleting`.
 */
export function useTyping(
  words: string[],
  typeSpeed = 90,
  holdTime = 3400,
): TypingState {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    const current = words[wordIndexRef.current % words.length];

    const timer = window.setTimeout(
      () => {
        if (!isDeleting) {
          if (text === current) {
            setIsDeleting(true);
          } else {
            setText(current.slice(0, text.length + 1));
          }
        } else {
          if (text === "") {
            wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
            setIsDeleting(false);
          } else {
            setText(current.slice(0, text.length - 1));
          }
        }
      },
      !isDeleting
        ? text === current
          ? holdTime
          : typeSpeed
        : text === ""
          ? 320
          : typeSpeed / 2,
    );

    return () => window.clearTimeout(timer);
  }, [text, isDeleting, words, typeSpeed, holdTime]);

  return { text, isDeleting };
}
