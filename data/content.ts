import type {
  Achievement,
  BlogPost,
  Certificate,
  ExperienceItem,
  FaqItem,
  GalleryItem,
  Service,
  Stat,
  Testimonial,
  Tool,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Site identity                                                       */
/* ------------------------------------------------------------------ */

export const profile = {
  name: "Riyad Sarkar",
  initials: "RS",
  role: "Cyber Security Specialist & Digital Recovery Expert",
  location: "Bangladesh",
  email: process.env.NEXT_PUBLIC_PROFILE_EMAIL ?? "riyadsarkar1243@gmail.com",
  whatsapp: process.env.NEXT_PUBLIC_PROFILE_WHATSAPP ?? "+8801577174050",
  cvUrl: process.env.NEXT_PUBLIC_CV_URL ?? "/cv/Riyad-Sarkar-CV.pdf",
  avatar: "/profile.webp",
};

export const socials = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    href: process.env.NEXT_PUBLIC_PROFILE_WHATSAPP
      ? `https://wa.me/${process.env.NEXT_PUBLIC_PROFILE_WHATSAPP.replace(/[^0-9]/g, "")}`
      : "https://wa.me/8801577174050",
  },
  {
    id: "messenger",
    label: "Messenger",
    href: process.env.NEXT_PUBLIC_PROFILE_FACEBOOK ?? "https://www.facebook.com/RiyadSarkar007",
  },
  {
    id: "email",
    label: "Email",
    href: `mailto:${process.env.NEXT_PUBLIC_PROFILE_EMAIL ?? "riyadsarkar1243@gmail.com"}`,
  },
  {
    id: "github",
    label: "GitHub",
    href: process.env.NEXT_PUBLIC_PROFILE_GITHUB ?? "https://github.com/riyadsarkar07",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: process.env.NEXT_PUBLIC_PROFILE_LINKEDIN ?? "https://www.linkedin.com/in/riyad-sarkar-6694a2180",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: process.env.NEXT_PUBLIC_PROFILE_FACEBOOK ?? "https://www.facebook.com/RiyadSarkar007",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: process.env.NEXT_PUBLIC_PROFILE_INSTAGRAM ?? "https://www.instagram.com/riyad__sharker",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: process.env.NEXT_PUBLIC_PROFILE_TELEGRAM ?? "https://t.me/Riyads11",
  },
];

export const typingWords = [
  "Cyber Security",
  "Digital Recovery",
  "Online Protection",
  "Business Security",
  "Account Recovery",
];

/* ------------------------------------------------------------------ */
/*  Navigation                                                          */
/* ------------------------------------------------------------------ */

export const navItems = [
  { id: "home", labelKey: "home", href: "#home" },
  { id: "about", labelKey: "about", href: "#about" },
  { id: "services", labelKey: "services", href: "#services" },
  { id: "experience", labelKey: "experience", href: "#experience" },
  { id: "achievements", labelKey: "achievements", href: "#achievements" },
  { id: "certificates", labelKey: "certificates", href: "#certificates" },
  { id: "testimonials", labelKey: "testimonials", href: "#testimonials" },
  { id: "blog", labelKey: "blog", href: "#blog" },
  { id: "faq", labelKey: "faq", href: "#faq" },
  { id: "gallery", labelKey: "gallery", href: "#gallery" },
  { id: "contact", labelKey: "contact", href: "#contact" },
];

export const sectionIds = navItems.map((item) => item.id);

/* ------------------------------------------------------------------ */
/*  Stats                                                               */
/* ------------------------------------------------------------------ */

export const stats: Stat[] = [
  { value: 500, suffix: "+", labelKey: "recoveries" },
  { value: 99, suffix: "%", labelKey: "successRate" },
  { value: 8, suffix: "+", labelKey: "years" },
  { value: 24, suffix: "/7", labelKey: "support" },
  { value: 100, suffix: "+", labelKey: "clients" },
];

