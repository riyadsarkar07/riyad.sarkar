import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
import { LiveStatus } from "@/components/sections/live-status";
import { About } from "@/components/sections/about";
import { Services } from "@/components/sections/services";
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
import { Consultation } from "@/components/sections/consultation";
import { Contact } from "@/components/sections/contact";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <About />
      <Services />
      <CyberSecurity />
      <Tools />
      <Experience />
      <Certificates />
      <Achievements />
      <ClientLogos />
      <Testimonials />
      <Faq />
      <Blog />
      <Gallery />
      <LiveStatus />
      <Consultation />
      <Contact />
    </>
  );
}
