import type { Metadata, Viewport } from "next";
import { inter, spaceGrotesk } from "@/lib/fonts";
import { buildMetadata, personJsonLd } from "@/lib/seo";
import { Providers } from "@/components/providers";
import { SmoothScrollProvider } from "@/components/layout/smooth-scroll";
import { PortfolioChrome } from "@/components/layout/portfolio-chrome";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/sections/footer";
import { Loader } from "@/components/effects/loader";
import { TiltController } from "@/components/effects/tilt-controller";
import { NoiseOverlay } from "@/components/effects/noise-overlay";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { SoundProvider } from "@/lib/sound";
import { AIAssistant } from "@/components/widgets/ai-assistant";
import { CommandPalette } from "@/components/widgets/command-palette";
import { CookieConsent, SoundToggle } from "@/components/widgets/sound-toggle";
import { FloatingDock } from "@/components/widgets/floating-dock";
import "./globals.css";

export const metadata: Metadata = buildMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b12" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = [personJsonLd()];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <Providers>
          <SoundProvider>
            <SmoothScrollProvider />
            <Loader />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
            >
              Skip to content
            </a>
            <TiltController />
            <NoiseOverlay />
            <ScrollProgress />
            <main id="main-content">{children}</main>
            <PortfolioChrome>
              <Navbar />
              <Footer />
              <AIAssistant />
              <CommandPalette />
              <CookieConsent />
              <SoundToggle />
              <FloatingDock />
            </PortfolioChrome>
          </SoundProvider>
        </Providers>
      </body>
    </html>
  );
}