/* ------------------------------------------------------------------ */
/*  Services                                                            */
/* ------------------------------------------------------------------ */

export const services: Service[] = [
  {
    id: "facebook-account",
    title: "Facebook Account Recovery",
    description:
      "Regain access to disabled, hacked, or locked Facebook accounts with a proven, documented recovery process.",
    icon: "facebook",
    features: ["Hacked accounts", "Disabled accounts", "Locked / checkpoint"],
    gradient: "from-sky-500/20 to-blue-600/10",
    category: "Account Recovery",
    featured: true,
  },
  {
    id: "facebook-page",
    title: "Facebook Page Recovery",
    description:
      "Recover lost or hijacked business pages, restore admin access and secure your brand presence.",
    icon: "globe",
    features: ["Page hijacking", "Lost admin access", "Fan page restoration"],
    gradient: "from-blue-600/20 to-indigo-600/10",
    category: "Account Recovery",
  },
  {
    id: "instagram-recovery",
    title: "Instagram Recovery",
    description:
      "Recover hacked, disabled or deactivated Instagram accounts and secure your personal brand.",
    icon: "instagram",
    features: ["Hacked accounts", "Disabled accounts", "Two-factor lockout"],
    gradient: "from-fuchsia-500/15 to-pink-500/10",
    category: "Account Recovery",
    featured: true,
  },
  {
    id: "business-manager",
    title: "Business Manager Recovery",
    description:
      "Restore access to Meta Business Manager, Ad accounts and pages with full ownership verification.",
    icon: "briefcase",
    features: ["BM ownership", "Ad account access", "Business verification"],
    gradient: "from-cyan-500/20 to-blue-500/10",
    category: "Meta & Advertising",
    featured: true,
  },
  {
    id: "facebook-ads",
    title: "Facebook Ads Recovery",
    description:
      "Recover suspended ad accounts, lift restrictions and restore access to your advertising capital.",
    icon: "megaphone",
    features: ["Ad account bans", "Payment issues", "Account quality flags"],
    gradient: "from-amber-500/15 to-orange-500/10",
    category: "Meta & Advertising",
  },
  {
    id: "meta-verification",
    title: "Meta Business Verification",
    description:
      "Complete blue badge verification and business verification for pages and brands on Meta platforms.",
    icon: "badgeCheck",
    features: ["Blue badge", "Business verification", "Official status"],
    gradient: "from-blue-500/20 to-sky-500/10",
    category: "Meta & Advertising",
  },
  {
    id: "youtube-recovery",
    title: "YouTube Recovery",
    description:
      "Regain access to hacked or lost YouTube channels and secure your creator business.",
    icon: "youtube",
    features: ["Channel hijacking", "Brand account access", "Monetization restore"],
    gradient: "from-red-500/15 to-rose-500/10",
    category: "Account Recovery",
  },
  {
    id: "google-account",
    title: "Google Account Recovery",
    description:
      "Recover Google accounts, Gmail, Google Ads and Google Workspace access with secure verification.",
    icon: "mail",
    features: ["Gmail recovery", "Google Ads access", "Workspace restore"],
    gradient: "from-emerald-500/15 to-teal-500/10",
    category: "Account Recovery",
  },
  {
    id: "copyright",
    title: "Copyright Assistance",
    description:
      "File copyright takedowns and protect your original content across social platforms and the web.",
    icon: "copyright",
    features: ["DMCA takedowns", "Content theft", "Copyright registration"],
    gradient: "from-indigo-500/20 to-violet-500/10",
    category: "Content & Identity",
  },
  {
    id: "dmca",
    title: "DMCA Consultation",
    description:
      "Professional guidance through the DMCA process — notices, counter-notices and takedowns.",
    icon: "scale",
    features: ["Takedown notices", "Legal guidance", "Retraction strategy"],
    gradient: "from-purple-500/15 to-indigo-500/10",
    category: "Content & Identity",
  },
  {
    id: "fake-account",
    title: "Fake Account Removal",
    description:
      "Report and remove impersonation accounts and fraudulent profiles that misuse your identity.",
    icon: "userX",
    features: ["Impersonation", "Scam accounts", "Brand impersonation"],
    gradient: "from-rose-500/15 to-red-500/10",
    category: "Content & Identity",
  },
  {
    id: "identity-protection",
    title: "Identity Protection",
    description:
      "Proactive safeguards for your digital identity across email, social media and the dark web.",
    icon: "fingerprint",
    features: ["Identity monitoring", "Dark web alerts", "Preventive hardening"],
    gradient: "from-sky-500/20 to-cyan-500/10",
    category: "Content & Identity",
    featured: true,
  },
  {
    id: "security-consultation",
    title: "Security Consultation",
    description:
      "One-on-one expert consultation to assess, harden and secure your personal or business digital presence.",
    icon: "shieldCheck",
    features: ["Risk assessment", "Security roadmap", "Expert guidance"],
    gradient: "from-blue-600/20 to-cyan-500/10",
    category: "Security & Advisory",
    featured: true,
  },
  {
    id: "privacy-protection",
    title: "Privacy Protection",
    description:
      "Minimise your digital footprint and lock down your privacy across platforms and services.",
    icon: "lock",
    features: ["Privacy audit", "Data minimization", "Exposure removal"],
    gradient: "from-teal-500/15 to-emerald-500/10",
    category: "Security & Advisory",
  },
  {
    id: "risk-assessment",
    title: "Digital Risk Assessment",
    description:
      "A deep security audit of your accounts, passwords, and exposure — with a clear action plan.",
    icon: "scanSearch",
    features: ["Full audit", "Exposure scan", "Actionable report"],
    gradient: "from-cyan-500/20 to-sky-500/10",
    category: "Security & Advisory",
  },
  {
    id: "business-protection",
    title: "Business Cyber Protection",
    description:
      "End-to-end security program for businesses — team training, account hygiene and brand defense.",
    icon: "building2",
    features: ["Team training", "Account security", "Brand defense"],
    gradient: "from-indigo-500/20 to-blue-600/10",
    category: "Security & Advisory",
    featured: true,
  },
  {
    id: "email-security",
    title: "Email Security",
    description:
      "Protect your inbox from phishing, spoofing and takeover with robust email security practices.",
    icon: "shieldAlert",
    features: ["Phishing defense", "SPF / DKIM setup", "Takeover prevention"],
    gradient: "from-sky-500/20 to-blue-500/10",
    category: "Security & Advisory",
  },
  {
    id: "brand-protection",
    title: "Brand Protection",
    description:
      "Safeguard your brand across social channels, domains and marketplaces from abuse and impersonation.",
    icon: "trademark",
    features: ["Brand monitoring", "Takedown strategy", "Domain defense"],
    gradient: "from-blue-500/20 to-violet-500/10",
    category: "Content & Identity",
  },
  {
    id: "reputation",
    title: "Online Reputation Management",
    description:
      "Rebuild, protect and enhance your online reputation with strategic digital presence management.",
    icon: "star",
    features: ["Reputation audit", "Review strategy", "Search presence"],
    gradient: "from-amber-500/15 to-yellow-500/10",
    category: "Content & Identity",
  },
];

