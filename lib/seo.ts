import type { Metadata } from "next";

/** Global site configuration — edit these once, reused everywhere. */
export const siteConfig = {
  name: "Riyad Sarkar",
  title: "Riyad Sarkar — Cyber Security Specialist & Digital Recovery Expert",
  description:
    "Premium cyber security specialist and digital recovery expert from Bangladesh. Facebook, Instagram, Google & business account recovery, identity protection and business cyber security.",
  url: "https://riyadsarkar.com",
  locale: "en_US",
  keywords: [
    "cyber security specialist",
    "digital recovery expert",
    "facebook account recovery",
    "instagram recovery",
    "google account recovery",
    "business manager recovery",
    "identity protection",
    "cyber security Bangladesh",
    "account recovery expert",
    "digital protection",
    "Riyad Sarkar",
  ],
  author: "Riyad Sarkar",
  location: "Bangladesh",
  socials: {
    github: "https://github.com/riyadsarkar",
    linkedin: "https://www.linkedin.com/in/riyadsarkar",
    facebook: "https://www.facebook.com/riyadsarkar",
    instagram: "https://www.instagram.com/riyadsarkar",
    telegram: "https://t.me/riyadsarkar",
    whatsapp: "https://wa.me/8801700000000",
    email: "hello@riyadsarkar.com",
  },
  ogImage: "/opengraph-image.png",
};

/** Build a consistent Metadata object for every page. */
export function buildMetadata({
  title,
  description,
  path = "/",
  type = "website",
  publishedTime,
  images,
}: {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  publishedTime?: string;
  images?: string[];
} = {}): Metadata {
  const metaTitle = title ? `${title} | Riyad Sarkar` : siteConfig.title;
  const metaDescription = description ?? siteConfig.description;
  const canonical = `${siteConfig.url}${path === "/" ? "" : path}`;
  const metaImages = images?.length ? images : [siteConfig.ogImage];

  return {
    metadataBase: new URL(siteConfig.url),
    title: metaTitle,
    description: metaDescription,
    keywords: siteConfig.keywords,
    authors: [{ name: siteConfig.author, url: siteConfig.url }],
    creator: siteConfig.author,
    publisher: siteConfig.author,
    alternates: { canonical },
    openGraph: {
      type,
      title: metaTitle,
      description: metaDescription,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: publishedTime ?? undefined,
      images: metaImages.map((image) => ({
        url: image.startsWith("http") ? image : `${siteConfig.url}${image}`,
        width: 1200,
        height: 630,
        alt: metaTitle,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: metaImages,
      creator: "@riyadsarkar",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    category: "Technology",
  };
}

/** Build the site-level Person JSON-LD for rich results. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    url: siteConfig.url,
    image: `${siteConfig.url}/profile.png`,
    jobTitle: "Cyber Security Specialist & Digital Recovery Expert",
    description: siteConfig.description,
    knowsAbout: [
      "Cyber Security",
      "Account Recovery",
      "Digital Forensics",
      "Identity Protection",
      "Business Security",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
      addressRegion: "Dhaka",
    },
    sameAs: [
      siteConfig.socials.github,
      siteConfig.socials.linkedin,
      siteConfig.socials.facebook,
      siteConfig.socials.instagram,
      siteConfig.socials.telegram,
    ],
  };
}
