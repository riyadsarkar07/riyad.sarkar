# Riyad Sarkar — Portfolio & Client Portal

A bilingual (English / বাংলা) personal portfolio and client-service portal built with Next.js App Router, React, TypeScript, Tailwind CSS and Supabase.

> This repository includes a public marketing website **and** authenticated client/admin workflows. Configure your own Supabase project and email delivery before deploying to production.

## Features

### Public website
- Responsive portfolio sections for services, about, experience, certificates, blog, FAQ and contact
- Light/dark themes, English/Bangla toggle, motion effects and optional 3D visuals
- Consultation booking form, project enquiry form and enquiry tracking
- Generated Open Graph preview, sitemap, robots configuration and web app manifest

### Client portal
- Sign-up, login, email verification and password recovery using Supabase Auth
- User dashboard, profile, appointments, enquiries and support conversations
- Live-chat interface and notification views

### Admin portal
- Admin-only dashboard with users, appointments, enquiries, support tickets and live chat
- Notification, file and settings views
- Server-side admin access checks; Supabase database policies and migrations

> The public portfolio includes sample presentation content in `data/content.ts`. Confirm qualifications, experience, performance statistics, client quotes, certificate IDs and verification URLs before publishing them as real-world claims. The stylized certificate dialogs are not substitutes for original credentials.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 3 |
| UI and motion | Radix UI, Lucide, Framer Motion, GSAP, Lenis |
| 3D | Three.js, React Three Fiber, Drei |
| Backend and auth | Supabase SSR / Supabase JS, PostgreSQL migrations |
| Forms and validation | React Hook Form, Zod |
| Email | Resend server-side, optional EmailJS fallback |

## Local setup

Requirements: Node.js and npm, plus a configured Supabase project for sign-in and portal features.

```bash
git clone https://github.com/riyadsarkar07/riyad.sarkar.git
cd riyad.sarkar
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Fill in the required values in `.env.local` using [`.env.example`](./.env.example) as a guide:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the supported legacy anon key)
- `NEXT_PUBLIC_ADMIN_EMAIL` for the configured admin identity and notifications
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for production email delivery, or the optional EmailJS fallback settings
- Optional public contact, social profile and CV values

Never commit `.env.local` or private API credentials. The `NEXT_PUBLIC_` prefix exposes values to the browser, so do not use it for secrets.

### Database setup

SQL migrations are kept in [`supabase/migrations/`](./supabase/migrations/). Apply them in order to the **intended** Supabase project and verify required database functions, policies and roles before enabling portal workflows. Use backups and staging for schema changes; do not run production migrations blindly.

### Checks

```bash
npm run lint
npm run typecheck
npm run build
```

These checks should be run after changes and before deployment. The repository does not currently define a dedicated automated test script.

## Important routes

| Path | Purpose |
| --- | --- |
| `/` | Public portfolio |
| `/blog` | Blog index and article pages |
| `/consultation` | Consultation request |
| `/track` | Track project enquiries |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Signed-in client portal |
| `/admin` | Admin-only portal |

The private portal and authentication layouts request `noindex` and `nofollow` from search engines; these are **not security controls**. Authentication, Supabase row-level security and admin checks remain necessary.

## Project structure

```text
app/                 Next.js pages, layouts and server actions
components/          Public sections, widgets, UI and portal components
data/content.ts      Portfolio content, links and displayed credentials
hooks/               Reusable React hooks
lib/                 Supabase clients, auth, SEO, email and utilities
public/              Images, icons and CV
supabase/migrations/  PostgreSQL schema and function migrations
types/               Shared TypeScript types
```

## Deployment

Deploy the Next.js application on Vercel, configure environment variables in **Project Settings → Environment Variables**, and redeploy. Configure the same Supabase URL, auth redirect origins and allowed callback URLs for the deployed domain. Verify contact form delivery, sign-in, password recovery, booking, tracking, admin access, chat and file flows on a staging deployment before going live.

The canonical domain is currently configured in [`lib/seo.ts`](./lib/seo.ts). Update it if your deployment domain differs. A generated OG image is provided by `app/opengraph-image.tsx`.

## License

© Riyad Sarkar. All rights reserved.