/* ------------------------------------------------------------------ */
/*  Experience                                                          */
/* ------------------------------------------------------------------ */

export const experience: ExperienceItem[] = [
  {
    id: "exp-1",
    type: "work",
    role: "Senior Cyber Security Specialist",
    company: "Independent & Agency Partnerships",
    period: "2021 — Present",
    description:
      "Leading high-stakes recovery and protection engagements for businesses and individuals worldwide, with a 99% documented success rate.",
    skills: ["Social Engineering Defense", "Account Forensics", "Incident Response"],
  },
  {
    id: "exp-2",
    type: "work",
    role: "Digital Recovery Consultant",
    company: "Meta Verified Partner Network",
    period: "2019 — 2021",
    description:
      "Specialised in Facebook, Instagram and Business Manager recovery, resolving 500+ complex account recovery cases.",
    skills: ["Meta Platforms", "Business Manager", "Ad Account Recovery"],
  },
  {
    id: "exp-3",
    type: "work",
    role: "Cyber Security Analyst",
    company: "Regional Security Operations",
    period: "2017 — 2019",
    description:
      "Monitored threat landscapes, hardened client infrastructure and delivered phishing & social engineering training.",
    skills: ["Threat Monitoring", "Network Defense", "Security Awareness"],
  },
  {
    id: "exp-4",
    type: "education",
    role: "Cyber Security & Digital Forensics",
    company: "Advanced Security Training",
    period: "2016 — 2017",
    description:
      "Intensive certification-track training in digital forensics, ethical security practices and incident handling.",
    skills: ["Digital Forensics", "Ethical Security", "Incident Handling"],
  },
];

