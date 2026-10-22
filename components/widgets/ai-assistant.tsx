"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CalendarPlus, Headset, Send, Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

interface KnowledgeEntry {
  keywords: string[];
  en: string;
  bn?: string;
}

const contactList =
  "WhatsApp:\n+8801577174050\n\nEmail:\nriyadsarkar1243@gmail.com\n\nFacebook:\nhttps://www.facebook.com/RiyadSarkar007\n\nLinkedIn:\nhttps://www.linkedin.com/in/riyad-sarkar-6694a2180\n\nGitHub:\nhttps://github.com/riyadsarkar07\n\nInstagram:\nhttps://www.instagram.com/riyad__sharker\n\nTelegram:\nhttps://t.me/Riyads11";

const offTopic = {
  en: "I specialize in Riyad Sarkar's cyber security and digital recovery services. For general questions, please contact Riyad directly.",
  bn: "আমি রিয়াদ সরকারের সাইবার সিকিউরিটি এবং ডিজিটাল রিকভারি সেবা সম্পর্কিত বিষয়ে বিশেষজ্ঞ। সাধারণ প্রশ্নের জন্য অনুগ্রহ করে রিয়াদের সাথে সরাসরি যোগাযোগ করুন।",
};

const knowledge: KnowledgeEntry[] = [
  {
    keywords: ["facebook account", "fb account", "facebook hacked", "facebook disabled", "facebook locked", "facebook recovery", "fb recovery", "checkpoint", "facebook unlock", "recover facebook", "ফেসবুক অ্যাকাউন্ট", "ফেসবুক রিকভারি", "ফেসবুক হ্যাক"],
    en: "I specialise in Facebook account recovery — including hacked, disabled and checkpoint-locked accounts. Most cases are resolved within 24–72 hours.",
    bn: "আমি ফেসবুক অ্যাকাউন্ট রিকভারিতে বিশেষজ্ঞ — হ্যাকড, ডিজেবলড এবং চেকপয়েন্ট-লকড অ্যাকাউন্টসহ। বেশিরভাগ কেস ২৪–৭২ ঘণ্টার মধ্যে সমাধান হয়।",
  },
  {
    keywords: ["facebook page", "fb page", "page recovery", "page hacked", "page hijack", "page admin", "business page", "fan page", "page locked", "ফেসবুক পেজ", "পেজ রিকভারি", "পেজ হ্যাক"],
    en: "I recover lost or hijacked Facebook pages and restore admin access so you control your brand again. Most page cases are resolved within 24–72 hours.",
    bn: "আমি হারানো বা হাইজ্যাক হওয়া ফেসবুক পেজ রিকভার করি এবং অ্যাডমিন অ্যাক্সেস ফিরিয়ে দিই যাতে আপনার ব্র্যান্ড আবার আপনার নিয়ন্ত্রণে থাকে। বেশিরভাগ পেজ কেস ২৪–৭২ ঘণ্টায় সমাধান হয়।",
  },
  {
    keywords: ["business manager", "bm recovery", "ad account", "ads manager", "business account", "meta business", "business verification", "bm access", "বিজনেস ম্যানেজার", "বিজনেস অ্যাকাউন্ট", "অ্যাড অ্যাকাউন্ট"],
    en: "I restore access to Meta Business Manager, ad accounts and pages with full ownership verification. I also assist with Meta business verification.",
    bn: "আমি মেটা বিজনেস ম্যানেজার, অ্যাড অ্যাকাউন্ট এবং পেজের অ্যাক্সেস পূর্ণ মালিকানা যাচাইসহ ফিরিয়ে দিই। মেটা বিজনেস ভেরিফিকেশনেও আমি সাহায্য করি।",
  },
  {
    keywords: ["instagram", "insta", "ig recovery", "instagram hacked", "instagram disabled", "instagram locked", "recover instagram", "ইনস্টাগ্রাম", "ইনস্টাগ্রাম রিকভারি", "ইনস্টাগ্রাম হ্যাক"],
    en: "Instagram recovery is one of my most requested services. I recover hacked, disabled or deactivated accounts, usually within 24–72 hours.",
    bn: "ইনস্টাগ্রাম রিকভারি আমার সবচেয়ে চাহিদাসম্পন্ন সেবাগুলোর একটি। আমি হ্যাকড, ডিজেবলড বা ডিঅ্যাক্টিভেট করা অ্যাকাউন্ট রিকভার করি, সাধারণত ২৪–৭২ ঘণ্টার মধ্যে।",
  },
  {
    keywords: ["meta verified", "blue badge", "blue tick", "verification", "verified badge", "মেটা ভেরিফাইড", "ব্লু ব্যাজ"],
    en: "I assist with Meta verification — blue badge and official business verification for pages and brands on Facebook and Instagram.",
    bn: "আমি মেটা ভেরিফিকেশনে সাহায্য করি — ফেসবুক ও ইনস্টাগ্রামে পেজ এবং ব্র্যান্ডের জন্য ব্লু ব্যাজ ও অফিসিয়াল বিজনেস ভেরিফিকেশন।",
  },
  {
    keywords: ["copyright", "dmca", "takedown", "content theft", "content stolen", "infringement", "intellectual property", "copyright strike", "কপিরাইট", "ডিএমসিএ", "টেকডাউন"],
    en: "I handle copyright support — DMCA takedowns and removal of stolen content across social platforms and the web to protect your original work.",
    bn: "আমি কপিরাইট সাপোর্টে সাহায্য করি — সোশ্যাল প্ল্যাটফর্ম ও ওয়েবে চুরি হওয়া কনটেন্ট সরাতে DMCA টেকডাউন করি যাতে আপনার মূল কাজ সুরক্ষিত থাকে।",
  },
  {
    keywords: ["fake account", "fake profile", "fake id", "impersonation", "impersonator", "scam account", "impostor", "fake account removal", "ফেক অ্যাকাউন্ট", "জাল অ্যাকাউন্ট", "ফেক আইডি"],
    en: "I report and remove fake accounts and impersonation profiles that misuse your name or brand — including scam and duplicate accounts.",
    bn: "আমি আপনার নাম বা ব্র্যান্ড ব্যবহার করা ফেক অ্যাকাউন্ট এবং ইমপারসোনেশন প্রোফাইল রিপোর্ট ও রিমুভ করি — স্ক্যাম ও ডুপ্লিকেট অ্যাকাউন্টসহ।",
  },
  {
    keywords: ["identity protection", "identity theft", "digital identity", "dark web", "identity monitoring", "আইডেন্টিটি প্রোটেকশন", "ডার্ক ওয়েব"],
    en: "I offer digital identity protection — proactive monitoring and hardening of your identity across email, social media and the dark web.",
    bn: "আমি ডিজিটাল আইডেন্টিটি প্রোটেকশন অফার করি — ইমেইল, সোশ্যাল মিডিয়া এবং ডার্ক ওয়েবে আপনার পরিচয়ের সক্রিয় পর্যবেক্ষণ ও সুরক্ষা।",
  },
  {
    keywords: ["account security", "secure my account", "protect my account", "account hacked", "my account was hacked", "hack", "hacked", "compromised", "অ্যাকাউন্ট সিকিউরিটি", "অ্যাকাউন্ট হ্যাক", "হ্যাক"],
    en: "I can help you secure your accounts after a hack and prevent future breaches with 2FA setup, password hardening and a clear security roadmap.",
    bn: "হ্যাকের পর আপনার অ্যাকাউন্ট সুরক্ষিত করতে এবং ভবিষ্যতে আবার হ্যাক হওয়া রোধ করতে আমি সাহায্য করতে পারি — 2FA সেটআপ, শক্তিশালী পাসওয়ার্ড ও নিরাপত্তা রোডম্যাপসহ।",
  },
  {
    keywords: ["cyber security", "security consultation", "security audit", "security assessment", "security roadmap", "cyber consultation", "consultation", "সাইবার সিকিউরিটি", "সিকিউরিটি কনসালটেশন", "অডিট"],
    en: "I provide one-on-one cyber security consultation — risk assessment, a clear security roadmap and expert guidance for your personal or business presence.",
    bn: "আমি এক-টু-ওয়ান সাইবার সিকিউরিটি কনসালটেশন দিই — রিস্ক অ্যাসেসমেন্ট, স্পষ্ট নিরাপত্তা রোডম্যাপ এবং ব্যক্তিগত বা ব্যবসায়িক উপস্থিতির জন্য বিশেষজ্ঞ পরামর্শ।",
  },
  {
    keywords: ["website security", "website hacked", "site hacked", "web security", "secure my website", "site security", "ওয়েবসাইট সিকিউরিটি", "সাইট হ্যাক"],
    en: "I help secure websites through email & domain hardening, phishing defense and brand protection — including SPF/DKIM setup and domain abuse monitoring.",
    bn: "ইমেইল ও ডোমেইন সুরক্ষা, ফিশিং ডিফেন্স এবং ব্র্যান্ড প্রোটেকশনের মাধ্যমে আমি ওয়েবসাইট সুরক্ষিত করতে সাহায্য করি — SPF/DKIM সেটআপ ও ডোমেইন অপব্যবহার পর্যবেক্ষণসহ।",
  },
  {
    keywords: ["dns", "domain", "domain security", "dns security", "domain hijack", "domain protection", "ডোমেইন", "ডিএনএস"],
    en: "Domain & DNS security is part of my brand protection service — securing your domain, monitoring abuse and defending against hijacking.",
    bn: "ডোমেইন ও DNS সিকিউরিটি আমার ব্র্যান্ড প্রোটেকশন সেবার অংশ — ডোমেইন সুরক্ষা, অপব্যবহার পর্যবেক্ষণ এবং হাইজ্যাকিং থেকে রক্ষা।",
  },
  {
    keywords: ["email security", "phishing", "spoofing", "spf", "dkim", "email hacked", "email protection", "ইমেইল সিকিউরিটি", "ফিশিং"],
    en: "I protect inboxes from phishing, spoofing and takeover with SPF/DKIM setup and email security best practices.",
    bn: "SPF/DKIM সেটআপ এবং ইমেইল সিকিউরিটি সেরা অনুশীলনের মাধ্যমে আমি ইনবক্সকে ফিশিং, স্পুফিং ও টেকওভার থেকে রক্ষা করি।",
  },
  {
    keywords: ["2fa", "two factor", "two-factor", "mfa", "authenticator", "otp", "two step verification", "টু ফ্যাক্টর", "টু-ফ্যাক্টর"],
    en: "I can guide you through setting up two-factor authentication (2FA) to lock down your accounts — a key part of my account security services.",
    bn: "আমি আপনার অ্যাকাউন্ট সুরক্ষিত করতে টু-ফ্যাক্টর অথেনটিকেশন (2FA) সেটআপে গাইড করি — এটি আমার অ্যাকাউন্ট সিকিউরিটি সেবার গুরুত্বপূর্ণ অংশ।",
  },
  {
    keywords: ["password", "passwords", "strong password", "password manager", "password breach", "change password", "পাসওয়ার্ড", "পাসওয়ার্ড পরিবর্তন"],
    en: "I help with strong password practices and post-breach password security as part of my account security and identity protection services.",
    bn: "আমার অ্যাকাউন্ট সিকিউরিটি ও আইডেন্টিটি প্রোটেকশন সেবার অংশ হিসেবে আমি শক্তিশালী পাসওয়ার্ড ব্যবহার এবং হ্যাকের পর পাসওয়ার্ড সুরক্ষায় সাহায্য করি।",
  },
  {
    keywords: ["book", "booking", "appointment", "schedule", "reserve", "book a consultation", "book appointment", "অ্যাপয়েন্টমেন্ট", "বুক", "কনসালটেশন বুক"],
    en: "You can book a consultation by tapping the 'Book Consultation' button — it opens the consultation form where you choose a service and time. For urgent help, message me on WhatsApp.",
    bn: "আপনি 'Book Consultation' বোতামে ট্যাপ করে কনসালটেশন বুক করতে পারবেন — সেখানে সেবা ও সময় বেছে নিতে পারবেন। জরুরি সাহায্যে WhatsApp-এ মেসেজ করুন।",
  },
  {
    keywords: ["price", "pricing", "cost", "charge", "fee", "how much", "rate", "price list", "মূল্য", "দাম", "কত টাকা"],
    en: "Consultations start with a free diagnostic discussion. Recovery engagements are quoted per case after I understand the full scope — no hidden fees, ever.",
    bn: "কনসালটেশন শুরু হয় একটি ফ্রি ডায়াগনস্টিক আলোচনার মাধ্যমে। পূর্ণ পরিসীমা বুঝে প্রতিটি কেসের ভিত্তিতে রিকভারির মূল্য নির্ধারণ করা হয় — কোনো লুকানো ফি নেই।",
  },
  {
    keywords: ["contact", "reach", "whatsapp", "phone", "email", "address", "telegram", "linkedin", "instagram", "facebook profile", "how to contact", "reach you", "contact info", "যোগাযোগ", "কন্টাক্ট", "ফোন", "ইমেইল"],
    en: `Here are Riyad's contact details:\n\n${contactList}`,
    bn: `এখানে রিয়াদের যোগাযোগের তথ্য:\n\n${contactList}`,
  },
  {
    keywords: ["services", "what services", "do you offer", "what do you do", "help me with", "can you help", "সেবা", "কী কী সেবা"],
    en: "I offer cyber security & digital recovery services including: Facebook account & page recovery, Instagram recovery, Business Manager recovery, Meta verification, copyright support, fake account removal, identity protection, email & website security, and security consultation. Ask me about any of these!",
    bn: "আমি সাইবার সিকিউরিটি ও ডিজিটাল রিকভারি সেবা দিই — ফেসবুক অ্যাকাউন্ট ও পেজ রিকভারি, ইনস্টাগ্রাম রিকভারি, বিজনেস ম্যানেজার রিকভারি, মেটা ভেরিফিকেশন, কপিরাইট সাপোর্ট, ফেক অ্যাকাউন্ট রিমুভাল, আইডেন্টিটি প্রোটেকশন, ইমেইল ও ওয়েবসাইট সিকিউরিটি এবং সিকিউরিটি কনসালটেশনসহ। যেকোনো একটি সম্পর্কে জিজ্ঞাসা করুন!",
  },
  {
    keywords: ["hello", "hi", "hey", "salam", "assalam", "hlw", "হ্যালো", "আসসালামু", "সালাম"],
    en: "Hello! How can I help you today? Ask me about account recovery, security, pricing or booking a consultation.",
    bn: "হ্যালো! আজকে আমি কীভাবে আপনাকে সাহায্য করতে পারি? অ্যাকাউন্ট রিকভারি, সিকিউরিটি, মূল্য বা কনসালটেশন বুকিং সম্পর্কে জিজ্ঞাসা করুন।",
  },
  {
    keywords: ["who", "about riyad", "riyad sarkar", "your owner", "who created you", "who are you", "রিয়াদ", "আপনি কে"],
    en: "I'm Riyad's AI assistant. Riyad Sarkar is a cyber security specialist & digital recovery expert from Bangladesh with 8+ years of experience and 500+ successful recoveries.",
    bn: "আমি রিয়াদের AI সহকারী। রিয়াদ সরকার বাংলাদেশের একজন সাইবার সিকিউরিটি বিশেষজ্ঞ ও ডিজিটাল রিকভারি এক্সপার্ট — ৮+ বছরের অভিজ্ঞতা এবং ৫০০+ সফল রিকভারি।",
  },
  {
    keywords: ["thank", "thanks", "dhanyabad", "shukria", "ধন্যবাদ", "শুকরিয়া"],
    en: "You're welcome! If you need anything else, just ask — or book a consultation.",
    bn: "আপনাকে স্বাগতম! আর কিছু লাগলে জিজ্ঞাসা করুন — অথবা একটি কনসালটেশন বুক করুন।",
  },
];

