# Riyad Sarkar — Premium Animated Portfolio

A world-class animated personal portfolio for **Riyad Sarkar**, Cyber Security Specialist & Digital Recovery Expert. Built to feel more premium than the best developer portfolios on the web — Apple-grade polish, cyber-luxury aesthetics, and a soft-blue glass design language.

> **Design language:** White · Soft Blue · Neon Blue · Glass · Minimal · Elegant · Luxury. **No hacker-green clichés.**

---

## ✨ Highlights

- **Luxury boot loader** — animated logo, progress counter, cyber pulse ring
- **Custom cursor** — glow dot + magnetic follower ring with hover expansion
- **Lenis smooth scrolling** — buttery scroll with `prefers-reduced-motion` support
- **Massive hero** — floating profile photo, typewriter roles, magnetic CTAs, animated trust badge, social rail
- **Animated mesh + aurora backgrounds** with a **live canvas particle network**
- **LIVE stats** — animated counters (500+ recoveries, 99% success, 8+ years, 24/7, 100+ clients)
- **19 premium service cards** with 3D tilt, glow hover and detail dialogs
- **3D cyber globe & shield** (React Three Fiber) rendered client-side
- **Skill radar chart** (SVG) + animated proficiency bars
- **Luxury interactive timelines** (About & Experience)
- **Certificates** with animated PDF-style preview dialogs + verify links
- **Achievements** with scroll-triggered number counters
- **Infinite client logo marquee**
- **Auto-rotating glass testimonial slider** with 5-star ratings
- **Animated FAQ accordion**
- **Blog** — listing + full article pages (SSG, SEO-optimized)
- **Luxury masonry gallery** with category filters (generated artwork, no human faces)
- **Consultation booking** — premium calendar UI, time picker, React Hook Form + Zod + EmailJS, success animation
- **Contact & footer** — every platform (WhatsApp, Messenger, Email, GitHub, LinkedIn, Facebook, Instagram, Telegram)
- **Extra premium widgets** — AI chat assistant, Cmd+K command palette, cookie consent, sound toggle, floating dock, back-to-top, live Dhaka clock, weather widget (Open-Meteo), visitor counter, GitHub contribution graph
- **Bilingual** — English & বাংলা toggle
- **Dark / light mode** with system detection

---

## 🛠 Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | Next.js 15 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS 3 · Glassmorphism · custom design tokens |
| Motion | Framer Motion · GSAP-ready · Lenis smooth scroll |
| 3D | Three.js · React Three Fiber · Drei |
| UI | Shadcn/Radix primitives · Lucide icons |
| Forms | React Hook Form · Zod · EmailJS |
| SEO | Metadata API · JSON-LD · sitemap · robots · OG/Twitter cards |
| PWA | Web app manifest + icons |

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# → fill in your EmailJS credentials and social links

# 3. Run the dev server
npm run dev

# 4. Production build & serve
npm run build
npm start
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build (zero-error) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |

---

## 📁 Project Structure

```
app/                # App Router pages, layout, SEO routes (sitemap, robots, manifest, OG)
components/
  effects/          # Loader, custom cursor, particles, mesh, mouse glow, scroll progress
  layout/           # Navbar, mobile menu, toggles, smooth scroll provider
  sections/         # Hero, About, Services, CyberSecurity, Experience, Testimonials…
  three/            # Cyber globe & 3D shield canvases
  ui/               # Shadcn-style primitives (button, card, dialog, accordion…)
  widgets/          # AI assistant, command palette, cookie consent, clock, GitHub graph…
data/content.ts     # ALL site content — edit once, everywhere updates
hooks/              # useCountUp, useTyping, useTilt, useScrollSpy, useLenis…
lib/                # utils, fonts, seo, i18n (EN/BN), toast, sound engine
public/             # profile.webp, icons, noise, CV
types/              # Shared TypeScript interfaces
```

**Personalize everything in one file:** `data/content.ts` — name, socials, services, experience, certificates, testimonials, FAQ, blog posts, gallery and more.

---

## 🖼 Image Rules

- `/public/profile.webp` is the **only** profile photo used — replace it with your real photo.
- Every other visual is a generated SVG / CSS / Three.js artwork. No stock photos, no generated faces.

---

## 🔌 Configuration

### EmailJS (contact + consultation forms)

1. Create a free account at [emailjs.com](https://www.emailjs.com)
2. Add an Email service, a template with variables `from_name`, `from_email`, `phone`, `service`, `date`, `time`, `message`, `to_name`
3. Set the variables in `.env.local` (see `.env.example`)
4. When unconfigured, the form gracefully simulates success so the site always works.

### Social links

All links live in `data/content.ts` (with `.env` overrides listed in `.env.example`).

---

## 📈 SEO

- `100/100` Lighthouse-friendly structure (semantic HTML, lazy images, no layout shift)
- `Person` JSON-LD, Open Graph, Twitter Cards, canonical URLs
- Auto-generated `sitemap.xml`, `robots.txt`, dynamic `opengraph-image`
- Article metadata for every blog post

---

## 🌍 Deployment

### Vercel (recommended)

```bash
git add .
git commit -m "feat: premium portfolio"
git push

# Import the repo at https://vercel.com/new — zero config required.
```

Add the `.env.local` variables in **Vercel → Settings → Environment Variables**.

### Any static host

```bash
npm run build
# deploy the `out` directory if configured, or run `npm start`
```

---

## ♿ Accessibility & Performance

- WCAG AA-friendly contrast, focus-visible rings, skip-to-content link
- `prefers-reduced-motion` disables animations and smooth scroll
- `next/image` AVIF/WebP, lazy loading, dynamic imports for heavy 3D
- Tree-shaken bundles, first load JS ≈ 102 kB shared

---

## 📄 License

© Riyad Sarkar. All rights reserved. Built as a personal portfolio — not a template.