/* ------------------------------------------------------------------ */
/*  Certificates                                                        */
/* ------------------------------------------------------------------ */

export const certificates: Certificate[] = [
  {
    id: "cert-1",
    title: "Certified Ethical Hacker",
    issuer: "EC-Council",
    date: "2023",
    credentialId: "CEH-9231-8841",
    verifyUrl: "https://www.credential.net/verify",
    icon: "shield",
  },
  {
    id: "cert-2",
    title: "CompTIA Security+",
    issuer: "CompTIA",
    date: "2022",
    credentialId: "SEC-2208-5519",
    verifyUrl: "https://verify.comptia.org",
    icon: "badgeCheck",
  },
  {
    id: "cert-3",
    title: "Meta Certified Media Buying",
    issuer: "Meta Blueprint",
    date: "2022",
    credentialId: "MB-4410-2203",
    verifyUrl: "https://www.facebook.com/business/learn/certification",
    icon: "award",
  },
  {
    id: "cert-4",
    title: "Google Cybersecurity Professional",
    issuer: "Google",
    date: "2021",
    credentialId: "GCP-7712-8890",
    verifyUrl: "https://www.credential.net",
    icon: "globe",
  },
  {
    id: "cert-5",
    title: "Digital Forensics Fundamentals",
    issuer: "SANS Institute",
    date: "2020",
    credentialId: "DFE-5520-4473",
    verifyUrl: "https://www.giac.org",
    icon: "fingerprint",
  },
  {
    id: "cert-6",
    title: "Cloud Security Professional",
    issuer: "AWS Academy",
    date: "2019",
    credentialId: "AWS-3341-7720",
    verifyUrl: "https://aws.amazon.com/verification",
    icon: "cloud",
  },
];

/* ------------------------------------------------------------------ */
/*  Achievements                                                        */
/* ------------------------------------------------------------------ */

export const achievements: Achievement[] = [
  {
    id: "ach-1",
    value: 500,
    suffix: "+",
    title: "Accounts Recovered",
    description: "Facebook, Instagram, Google, YouTube and business accounts restored.",
  },
  {
    id: "ach-2",
    value: 120,
    suffix: "+",
    title: "Businesses Protected",
    description: "SMBs and creators with hardened security and brand defense.",
  },
  {
    id: "ach-3",
    value: 6,
    suffix: "",
    title: "Industry Certifications",
    description: "EC-Council, CompTIA, Meta, Google, SANS and AWS accredited.",
  },
  {
    id: "ach-4",
    value: 8,
    suffix: "+",
    title: "Years of Expertise",
    description: "A decade-adjacent track record in digital recovery and security.",
  },
  {
    id: "ach-5",
    value: 25,
    suffix: "+",
    title: "Countries Served",
    description: "Clients across North America, Europe, Asia and the Gulf.",
  },
  {
    id: "ach-6",
    value: 99,
    suffix: "%",
    title: "Client Satisfaction",
    description: "Consistently outstanding outcomes and referrals.",
  },
];

