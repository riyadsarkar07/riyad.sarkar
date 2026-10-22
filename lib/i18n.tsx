"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "bn";

type Dictionary = {
  nav: {
    home: string;
    about: string;
    services: string;
    experience: string;
    achievements: string;
    certificates: string;
    testimonials: string;
    blog: string;
    faq: string;
    gallery: string;
    contact: string;
  };
  hero: {
    greeting: string;
    name: string;
    role1: string;
    role2: string;
    location: string;
    tagline: string;
    primaryCta: string;
    downloadCv: string;
    verified: string;
    verifiedSub: string;
    scroll: string;
  };
  stats: {
    title: string;
    recoveries: string;
    recoveriesLabel: string;
    successRate: string;
    successRateLabel: string;
    years: string;
    yearsLabel: string;
    support: string;
    supportLabel: string;
    clients: string;
    clientsLabel: string;
  };
  common: {
    learnMore: string;
    viewAll: string;
    viewCertificate: string;
    verify: string;
    backToTop: string;
    bookConsultation: string;
    startProject: string;
    contactMe: string;
    readMore: string;
    close: string;
    search: string;
    searchPlaceholder: string;
    noResults: string;
    languageName: string;
    menu: string;
    skipToContent: string;
  };
  consultation: {
    title: string;
    subtitle: string;
    fullName: string;
    email: string;
    phone: string;
    service: string;
    servicePlaceholder: string;
    date: string;
    time: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    successSub: string;
    error: string;
    selectService: string;
    required: string;
  };
  contact: {
    title: string;
    subtitle: string;
    location: string;
    response: string;
    responseValue: string;
    startProject: string;
    formTitle: string;
    formSubtitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    projectType: string;
    projectTypePlaceholder: string;
    budget: string;
    budgetPlaceholder: string;
    timeline: string;
    timelinePlaceholder: string;
    message: string;
    messagePlaceholder: string;
    optional: string;
    submit: string;
    submitting: string;
    success: string;
    successSub: string;
    error: string;
    required: string;
    privacy: string;
    channels: string;
    availabilityNote: string;
    sendAnother: string;
  };
  footer: {
    tagline: string;
    quickLinks: string;
    services: string;
    follow: string;
    rights: string;
    madeWith: string;
    privacy: string;
    terms: string;
  };
  ai: {
    title: string;
    subtitle: string;
    placeholder: string;
    greeting: string;
    restart: string;
    suggestions: string[];
  };
  blog: {
    title: string;
    subtitle: string;
    readTime: string;
    mins: string;
    backToBlog: string;
  };
  gallery: {
    title: string;
    subtitle: string;
  };
};

