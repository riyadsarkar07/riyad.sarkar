import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        md: "1.5rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0284c7",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#0f172a",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#38bdf8",
          foreground: "#082f49",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        cyber: {
          50: "#eff8ff",
          100: "#dbeffe",
          200: "#bfe3fe",
          300: "#93d2fd",
          400: "#60b8fb",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-satoshi)", ...fontFamily.sans],
        display: ["var(--font-space-grotesk)", "var(--font-satoshi)", ...fontFamily.sans],
        satoshi: ["var(--font-satoshi)", ...fontFamily.sans],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glass: "0 12px 32px rgba(15, 23, 42, 0.06)",
        "glass-lg": "0 22px 48px rgba(15, 23, 42, 0.1)",
        glow: "0 10px 24px rgba(2, 132, 199, 0.16)",
        "glow-lg": "0 16px 36px rgba(2, 132, 199, 0.18)",
        "inner-glow": "inset 0 0 24px rgba(14, 165, 233, 0.05)",
        saas: "0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.04)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(40px, -60px) scale(1.15)" },
          "66%": { transform: "translate(-30px, 30px) scale(0.9)" },
        },
        "aurora-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1) rotate(0deg)" },
          "50%": { transform: "translate(-50px, 40px) scale(1.2) rotate(180deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-28px) rotate(8deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "48px 48px" },
        },
        "scan-line": {
          "0%": { top: "-10%" },
          "100%": { top: "110%" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "8%": { opacity: "1" },
          "92%": { opacity: "1" },
          "100%": { transform: "translateY(100vh)", opacity: "0" },
        },
        ticker: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        ripple: {
          "0%": { transform: "scale(0.35)", opacity: "0.6" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        "spin-reverse": {
          to: { transform: "rotate(-360deg)" },
        },
        breath: {
          "0%, 100%": { opacity: "0.45", transform: "scale(0.94)" },
          "50%": { opacity: "1", transform: "scale(1.06)" },
        },
        "pulse-soft": {
          "0%": { transform: "scale(0.85)", opacity: "0.7" },
          "100%": { transform: "scale(1.75)", opacity: "0" },
        },
        "light-streak": {
          "0%": { transform: "translateX(-140%) skewX(-18deg)", opacity: "0" },
          "15%": { opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { transform: "translateX(560%) skewX(-18deg)", opacity: "0" },
        },
        "float-card": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "cube-spin": {
          "0%": { transform: "rotateX(-22deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(-22deg) rotateY(360deg)" },
        },
        "orbit-dot": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "grid-drift": {
          "0%": { transform: "translateY(0px)" },
          "100%": { transform: "translateY(48px)" },
        },
        "shield-pulse": {
          "0%": { transform: "scale(0.85)", opacity: "0.55" },
          "70%": { opacity: "0.15" },
          "100%": { transform: "scale(1.55)", opacity: "0" },
        },
        "scan-portrait": {
          "0%": { transform: "translateY(-120%)" },
          "100%": { transform: "translateY(320%)" },
        },
        "grid-pulse": {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.7" },
        },
        "hero-orb": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(18px, -22px, 0) scale(1.08)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        aurora: "aurora 12s ease-in-out infinite",
        "aurora-slow": "aurora-slow 20s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "marquee-fast": "marquee 24s linear infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        "grid-pan": "grid-pan 2s linear infinite",
        blink: "blink 1.1s steps(2, start) infinite",
        ripple: "ripple 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "spin-reverse": "spin-reverse 16s linear infinite",
        breath: "breath 5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "light-streak": "light-streak 9s ease-in-out infinite",
        "float-card": "float-card 7s ease-in-out infinite",
        "cube-spin": "cube-spin 14s linear infinite",
        "orbit-dot": "orbit-dot 12s linear infinite",
        "grid-drift": "grid-drift 4s linear infinite",
        "shield-pulse": "shield-pulse 3.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-sweep": "scan-sweep 9s ease-in-out infinite",
        "scan-portrait": "scan-portrait 4.8s ease-in-out infinite",
        "grid-pulse": "grid-pulse 3.6s ease-in-out infinite",
        "hero-orb": "hero-orb 11s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
      justifyContent: {
        inherit: "inherit",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "mesh-blue":
          "radial-gradient(at 18% 12%, rgba(14, 165, 233, 0.1) 0, transparent 48%), radial-gradient(at 82% 0%, rgba(37, 99, 235, 0.07) 0, transparent 46%), radial-gradient(at 50% 100%, rgba(14, 165, 233, 0.06) 0, transparent 50%)",
        "noise": "url('/noise.svg')",
      },
    },
  },
  plugins: [],
};

export default config;