/* ------------------------------------------------------------------ */
/*  Client logos (text-based premium marquee)                           */
/* ------------------------------------------------------------------ */

export const clientLogos = [
  "Account Recovery",
  "Business Protection",
  "Identity Security",
  "Meta Platforms",
  "Google Workspace",
  "Brand Defense",
  "Digital Forensics",
  "Incident Response",
];

/* ------------------------------------------------------------------ */
/*  Testimonials                                                        */
/* ------------------------------------------------------------------ */

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Sarah Mitchell",
    role: "Founder, E-commerce Brand",
    location: "United States",
    avatarColor: "from-sky-500 to-blue-600",
    rating: 5,
    case: "Facebook Page Recovery",
    text: "My business page was hijacked and I lost admin access. Riyad recovered everything within days — including our ad account. Absolutely professional and discreet. He saved my business.",
  },
  {
    id: "t2",
    name: "Ahmad Al-Rashid",
    role: "Operations Director",
    location: "UAE",
    avatarColor: "from-cyan-500 to-sky-600",
    rating: 5,
    case: "Business Manager Recovery",
    text: "We lost access to our Business Manager during a critical campaign. Riyad restored ownership and verified our business in record time. Outstanding expertise and communication.",
  },
  {
    id: "t3",
    name: "Emma Watson",
    role: "Content Creator",
    location: "United Kingdom",
    avatarColor: "from-fuchsia-500 to-pink-600",
    rating: 5,
    case: "Instagram Recovery",
    text: "My Instagram account was hacked with 200k followers. Riyad was calm, methodical and incredibly fast. He secured the account and walked me through future protection. Highly recommended.",
  },
  {
    id: "t4",
    name: "David Chen",
    role: "CTO, SaaS Startup",
    location: "Singapore",
    avatarColor: "from-indigo-500 to-blue-600",
    rating: 5,
    case: "Business Cyber Protection",
    text: "We hired Riyad to audit our company security. His risk assessment was the most thorough we have ever seen. Phishing attempts have dropped to zero. A true professional.",
  },
  {
    id: "t5",
    name: "Nadia Rahman",
    role: "Marketing Manager",
    location: "Bangladesh",
    avatarColor: "from-emerald-500 to-teal-600",
    rating: 5,
    case: "Google Account Recovery",
    text: "I had lost access to a Google account with years of documents. Riyad recovered it when Google's own process failed. He is the person to call for any digital crisis.",
  },
  {
    id: "t6",
    name: "Lucas Meyer",
    role: "Agency Owner",
    location: "Germany",
    avatarColor: "from-amber-500 to-orange-600",
    rating: 5,
    case: "Facebook Ads Recovery",
    text: "Our ad account was restricted right before Black Friday. Riyad resolved it in days, protecting six figures of revenue. His knowledge of Meta's systems is remarkable.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                 */
/* ------------------------------------------------------------------ */

export const faqs: FaqItem[] = [
  {
    id: "faq-1",
    question: "How long does account recovery take?",
    answer:
      "Most Facebook and Instagram recoveries are resolved within 24–72 hours. Complex cases involving Business Manager or financial verification can take 3–7 days. Every case gets a realistic timeline before we begin.",
  },
  {
    id: "faq-2",
    question: "Is my information kept private?",
    answer:
      "Absolutely. All case details, documents and communications are handled with strict confidentiality. I follow professional security protocols and never share client information.",
  },
  {
    id: "faq-3",
    question: "Can you recover an account I have no access to at all?",
    answer:
      "Yes — this is my speciality. I work with whatever identifying information you can provide, including purchase receipts, original emails, login history and device details.",
  },
  {
    id: "faq-4",
    question: "Which platforms do you support?",
    answer:
      "Facebook, Instagram, Meta Business Manager, Facebook Ads, YouTube, Google (Gmail, Ads, Workspace), Microsoft and more. If it's a major platform, I can almost certainly help.",
  },
  {
    id: "faq-5",
    question: "How much does a consultation cost?",
    answer:
      "Initial consultations start with a free diagnostic discussion. Recovery and protection engagements are quoted per case after understanding the full scope. No hidden fees, ever.",
  },
  {
    id: "faq-6",
    question: "Do you offer ongoing protection plans?",
    answer:
      "Yes. I offer monthly business protection plans covering account monitoring, brand defense, team training and rapid response if an incident ever occurs.",
  },
];

/* ------------------------------------------------------------------ */
/*  Blog                                                                */
/* ------------------------------------------------------------------ */

export const blogPosts: BlogPost[] = [
  {
    slug: "how-to-recover-a-hacked-facebook-account",
    title: "How to Recover a Hacked Facebook Account in 2026",
    excerpt:
      "A step-by-step, expert guide to regaining control of a compromised Facebook account — from immediate lockdown to permanent security hardening.",
    date: "2026-07-28",
    readTime: 8,
    category: "Account Recovery",
    cover: "facebook-recovery",
    content: [
      "Getting hacked is stressful, but the situation is rarely hopeless. This guide walks through the exact recovery flow I use with clients, refined across hundreds of real cases.",
      "First, move fast. Immediately secure the account with the 'Find your account' flow on the login screen. If you still have any session open, revoke all other logins from Security & Login settings.",
      "Next, collect evidence. Screenshots of unusual activity, recovery codes, original confirmation emails, and purchase receipts from the platform all dramatically increase recovery success rates.",
      "If automated recovery fails, the identity verification path is next. Prepare government ID matching the account's stated identity, plus any linked email addresses and trusted contacts.",
      "Once recovered, hardening is non-negotiable: enable two-factor authentication, remove unrecognized sessions, rotate the password, and review third-party app permissions.",
      "Recovery is a process of elimination — methodical evidence, the right escalation path, and persistence. With a documented approach, the vast majority of accounts are recoverable.",
    ],
  },
  {
    slug: "protecting-your-business-from-phishing",
    title: "Protecting Your Business From Phishing Attacks",
    excerpt:
      "Phishing remains the #1 entry point for business compromise. Learn the practical defenses that stop attackers before they reach your people.",
    date: "2026-07-10",
    readTime: 6,
    category: "Cyber Security",
    cover: "phishing-defense",
    content: [
      "Over 90% of successful cyber attacks begin with phishing. The good news: a layered defense makes phishing dramatically less effective against your business.",
      "Start with email authentication. Implement SPF, DKIM and DMARC on your domain so attackers cannot spoof your identity. This single step blocks a huge share of impersonation emails.",
      "Train your team to spot the signals: urgency, mismatched sender addresses, unexpected attachments, and requests that bypass normal processes. Run periodic simulated phishing tests.",
      "Technical controls matter too — web filtering, sandboxing suspicious attachments, and enforcing two-factor authentication on every account, especially finance and admin roles.",
      "Finally, prepare for the worst. Have a written incident response plan so that if someone does click, your team knows exactly how to contain, report and recover without panic.",
    ],
  },
  {
    slug: "what-to-do-when-your-instagram-is-hacked",
    title: "What To Do When Your Instagram Is Hacked",
    excerpt:
      "Immediate action plan for hacked Instagram accounts — the first hour matters more than anything else you will read today.",
    date: "2026-06-21",
    readTime: 5,
    category: "Account Recovery",
    cover: "instagram-recovery",
    content: [
      "If your Instagram account is suddenly logged out or posts you did not create appear, act in the first hour. Timing dramatically changes outcomes.",
      "Use the 'Trouble logging in?' link and request a login link to your phone or email. If the attacker changed contact info, use 'Need more help?' and enter your original email or phone.",
      "Report the account as hacked from the login screen. Instagram prioritises these reports — include a video selfie verification if requested.",
      "Check for linked email addresses being changed and recover those inboxes too. Many takeovers cascade from a compromised email.",
      "When access is restored: enable two-factor authentication with an authenticator app, remove unknown sessions, and review login activity for the country the attacker used.",
    ],
  },
  {
    slug: "securing-your-digital-identity-in-2026",
    title: "Securing Your Digital Identity in 2026",
    excerpt:
      "Your digital identity is your most valuable asset. A modern, practical framework for locking it down across every platform you use.",
    date: "2026-05-30",
    readTime: 9,
    category: "Cyber Security",
    cover: "identity-security",
    content: [
      "Your identity is no longer just your name and photo — it is every account, password, device and footprint you leave online. Treat it as an asset worth defending.",
      "Password discipline is the foundation. Use a password manager, generate unique passwords per site, and never reuse credentials across important services.",
      "Two-factor authentication is non-negotiable. Prioritise authenticator apps over SMS where possible, and store backup codes somewhere safe, offline.",
      "Audit your exposure: search your email addresses in breach databases, review what personal data is public on social profiles, and remove what you do not need to share.",
      "Understand the attack surface attackers actually use — SIM swapping, phishing, credential stuffing, and social engineering. Each has a practical countermeasure you can deploy today.",
      "Finally, build a recovery kit: printed backup codes, verified recovery emails, and contact details for the platforms you depend on. Preparedness is what separates victims from survivors.",
    ],
  },
  {
    slug: "dmca-takedowns-a-practical-guide",
    title: "DMCA Takedowns: A Practical Guide",
    excerpt:
      "Content stolen and republished? Here is how the DMCA takedown process really works and how to file it effectively.",
    date: "2026-05-08",
    readTime: 7,
    category: "Copyright",
    cover: "dmca-guide",
    content: [
      "The DMCA gives creators a powerful, fast tool to remove stolen content. Understanding the process turns a frustrating situation into a solvable one.",
      "The Digital Millennium Copyright Act lets rights holders demand removal of infringing content from platforms. Most platforms have a straightforward reporting form.",
      "Preparation matters: capture URLs of your original and the infringing copy, note the date of first publication, and be able to assert ownership clearly in the notice.",
      "Your notice must include: identification of the infringing material, contact information, a good-faith statement, and a declaration of accuracy. Templates make this fast.",
      "For serious or repeat infringement, escalate to a formal legal takedown or DMCA subpoena. For day-to-day cases, the platform form is usually enough.",
      "Keep records of every notice. If a platform rejects a valid claim, those records become the backbone of an escalation through formal channels.",
    ],
  },
  {
    slug: "two-factor-authentication-everything-you-need",
    title: "Two-Factor Authentication: Everything You Need",
    excerpt:
      "The single highest-impact security upgrade you can make — explained simply, with the mistakes most people still make.",
    date: "2026-04-15",
    readTime: 6,
    category: "Cyber Security",
    cover: "2fa-guide",
    content: [
      "Two-factor authentication blocks the overwhelming majority of account takeovers. It is the highest-impact security upgrade per minute of effort you can make.",
      "2FA works by requiring a second proof of identity beyond your password — a code, a hardware key, or a biometric. Even a stolen password is useless without the second factor.",
      "Prefer authenticator apps (Google Authenticator, Aegis, 1Password) over SMS codes, which are vulnerable to SIM-swap attacks. Hardware keys are the gold standard for critical accounts.",
      "The mistake most people make: not saving backup codes. Without backups, losing your phone can lock you out of your own accounts.",
      "Prioritise enabling 2FA on: email, password manager, bank & finance, social media, and cloud storage. These are the accounts attackers chain together.",
      "Turn it on for every major platform this week. It takes minutes, and it is the closest thing to a guarantee you will get in security.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Gallery                                                             */
/* ------------------------------------------------------------------ */

export const galleryItems: GalleryItem[] = [
  {
    id: "g1",
    title: "Security Operations Dashboard",
    category: "Monitoring",
    gradient: "from-sky-500/25 via-blue-500/15 to-indigo-500/25",
    icon: "activity",
  },
  {
    id: "g2",
    title: "Threat Intelligence Map",
    category: "Analytics",
    gradient: "from-cyan-500/25 via-teal-500/15 to-emerald-500/25",
    icon: "globe",
  },
  {
    id: "g3",
    title: "Digital Shield Architecture",
    category: "Protection",
    gradient: "from-blue-600/25 via-sky-500/15 to-cyan-500/25",
    icon: "shieldCheck",
  },
  {
    id: "g4",
    title: "Server Infrastructure",
    category: "Infrastructure",
    gradient: "from-indigo-500/25 via-violet-500/15 to-purple-500/25",
    icon: "server",
  },
  {
    id: "g5",
    title: "Network Defense Grid",
    category: "Networking",
    gradient: "from-sky-500/25 via-cyan-500/15 to-blue-500/25",
    icon: "network",
  },
  {
    id: "g6",
    title: "Encryption Lab",
    category: "Cryptography",
    gradient: "from-fuchsia-500/20 via-purple-500/15 to-indigo-500/25",
    icon: "lock",
  },
  {
    id: "g7",
    title: "Incident Response Center",
    category: "Response",
    gradient: "from-blue-500/25 via-sky-500/15 to-cyan-500/25",
    icon: "siren",
  },
  {
    id: "g8",
    title: "Vulnerability Analytics",
    category: "Scanning",
    gradient: "from-emerald-500/25 via-teal-500/15 to-cyan-500/25",
    icon: "scanLine",
  },
];

/* ------------------------------------------------------------------ */
/*  Tools / Platforms                                                   */
/* ------------------------------------------------------------------ */

export const tools: Tool[] = [
  { name: "Meta", category: "Platforms", level: 98, icon: "meta" },
  { name: "Google", category: "Platforms", level: 95, icon: "google" },
  { name: "Microsoft", category: "Platforms", level: 90, icon: "microsoft" },
  { name: "Cloudflare", category: "Security", level: 88, icon: "cloudflare" },
  { name: "GitHub", category: "Security", level: 92, icon: "github" },
  { name: "AWS", category: "Cloud", level: 85, icon: "aws" },
  { name: "Linux", category: "Systems", level: 90, icon: "linux" },
  { name: "Windows", category: "Systems", level: 93, icon: "windows" },
  { name: "Google Workspace", category: "Productivity", level: 94, icon: "workspace" },
];

/* ------------------------------------------------------------------ */
/*  Skill radar data                                                    */
/* ------------------------------------------------------------------ */

export const radarSkills = [
  { label: "Account Recovery", value: 98 },
  { label: "Digital Forensics", value: 88 },
  { label: "Threat Analysis", value: 85 },
  { label: "Identity Protection", value: 96 },
  { label: "Business Security", value: 90 },
  { label: "Social Engineering", value: 92 },
];

/* ------------------------------------------------------------------ */
/*  Contact / availability                                               */
/* ------------------------------------------------------------------ */

const availabilityEnv = process.env.NEXT_PUBLIC_AVAILABILITY_STATUS?.toLowerCase();

export const availability = {
  status: availabilityEnv === "unavailable" ? "unavailable" : "available",
  availableLabel: "Available for New Projects",
  unavailableLabel: "Currently Unavailable",
  note: "Open to website, web app and security consultation work.",
  responseTime: null as string | null,
} as const;

export const consultationTimes = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "04:00 PM",
  "06:00 PM",
  "08:00 PM",
];

export const galleryCategories = [
  "All",
  "Monitoring",
  "Protection",
  "Infrastructure",
  "Analytics",
  "Response",
  "Networking",
  "Cryptography",
  "Scanning",
];

export const serviceCategories = [
  "Account Recovery",
  "Meta & Advertising",
  "Content & Identity",
  "Security & Advisory",
] as const;