const BANGLA_RE = /[\u0980-\u09FF]/;

function matches(keyword: string, query: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(query);
}

function getReply(input: string, lang: "en" | "bn"): string {
  const query = input.toLowerCase();
  const banglaInput = BANGLA_RE.test(input);
  let best: KnowledgeEntry | undefined;
  let bestHits = 0;

  knowledge.forEach((entry) => {
    const hits = entry.keywords.filter((keyword) => matches(keyword, query)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = entry;
    }
  });

  if (!best) {
    return banglaInput || lang === "bn" ? offTopic.bn : offTopic.en;
  }
  const useBn = banglaInput || lang === "bn";
  return useBn && best.bn ? best.bn : best.en;
}

/** Floating AI chat assistant — Riyad AI Assistant. */
export function AIAssistant() {
  const { t, lang } = useI18n();
  const { user } = useSession();
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
    setMessages((prev) =>
      prev.length === 1 ? [{ id: Date.now(), role: "assistant", text: t.ai.greeting }] : prev,
    );
  }, [lang, t.ai.greeting]);

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

    const reply = getReply(trimmed, lang);
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
        className="fixed bottom-4 right-3 z-[95] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-glow-lg sm:h-14 sm:w-14 md:bottom-6 md:right-6"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={t.ai.title}
      >
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
            initial={{ opacity: 0, y: 24, scale: 0.92, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.95, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass-strong fixed bottom-[4.75rem] right-3 z-[96] flex h-[min(520px,calc(100dvh-7.5rem))] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl shadow-glow-lg sm:bottom-24 sm:right-4 md:right-6"
            role="dialog"
            aria-label={t.ai.title}
          >
            {/* Floating glow blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/25 blur-3xl" />
              <div className="animate-float-slow absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            </div>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-blue-600/10 to-cyan-400/10 px-5 py-4">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold">{t.ai.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{t.ai.subtitle}</p>
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
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
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
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick suggestions */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {t.ai.suggestions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => send(label)}
                  className="shrink-0 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Portal shortcuts */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-2 pt-1">
              <Link
                href={user ? "/dashboard/appointments/new" : "/login"}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-gradient-to-r from-blue-600/15 to-cyan-400/15 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:from-blue-600/25 hover:to-cyan-400/25"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Book Appointment
              </Link>
              <Link
                href={user ? "/dashboard/support" : "/login"}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-primary/10"
              >
                <Headset className="h-3.5 w-3.5" /> Open Support
              </Link>
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