const en: Dictionary = {
  nav: {
    home: "Home",
    about: "About",
    services: "Services",
    experience: "Experience",
    achievements: "Achievements",
    certificates: "Certificates",
    testimonials: "Testimonials",
    blog: "Blog",
    faq: "FAQ",
    gallery: "Gallery",
    contact: "Contact",
  },
  hero: {
    greeting: "Hello, I am",
    name: "Riyad Sarkar",
    role1: "Cyber Security Specialist",
    role2: "Digital Recovery Expert",
    location: "Bangladesh",
    tagline:
      "Recovering what matters and protecting what you've built — premium account recovery, digital identity protection and business cyber security.",
    primaryCta: "Book Consultation",
    downloadCv: "Download CV",
    verified: "Verified Professional",
    verifiedSub: "Premium certified security specialist",
    scroll: "Scroll to explore",
  },
  stats: {
    title: "Trusted by individuals & businesses worldwide",
    recoveries: "Successful Recoveries",
    recoveriesLabel: "Recoveries",
    successRate: "Success Rate",
    successRateLabel: "Success rate",
    years: "Years Experience",
    yearsLabel: "Experience",
    support: "Support",
    supportLabel: "Availability",
    clients: "Business Clients",
    clientsLabel: "Business clients",
  },
  common: {
    learnMore: "Learn More",
    viewAll: "View all",
    viewCertificate: "View Certificate",
    verify: "Verify",
    backToTop: "Back to top",
    bookConsultation: "Book Consultation",
    startProject: "Start a Project",
    contactMe: "Contact Me",
    readMore: "Read More",
    close: "Close",
    search: "Search",
    searchPlaceholder: "Search pages, services, articles…",
    noResults: "No results found",
    languageName: "English",
    menu: "Menu",
    skipToContent: "Skip to content",
  },
  consultation: {
    title: "Book a Consultation",
    subtitle:
      "Schedule a private session for account recovery, cyber security audit or business protection strategy.",
    fullName: "Full name",
    email: "Email address",
    phone: "Phone / WhatsApp",
    service: "Select a service",
    servicePlaceholder: "Choose the service you need",
    date: "Preferred date",
    time: "Preferred time",
    message: "Describe your case",
    messagePlaceholder:
      "Briefly describe your situation — the platform, what happened, and any details you can share.",
    submit: "Request Consultation",
    submitting: "Sending…",
    success: "Request received!",
    successSub: "Your consultation request has been sent. I will get back to you within 24 hours.",
    error: "Something went wrong. Please try again or contact me directly.",
    selectService: "Select a service",
    required: "This field is required",
  },
  contact: {
    title: "Let's Work Together",
    subtitle:
      "Tell me about your website, web app or security project — or reach me on a professional channel below.",
    location: "Bangladesh",
    response: "Average response time",
    responseValue: "Under 24 hours",
    startProject: "Start a Project",
    formTitle: "Project enquiry",
    formSubtitle: "Share a few details and I will follow up by email.",
    fullName: "Full name",
    fullNamePlaceholder: "Your name",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    projectType: "Project type",
    projectTypePlaceholder: "Select a project type",
    budget: "Budget range",
    budgetPlaceholder: "Optional",
    timeline: "Project timeline",
    timelinePlaceholder: "Optional",
    message: "Message / project details",
    messagePlaceholder:
      "What are you building, what do you need help with, and any constraints I should know?",
    optional: "Optional",
    submit: "Send enquiry",
    submitting: "Sending…",
    success: "Message sent",
    successSub: "Thanks — your enquiry was delivered. I will reply by email.",
    error: "Something went wrong. Please try again or email me directly.",
    required: "This field is required",
    privacy:
      "Your details are used only to reply to this enquiry. Nothing is stored in a public database.",
    channels: "Professional channels",
    availabilityNote: "Open to website, web app and security consultation work.",
    sendAnother: "Send another message",
  },
  footer: {
    tagline:
      "Premium cyber security, account recovery and digital protection for individuals and businesses.",
    quickLinks: "Quick Links",
    services: "Services",
    follow: "Follow Me",
    rights: "All rights reserved.",
    madeWith: "Crafted with precision",
    privacy: "Privacy",
    terms: "Terms",
  },
  ai: {
    title: "Riyad AI Assistant",
    subtitle: "Cyber Security & Digital Recovery Assistant",
    placeholder: "Ask about recovery, security, pricing…",
    greeting:
      "Hello! I'm Riyad's AI Assistant.\n\nI can help you with cyber security, account recovery, digital identity protection, appointments, and general questions about Riyad Sarkar's professional services.",
    restart: "Start over",
    suggestions: [
      "Facebook Recovery",
      "Instagram Recovery",
      "Business Manager",
      "Copyright",
      "Pricing",
      "Book Appointment",
      "Contact",
    ],
  },
  blog: {
    title: "Latest Insights",
    subtitle: "Cyber security guides, recovery tutorials and digital protection strategies.",
    readTime: "min read",
    mins: "min read",
    backToBlog: "Back to articles",
  },
  gallery: {
    title: "Behind the Operations",
    subtitle: "A glimpse into the cyber security lab — dashboards, servers and digital defense.",
  },
};

