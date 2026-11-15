import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
import { LiveStatus } from "@/components/sections/live-status";
import { About } from "@/components/sections/about";
import { Services } from "@/components/sections/services";
import { ServiceJourney } from "@/components/sections/service-journey";
import { CyberSecurity } from "@/components/sections/cyber-security";
import { Tools } from "@/components/sections/tools";
import { Experience } from "@/components/sections/experience";
import { Certificates } from "@/components/sections/certificates";
import { Achievements } from "@/components/sections/achievements";
import { ClientLogos } from "@/components/sections/client-logos";
import { Testimonials } from "@/components/sections/testimonials";
import { Faq } from "@/components/sections/faq";
import { Blog } from "@/components/sections/blog";
import { Gallery } from "@/components/sections/gallery";
import { Contact } from "@/components/sections/contact";
import { HashScroll } from "@/components/effects/hash-scroll";

export default function HomePage() {
  return (
    <div className="portfolio-editorial">
      <HashScroll />
      {/* Decision layer: proposition -> evidence -> services -> next step. */}
      <Hero />
      <Stats />
      <Services />
      <ServiceJourney />
      <Testimonials />
      <ClientLogos />

      {/* Deeper proof: retain existing deep links and searchable content. */}
      <About />
      <Experience />
      <CyberSecurity />
      <Achievements />
      <Certificates />
      <Tools />
      <Blog />
      <Gallery />

      {/* Conversion and self-service. */}
      <Faq />
      <LiveStatus />
      <Contact />
    </div>
  );
}
