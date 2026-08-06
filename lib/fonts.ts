import { Inter, Space_Grotesk } from "next/font/google";

/** Primary UI font — Inter. */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Display / headings font — Space Grotesk. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/**
 * Satoshi is a premium commercial font (Fontshare).
 * It is referenced via the --font-satoshi variable so it can be
 * self-hosted later simply by dropping the files into `public/fonts`
 * and adding an @font-face rule in `app/globals.css`.
 */
