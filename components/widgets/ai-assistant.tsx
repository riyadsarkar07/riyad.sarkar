"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const knowledge: { keywords: string[]; reply: string }[] = [
  {
    keywords: ["facebook", "fb", "meta"],
    reply:
      "I specialise in Facebook account & page recovery — including hacked, disabled and checkpoint-locked accounts. Most cases are resolved within 24–72 hours.",
  },
  {
    keywords: ["instagram", "insta", "ig"],
    reply:
      "Instagram recovery is one of my most requested services. I recover hacked, disabled or deactivated accounts, usually within 24–72 hours.",
  },
  {
    keywords: ["price", "cost", "charge", "fee", "how much"],
    reply:
      "Consultations start with a free diagnostic discussion. Recovery engagements are quoted per case after I understand the full scope — no hidden fees, ever.",
  },
  {
    keywords: ["business", "company", "brand", "ads", "manager"],
    reply:
      "I help businesses recover Business Manager, ad accounts and pages, plus ongoing protection plans covering monitoring, training and rapid response.",
  },
  {
    keywords: ["google", "gmail", "youtube", "workspace"],
    reply:
      "I recover Google accounts, Gmail, YouTube channels and Google Workspace access through documented verification flows.",
  },
  {
    keywords: ["time", "long", "how long", "duration"],
    reply:
      "Most account recoveries are completed within 24–72 hours. Complex cases involving business verification or financial data can take 3–7 days.",
  },
  {
    keywords: ["privacy", "confidential", "safe", "trust", "secure"],
    reply:
      "Absolutely. Every case is handled with strict confidentiality — documents, communications and case details are never shared.",
  },
  {
    keywords: ["contact", "reach", "book", "consultation", "chat", "whatsapp"],
    reply:
      "You can book a consultation using the form on this page, or reach me directly on WhatsApp, Messenger or Telegram — all links are in the contact section.",
  },
  {
    keywords: ["phishing", "hack", "security", "protect", "protect"],
    reply:
      "Beyond recovery I provide security audits, phishing defense, 2FA setup guidance and identity protection to keep you safe going forward.",
  },
  {
    keywords: ["hello", "hi", "hey", "salam", "assalam"],
    reply: "Hello! How can I help you today? Ask me about account recovery, security services, pricing or how to book a session.",
  },
  {
    keywords: ["who", "you", "riyad"],
    reply:
      "I'm the AI assistant for Riyad Sarkar — a cyber security specialist & digital recovery expert from Bangladesh with 8+ years of experience and 500+ successful recoveries.",
  },
  {
    keywords: ["thank", "thanks"],
    reply: "You're very welcome! If you need anything else, just ask — or book a consultation directly from the form below.",
  },
];

const defaultReply =
  "I can help with account recovery (Facebook, Instagram, Google, YouTube), business security, identity protection and more. Could you tell me which platform or issue you're dealing with?";

function getReply(input: string): string {
  const query = input.toLowerCase();
  let bestIndex = -1;
  let bestHits = 0;
  knowledge.forEach((entry, index) => {
    const hits = entry.keywords.filter((keyword) => query.includes(keyword)).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestIndex = index;
    }
  });
  return bestIndex >= 0 ? knowledge[bestIndex].reply : defaultReply;
}

/** Floating AI chat assistant. */
export function AIAssistant() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: t.ai.greeting },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMessage: Message = { id: Date.now(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    const reply = getReply(trimmed);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: reply },
      ]);
      setTyping(false);
    }, 700 + Math.min(reply.length * 4, 1200));
  };

  const restart = () => {
    setMessages([{ id: Date.now(), role: "assistant", text: t.ai.greeting }]);
  };

  return (
    <>
      {/* Floating action button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        aria-label={t.ai.title}
      >
        <span className="absolute inset-0 rounded-full animate-pulse-ring bg-cyan-400/40" />
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Bot className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass-strong fixed bottom-24 right-6 z-[96] flex h-[min(480px,calc(100dvh-7rem))] w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-3xl shadow-glow-lg sm:right-6"
            role="dialog"
            aria-label={t.ai.title}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-blue-600/10 to-cyan-400/10 px-5 py-4">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold">{t.ai.title}</p>
                <p className="text-[11px] text-muted-foreground">Always online</p>
              </div>
              <button
                onClick={restart}
                className="rounded-full px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t.ai.restart}
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      message.role === "user"
                        ? "rounded-br-md bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-glow"
                        : "rounded-bl-md bg-primary/5 text-foreground",
                    )}
                  >
                    {message.text}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-primary/5 px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border/60 p-3"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.ai.placeholder}
                className="h-11 flex-1 rounded-full border border-input bg-white/60 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary dark:bg-white/5"
                aria-label={t.ai.placeholder}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-glow disabled:opacity-50"
                disabled={!input.trim() || typing}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