const bn: Dictionary = {
  nav: {
    home: "হোম",
    about: "পরিচিতি",
    services: "সেবাসমূহ",
    experience: "অভিজ্ঞতা",
    achievements: "সাফল্য",
    certificates: "সার্টিফিকেট",
    testimonials: "মতামত",
    blog: "ব্লগ",
    faq: "প্রশ্নোত্তর",
    gallery: "গ্যালারি",
    contact: "যোগাযোগ",
  },
  hero: {
    greeting: "আসসালামু আলাইকুম, আমি",
    name: "রিয়াদ সরকার",
    role1: "সাইবার সিকিউরিটি বিশেষজ্ঞ",
    role2: "ডিজিটাল রিকভারি বিশেষজ্ঞ",
    location: "বাংলাদেশ",
    tagline:
      "আপনার মূল্যবান অ্যাকাউন্ট উদ্ধার এবং সুরক্ষা — প্রিমিয়াম অ্যাকাউন্ট রিকভারি, ডিজিটাল আইডেন্টিটি প্রোটেকশন এবং ব্যবসায়িক সাইবার সিকিউরিটি।",
    primaryCta: "পরামর্শ বুক করুন",
    downloadCv: "সিভি ডাউনলোড",
    verified: "ভেরিফায়েড প্রফেশনাল",
    verifiedSub: "প্রিমিয়াম সনদপ্রাপ্ত নিরাপত্তা বিশেষজ্ঞ",
    scroll: "স্ক্রল করে দেখুন",
  },
  stats: {
    title: "বিশ্বজুড়ে ব্যক্তি ও ব্যবসার আস্থা",
    recoveries: "সফল রিকভারি",
    recoveriesLabel: "রিকভারি",
    successRate: "সাফল্যের হার",
    successRateLabel: "সাফল্যের হার",
    years: "বছরের অভিজ্ঞতা",
    yearsLabel: "অভিজ্ঞতা",
    support: "সাপোর্ট",
    supportLabel: "প্রাপ্যতা",
    clients: "ব্যবসায়িক ক্লায়েন্ট",
    clientsLabel: "ব্যবসায়িক ক্লায়েন্ট",
  },
  common: {
    learnMore: "বিস্তারিত",
    viewAll: "সব দেখুন",
    viewCertificate: "সার্টিফিকেট দেখুন",
    verify: "যাচাই করুন",
    backToTop: "উপরে যান",
    bookConsultation: "পরামর্শ বুক করুন",
    startProject: "প্রজেক্ট শুরু করুন",
    contactMe: "যোগাযোগ করুন",
    readMore: "আরও পড়ুন",
    close: "বন্ধ করুন",
    search: "অনুসন্ধান",
    searchPlaceholder: "পেজ, সেবা, আর্টিকেল অনুসন্ধান…",
    noResults: "কিছু পাওয়া যায়নি",
    languageName: "বাংলা",
    menu: "মেনু",
    skipToContent: "কনটেন্টে যান",
  },
  consultation: {
    title: "পরামর্শ বুক করুন",
    subtitle:
      "অ্যাকাউন্ট রিকভারি, সাইবার সিকিউরিটি অডিট বা ব্যবসায়িক সুরক্ষা কৌশলের জন্য ব্যক্তিগত সেশন বুক করুন।",
    fullName: "পূর্ণ নাম",
    email: "ইমেইল ঠিকানা",
    phone: "ফোন / হোয়াটসঅ্যাপ",
    service: "সেবা নির্বাচন করুন",
    servicePlaceholder: "যে সেবা প্রয়োজন সেটি বেছে নিন",
    date: "পছন্দের তারিখ",
    time: "পছন্দের সময়",
    message: "আপনার সমস্যা লিখুন",
    messagePlaceholder: "আপনার পরিস্থিতি সংক্ষেপে লিখুন — প্ল্যাটফর্ম, কী ঘটেছে এবং অন্যান্য তথ্য।",
    submit: "অনুরোধ পাঠান",
    submitting: "পাঠানো হচ্ছে…",
    success: "অনুরোধ গৃহীত হয়েছে!",
    successSub: "আপনার পরামর্শের অনুরোধ পাঠানো হয়েছে। ২৪ ঘণ্টার মধ্যে যোগাযোগ করা হবে।",
    error: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন বা সরাসরি যোগাযোগ করুন।",
    selectService: "সেবা নির্বাচন করুন",
    required: "এই ঘরটি পূরণ করা প্রয়োজন",
  },
  contact: {
    title: "আসুন একসাথে কাজ করি",
    subtitle:
      "আপনার ওয়েবসাইট, ওয়েব অ্যাপ বা সিকিউরিটি প্রজেক্ট সম্পর্কে লিখুন — অথবা নিচের পেশাদার মাধ্যমে যোগাযোগ করুন।",
    location: "বাংলাদেশ",
    response: "গড় প্রতিক্রিয়া সময়",
    responseValue: "২৪ ঘণ্টার মধ্যে",
    startProject: "প্রজেক্ট শুরু করুন",
    formTitle: "প্রজেক্ট এনকোয়ারি",
    formSubtitle: "কয়েকটি তথ্য শেয়ার করুন, আমি ইমেইলে উত্তর দেব।",
    fullName: "পূর্ণ নাম",
    fullNamePlaceholder: "আপনার নাম",
    email: "ইমেইল ঠিকানা",
    emailPlaceholder: "you@example.com",
    projectType: "প্রজেক্টের ধরন",
    projectTypePlaceholder: "প্রজেক্টের ধরন বেছে নিন",
    budget: "বাজেট রেঞ্জ",
    budgetPlaceholder: "ঐচ্ছিক",
    timeline: "প্রজেক্টের সময়সীমা",
    timelinePlaceholder: "ঐচ্ছিক",
    message: "বার্তা / প্রজেক্টের বিবরণ",
    messagePlaceholder:
      "আপনি কী তৈরি করছেন, কী সাহায্য প্রয়োজন, এবং যেকোনো সীমাবদ্ধতা লিখুন।",
    optional: "ঐচ্ছিক",
    submit: "এনকোয়ারি পাঠান",
    submitting: "পাঠানো হচ্ছে…",
    success: "বার্তা পাঠানো হয়েছে",
    successSub: "ধন্যবাদ — আপনার এনকোয়ারি পৌঁছেছে। আমি ইমেইলে উত্তর দেব।",
    error: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন বা সরাসরি ইমেইল করুন।",
    required: "এই ঘরটি পূরণ করা প্রয়োজন",
    privacy:
      "আপনার তথ্য শুধু এই এনকোয়ারির উত্তর দিতে ব্যবহার করা হয়। পাবলিক ডাটাবেসে কিছু সংরক্ষণ করা হয় না।",
    channels: "পেশাদার মাধ্যম",
    availabilityNote: "ওয়েবসাইট, ওয়েব অ্যাপ এবং সিকিউরিটি কনসালটেশনের জন্য উন্মুক্ত।",
    sendAnother: "আরেকটি বার্তা পাঠান",
  },
  footer: {
    tagline:
      "ব্যক্তি ও ব্যবসার জন্য প্রিমিয়াম সাইবার সিকিউরিটি, অ্যাকাউন্ট রিকভারি এবং ডিজিটাল সুরক্ষা।",
    quickLinks: "কুইক লিংক",
    services: "সেবাসমূহ",
    follow: "অনুসরণ করুন",
    rights: "সর্বস্বত্ব সংরক্ষিত।",
    madeWith: "যত্ন সহকারে নির্মিত",
    privacy: "প্রাইভেসি",
    terms: "শর্তাবলী",
  },
  ai: {
    title: "রিয়াদ AI সহকারী",
    subtitle: "সাইবার সিকিউরিটি ও ডিজিটাল রিকভারি সহকারী",
    placeholder: "রিকভারি, সিকিউরিটি, মূল্য সম্পর্কে জিজ্ঞাসা করুন…",
    greeting:
      "হ্যালো! আমি রিয়াদের AI সহকারী।\n\nআমি সাইবার সিকিউরিটি, অ্যাকাউন্ট রিকভারি, ডিজিটাল আইডেন্টিটি প্রোটেকশন, অ্যাপয়েন্টমেন্ট এবং রিয়াদ সরকারের পেশাদার সেবা সম্পর্কিত যেকোনো প্রশ্নে আপনাকে সাহায্য করতে পারি।",
    restart: "পুনরায় শুরু করুন",
    suggestions: [
      "ফেসবুক রিকভারি",
      "ইনস্টাগ্রাম রিকভারি",
      "বিজনেস ম্যানেজার",
      "কপিরাইট",
      "মূল্য",
      "অ্যাপয়েন্টমেন্ট বুক",
      "যোগাযোগ",
    ],
  },
  blog: {
    title: "সাম্প্রতিক লেখা",
    subtitle: "সাইবার সিকিউরিটি গাইড, রিকভারি টিউটোরিয়াল এবং ডিজিটাল সুরক্ষা কৌশল।",
    readTime: "মিনিট পড়া",
    mins: "মিনিট",
    backToBlog: "লেখায় ফিরে যান",
  },
  gallery: {
    title: "অপারেশনের ভেতরে",
    subtitle: "সাইবার সিকিউরিটি ল্যাব — ড্যাশবোর্ড, সার্ভার এবং ডিজিটাল প্রতিরক্ষার আভাস।",
  },
};

const dictionaries: Record<Language, Dictionary> = { en, bn };

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "riyad-portfolio-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "en" || stored === "bn") {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: dictionaries[lang] }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }
  return ctx;
}
